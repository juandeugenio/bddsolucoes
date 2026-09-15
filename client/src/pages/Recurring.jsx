import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import { money } from '../components/Money.jsx';
import Modal from '../components/Modal.jsx';
import PremiumGate from '../components/PremiumGate.jsx';

const FREQ_LABELS = { 0: 'Diário', 1: 'Semanal', 2: 'Mensal', 3: 'Anual' };

export default function Recurring() {
  const [data, setData] = useState({ rules: [], wallets: [], categories: [], plan: 0, maxRecurring: 3 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/recurring');
      setData(result);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const formatNextDue = (dateStr) => {
    const d = new Date(dateStr);
    const raw = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
    return raw;
  };

  return (
    <div>
      <PremiumGate>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <a href="/settings" className="btn btn-outline-secondary" style={{ width: 36, height: 36, borderRadius: 12, padding: 0 }}>
          <PhosphorIcon name="caret-left" size={18} />
        </a>
        <h4 className="mb-0 text-white fw-bold" style={{ fontSize: "1.2rem", letterSpacing: "-0.2px" }}>Transações recorrentes</h4>
        <button className="btn btn-primary" style={{ width: 36, height: 36, borderRadius: 12, padding: 0 }} onClick={() => { setEditRule(null); setShowForm(true); }}>
          <PhosphorIcon name="plus" size={18} />
        </button>
      </div>

      <div className="small mb-3" style={{ color: '#8C85AA' }}>
        Receitas e despesas que se repetem automaticamente. Clique em uma transação para ver detalhes, editar ou excluir.
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : data.rules.length > 0 ? (
        <div className="settings-card-group">
          {data.rules.map((r, i) => {
            const isIncome = r.Kind === 0;
            return (
              <div key={r.Id}>
                {i > 0 && <div className="settings-divider" />}
                <button className="settings-item p-3" onClick={() => { setEditRule(r); setShowForm(true); }}>
                  <div className="category-squircle-wrapper" style={{ backgroundColor: '#26213B' }}>
                    <PhosphorIcon name="arrows-clockwise" size={20} style={{ color: isIncome ? '#3ECF8E' : '#FF9F94' }} />
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="fw-bold text-white text-truncate">{r.Note || 'Recorrência'}</div>
                    <div className="small" style={{ color: '#8C85AA' }}>
                      Próximo: {formatNextDue(r.NextDueDate)}
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <div className="fw-bold" style={{ color: isIncome ? '#3ECF8E' : '#FF9F94' }}>
                      {isIncome ? '+' : '-'}{money(r.Amount)}
                    </div>
                    <div className="d-flex align-items-center gap-1 small" style={{ color: '#8C85AA' }}>
                      <PhosphorIcon name="arrows-clockwise" size={12} /> {FREQ_LABELS[r.Frequency] || 'Mensal'}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-5" style={{ color: '#8C85AA' }}>
          Nenhuma transação recorrente cadastrada.
        </div>
      )}

      {showForm && (
        <Modal open title={editRule ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'} onClose={() => setShowForm(false)}>
          <RecurringForm rule={editRule} wallets={data.wallets} categories={data.categories} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
        </Modal>
      )}
      </PremiumGate>
    </div>
  );
}

function RecurringForm({ rule, wallets, categories, onClose, onSaved }) {
  const isEdit = Boolean(rule);
  const [note, setNote] = useState(rule?.Note || '');
  const [amount, setAmount] = useState(rule ? String(rule.Amount) : '');
  const [kind, setKind] = useState(rule?.Kind ?? 1);
  const [frequency, setFrequency] = useState(rule?.Frequency ?? 2);
  const [nextDueDate, setNextDueDate] = useState(rule?.NextDueDate || new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState(rule?.CategoryId || '');
  const [walletId, setWalletId] = useState(rule?.WalletId || '');
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(String(amount).replace(',', '.'));
    if (!amt || amt <= 0) { setError('Valor inválido.'); return; }
    try {
      const body = { note, amount: amt, kind, frequency, nextDueDate, categoryId: categoryId || null, walletId: walletId || null };
      if (isEdit) {
        await api.put(`/recurring/${rule.Id}`, body);
      } else {
        await api.post('/recurring', body);
      }
      showToast(isEdit ? 'Recorrência atualizada' : 'Recorrência criada');
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Descrição / Nota</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      </div>
      <div className="row g-2 mb-3">
        <div className="col-6">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Valor (R$)</label>
          <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="col-6">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Tipo</label>
          <select className="select" value={kind} onChange={(e) => setKind(parseInt(e.target.value, 10))}>
            <option value={1}>Despesa</option>
            <option value={0}>Receita</option>
          </select>
        </div>
      </div>
      <div className="row g-2 mb-3">
        <div className="col-6">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Frequência</label>
          <select className="select" value={frequency} onChange={(e) => setFrequency(parseInt(e.target.value, 10))}>
            <option value={2}>Mensal</option>
            <option value={1}>Semanal</option>
            <option value={0}>Diário</option>
            <option value={3}>Anual</option>
          </select>
        </div>
        <div className="col-6">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Próximo Vencimento</label>
          <input className="input" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
        </div>
      </div>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Categoria</label>
        <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sem categoria</option>
          {categories.filter((c) => c.Type === kind).map((c) => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
        </select>
      </div>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Método de Pagamento</label>
        <select className="select" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
          <option value="">Selecione...</option>
          {wallets.map((w) => <option key={w.Id} value={w.Id}>{w.Name}</option>)}
        </select>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex align-items-center justify-content-between gap-2">
        {isEdit && (
          <button
            type="button"
            className="btn"
            style={{ backgroundColor: 'rgba(255,71,87,0.15)', color: '#FF4757' }}
            onClick={async () => {
              if (!confirm('Excluir esta recorrência?')) return;
              await api.del(`/recurring/${rule.Id}`);
              showToast('Recorrência excluída');
              onSaved();
            }}
          >
            <PhosphorIcon name="trash" size={14} /> Excluir
          </button>
        )}
        <div className="d-flex gap-2 ms-auto">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary">Salvar</button>
        </div>
      </div>
    </form>
  );
}