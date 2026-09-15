import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import PremiumGate from '../components/PremiumGate.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { getAvailableBanks } from '../utils/bankLogo.js';

const FLAG = { visa: 'VISA', mastercard: 'MASTERCARD', elo: 'ELO', amex: 'AMEX', hipercard: 'HIPERCARD', black: 'BLACK' };

export default function SettingsCards() {
  const [data, setData] = useState({ cards: [], plan: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/cards');
      setData(result);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!confirm('Arquivar este cartão?')) return;
    try {
      await api.del(`/cards/${id}`);
      showToast('Cartão arquivado');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const brandFlag = (name) => {
    const n = String(name || '').toLowerCase();
    for (const [k, v] of Object.entries(FLAG)) {
      if (n.includes(k)) return v;
    }
    return 'BANK';
  };

  return (
    <div>
      <PremiumGate>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <a href="/settings" className="btn btn-outline-secondary" style={{ width: 36, height: 36, borderRadius: 12, padding: 0 }}>
              <PhosphorIcon name="caret-left" size={18} />
            </a>
            <h4 className="mb-0 text-white fw-bold" style={{ fontSize: "1.2rem", letterSpacing: "-0.2px" }}>Carteira de Cartões</h4>
            <button className="btn btn-primary" style={{ width: 36, height: 36, borderRadius: 12, padding: 0 }} onClick={() => { setEditCard(null); setShowForm(true); }}>
              <PhosphorIcon name="plus" size={18} />
            </button>
          </div>
          <div className="small mb-4" style={{ color: '#8C85AA' }}>
            Sua carteira de cartões digital com logotipos oficiais dos bancos. Clique em qualquer cartão do fundo para trazê-lo para o primeiro plano.
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border" /></div>
          ) : data.cards.length > 0 ? (
            <div className="p-4 rounded-5" style={{ background: 'linear-gradient(180deg, #18122B 0%, #0F0B1E 100%)', minHeight: 520 }}>
              <div className="d-flex flex-column align-items-center">
                {data.cards.map((c, i) => (
                  <div
                    key={c.Id}
                    className="w-100"
                    style={{
                      marginTop: i === 0 ? 0 : -105,
                      zIndex: data.cards.length - i,
                      position: 'relative',
                      transform: i === 0 ? 'scale(1.01) translateY(6px)' : undefined,
                      background: '#1D1735',
                      borderRadius: 22,
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '18px 20px',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, borderRadius: '22px 0 0 22px', backgroundColor: c.Color }} />
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center justify-content-center" style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <PhosphorIcon name={c.Icon || 'credit-card'} size={20} style={{ color: c.Color }} />
                        </div>
                        <div>
                          <div className="card-bank-title fw-bold text-white">{c.Name}</div>
                          <div className="small" style={{ color: '#8C85AA', fontSize: '0.65rem' }}>CARTÃO DE CRÉDITO</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {i === 0 && <span className="badge rounded-pill" style={{ backgroundColor: '#2D234D', color: c.Color, fontSize: '0.62rem' }}>EM DESTAQUE</span>}
                        <button className="btn btn-outline-secondary btn-icon" onClick={() => { setEditCard(c); setShowForm(true); }}>
                          <PhosphorIcon name="pencil-simple" size={13} />
                        </button>
                        <button className="btn btn-outline-secondary btn-icon" style={{ color: '#FF5C4D' }} onClick={() => remove(c.Id)}>
                          <PhosphorIcon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div style={{ width: 40, height: 28, borderRadius: 4, background: 'linear-gradient(135deg, #E5B842 0%, #B38612 100%)' }} />
                      <div className="fw-bold" style={{ color: '#8C85AA', letterSpacing: '2px', fontSize: '0.85rem' }}>•••• •••• ••••</div>
                      <div className="fw-bold" style={{ color: '#fff', fontSize: '0.8rem', letterSpacing: '1px' }}>{brandFlag(c.Name)}</div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="small" style={{ color: '#8C85AA', fontSize: '0.62rem' }}>FECHAMENTO / VENCIMENTO</div>
                        <div className="d-flex gap-2 mt-1">
                          <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.62rem' }}>🔒 Fecha dia {String(c.ClosingDay).padStart(2, '0')}</span>
                          <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(62,207,142,0.15)', color: '#3ECF8E', fontSize: '0.62rem' }}>📅 Vence dia {String(c.DueDay).padStart(2, '0')}</span>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="small" style={{ color: '#8C85AA', fontSize: '0.62rem' }}>LIMITE TOTAL</div>
                        <div className="fw-bold text-white">{c.Limit ? `R$ ${Number(c.Limit).toFixed(2)}` : 'Não definido'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3" style={{ color: '#8C85AA' }}>Nenhum cartão de crédito cadastrado.</div>
              <button className="btn btn-primary" onClick={() => { setEditCard(null); setShowForm(true); }}>
                <PhosphorIcon name="plus" size={16} /> Cadastrar Primeiro Cartão
              </button>
            </div>
          )}

          {showForm && (
            <CardForm card={editCard} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
          )}
        </div>
      </PremiumGate>
    </div>
  );
}

function CardForm({ card, onClose, onSaved }) {
  const isEdit = Boolean(card);
  const banks = getAvailableBanks();
  const [name, setName] = useState(card?.Name || '');
  const [closingDay, setClosingDay] = useState(card?.ClosingDay || 1);
  const [dueDay, setDueDay] = useState(card?.DueDay || 5);
  const [limit, setLimit] = useState(card?.Limit || '');
  const [color, setColor] = useState(card?.Color || '#9675FF');
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Informe o nome.'); return; }
    try {
      const body = {
        name, icon: 'credit-card', closingDay: parseInt(closingDay, 10), dueDay: parseInt(dueDay, 10),
        limit: limit !== '' ? Number(limit) : null, color,
      };
      if (isEdit) await api.put(`/cards/${card.Id}`, body);
      else await api.post('/cards', body);
      showToast(isEdit ? 'Cartão atualizado' : 'Cartão criado');
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal open title={isEdit ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group mb-3">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Nome do cartão</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nubank, Santander, Itaú, Inter..." autoFocus />
        </div>
        <div className="form-group mb-3">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Ícone / Logo Real do Banco</label>
          <select className="select" onChange={(e) => { if (e.target.value) setName(e.target.value); }}>
            <option value="">(Detectar auto pelo nome)</option>
            {banks.map((b) => <option key={b} value={b}>{b}</option>)}
            <option value="Visa">Visa</option>
            <option value="Mastercard">Mastercard</option>
          </select>
        </div>
        <div className="row g-2 mb-3">
          <div className="col-6">
            <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Fechamento</label>
            <input className="input" type="number" min="1" max="28" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
          </div>
          <div className="col-6">
            <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Vencimento</label>
            <input className="input" type="number" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </div>
        </div>
        <div className="form-group mb-3">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Limite Total (R$)</label>
          <input className="input" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Ex: 5000" />
        </div>
        <div className="form-group mb-3">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Cor de Destaque do Cartão</label>
          <div className="d-flex align-items-center gap-2">
            <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 48 }} />
            <input className="input" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-success">Salvar Cartão</button>
        </div>
      </form>
    </Modal>
  );
}