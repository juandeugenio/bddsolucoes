import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import { money } from '../components/Money.jsx';
import { formatDate, parseAmount } from '../format.js';

export default function SplitDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get(`/split/${id}`);
      setDetail(result);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { load(); }, [load]);

  const settle = async () => {
    if (!confirm('Quitar as dívidas do grupo agora?')) return;
    try {
      const result = await api.post(`/split/${id}/settle`);
      showToast(`Contas acertadas (${result.settlements.length} transferências)`);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading && !detail) {
    return <div className="text-center py-5"><div className="spinner-border" /></div>;
  }

  return (
    <div>
      <Link to="/split" className="small" style={{ color: '#9675FF' }}>← Divisões</Link>
      <h2 className="fw-bold text-white mb-0 mt-2" style={{ fontSize: '1.4rem' }}>{detail?.group?.Name}</h2>
      <div className="text-muted mb-4">Moeda: {detail?.group?.Currency || 'R$'}</div>

      <div className="row g-3 mb-4">
        {/* Participantes */}
        <div className="col-lg-5">
          <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0 fw-bold text-white">Participantes</h6>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowMemberForm(!showMemberForm)}>
                <PhosphorIcon name="plus" size={12} /> Membro
              </button>
            </div>
            {showMemberForm && <MemberForm groupId={id} onSaved={() => { setShowMemberForm(false); load(); }} />}
            <div className="d-flex flex-column">
              {detail?.balances?.map((b) => (
                <div key={b.memberId} className="d-flex justify-content-between align-items-center py-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div>
                    <strong className="text-white">{b.name}</strong>
                    <div className="small" style={{ color: '#8C85AA' }}>pagou {money(b.paid)} · deve {money(b.share)}</div>
                  </div>
                  <div className={`fw-bold ${b.net >= 0 ? 'text-success' : 'text-danger'}`}>
                    {b.net >= 0 ? '+' : '-'}{money(Math.abs(b.net))}
                  </div>
                </div>
              ))}
            </div>
            {detail?.settlements?.length > 0 && (
              <>
                <h6 className="fw-bold text-white mt-3 mb-2">Quem deve a quem</h6>
                {detail.settlements.map((s, i) => (
                  <div key={i} className="d-flex justify-content-between align-items-center py-1">
                    <span className="text-white">{s.fromName} → {s.toName}</span>
                    <span className="fw-semibold">{money(s.amount)}</span>
                  </div>
                ))}
                <button className="btn btn-success rounded-pill w-100 mt-2" onClick={settle}>
                  <PhosphorIcon name="check" size={14} /> Acertar contas
                </button>
              </>
            )}
          </div>
        </div>

        {/* Despesas */}
        <div className="col-lg-7">
          <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0 fw-bold text-white">Despesas</h6>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowEntryForm(!showEntryForm)}>
                <PhosphorIcon name="plus" size={12} /> Despesa
              </button>
            </div>
            {showEntryForm && <EntryForm groupId={id} members={detail?.members || []} onSaved={() => { setShowEntryForm(false); load(); }} />}
            {detail?.entries?.length > 0 ? (
              detail.entries.map((e) => (
                <div key={e.Id} className="py-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold text-white">{e.Title}</div>
                      <div className="small" style={{ color: '#8C85AA' }}>{formatDate(e.Date)} · pago por {e.PayerName}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold text-white">{money(e.Amount)}</span>
                      <button className="btn btn-outline-secondary btn-sm" style={{ color: '#FF5C4D' }} onClick={async () => {
                        try {
                          await api.del(`/split/${id}/entries/${e.Id}`);
                          showToast('Despesa excluída');
                          load();
                        } catch (err) { showToast(err.message, 'error'); }
                      }}>
                        <PhosphorIcon name="trash" size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4" style={{ color: '#8C85AA' }}>Nenhuma despesa registrada.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberForm({ groupId, onSaved }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/split/${groupId}/members`, { name, email });
      showToast('Membro adicionado');
      onSaved();
    } catch (err) { setError(err.message); }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-3">
      <div className="d-flex gap-2 mb-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
      </div>
      <div className="d-flex gap-2 mb-2">
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail (opcional)" />
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <button className="btn btn-primary btn-sm">Add</button>
    </form>
  );
}

function EntryForm({ groupId, members, onSaved }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payerMemberId, setPayerMemberId] = useState(members[0]?.Id || '');
  const [shares, setShares] = useState({});
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseAmount(amount);
    if (!amt || amt <= 0) { setError('Valor inválido.'); return; }
    if (!payerMemberId) { setError('Selecione quem pagou.'); return; }

    let sharesData = members.map((m) => ({ memberId: m.Id, amount: Math.round((amt / members.length) * 100) / 100 }));
    if (Object.keys(shares).length > 0) {
      sharesData = members.map((m) => ({ memberId: m.Id, amount: Number(shares[m.Id]) || 0 }));
      const total = sharesData.reduce((s, x) => s + x.amount, 0);
      if (Math.abs(total - amt) > 0.011) {
        setError(`As cotas somam ${total.toFixed(2)} mas o total é ${amt.toFixed(2)}.`);
        return;
      }
    }

    try {
      await api.post(`/split/${groupId}/entries`, {
        title, amount: amt, date: new Date(date).toISOString(), payerMemberId, shares: sharesData,
      });
      showToast('Despesa registrada');
      onSaved();
    } catch (err) { setError(err.message); }
  };

  const divideEvenly = () => {
    const amt = parseAmount(amount);
    if (!amt || members.length === 0) return;
    const each = Math.round((amt / members.length) * 100) / 100;
    const s = {};
    members.forEach((m, i) => { s[m.Id] = i === 0 ? Math.round((amt - each * (members.length - 1)) * 100) / 100 : each; });
    setShares(s);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3 p-3" style={{ backgroundColor: '#1A142D', borderRadius: 16 }}>
      <div className="form-group mb-2">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Título</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="row g-2 mb-2">
        <div className="col-6">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Valor</label>
          <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="col-6">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Data</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="form-group mb-2">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Quem pagou</label>
        <select className="select" value={payerMemberId} onChange={(e) => setPayerMemberId(e.target.value)}>
          {members.map((m) => <option key={m.Id} value={m.Id}>{m.Name}</option>)}
        </select>
      </div>
      <div className="mb-2">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <label className="small fw-semibold" style={{ color: '#8C85AA' }}>Dividir entre</label>
          <button type="button" className="small" style={{ color: '#9675FF', background: 'none', border: 'none', cursor: 'pointer' }} onClick={divideEvenly}>Dividir igualmente</button>
        </div>
        {members.map((m) => (
          <div key={m.Id} className="d-flex align-items-center gap-2 mb-1">
            <input
              type="checkbox"
              className="flex-shrink-0"
              checked
              readOnly
              style={{ accentColor: '#9675FF' }}
            />
            <span style={{ minWidth: 120 }} className="text-white small">{m.Name}</span>
            <input
              className="input"
              style={{ maxWidth: 100 }}
              inputMode="decimal"
              value={shares[m.Id] || ''}
              onChange={(e) => setShares({ ...shares, [m.Id]: e.target.value })}
            />
          </div>
        ))}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <button className="btn btn-primary w-100">Salvar despesa</button>
    </form>
  );
}