import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import { money } from '../components/Money.jsx';
import Modal from '../components/Modal.jsx';
import { getBankLogoUrl } from '../utils/bankLogo.js';

const KIND_LABELS = {
  0: 'Cartão',
  1: 'Dinheiro',
  2: 'Conta bancária',
  3: 'Outro',
  4: 'Pix',
};

export default function Wallets() {
  const [data, setData] = useState({ wallets: [], plan: 0, maxWallets: 3 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editWallet, setEditWallet] = useState(null);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/wallets');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const groups = [
    { kind: 0, label: 'Cartão', items: [] },
    { kind: 1, label: 'Dinheiro', items: [] },
    { kind: 2, label: 'Conta bancária', items: [] },
    { kind: 3, label: 'Outro', items: [] },
    { kind: 4, label: 'Pix', items: [] },
  ];
  for (const w of data.wallets) {
    const g = groups.find((x) => x.kind === w.Kind);
    if (g) g.items.push(w);
  }
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  const remove = async (id) => {
    if (!confirm('Arquivar esta conta?')) return;
    try {
      await api.del(`/wallets/${id}`);
      showToast('Conta arquivada');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isFree = data.plan === 0;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold text-white mb-0" style={{ fontSize: '1.4rem' }}>Contas</h2>
          <div className="small" style={{ color: '#8C85AA' }}>Métodos de pagamento</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditWallet(null); setShowForm(true); }}>
          <PhosphorIcon name="plus" size={16} /> Nova conta
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {isFree && data.wallets.length >= data.maxWallets && (
        <div className="alert alert-warning">
          Você atingiu o limite de <strong>{data.maxWallets} contas</strong> do plano grátis.{' '}
          <a href="/settings" style={{ color: '#E5B842', textDecoration: 'underline' }}>Assine o Pro</a>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : visibleGroups.length > 0 ? (
        visibleGroups.map((g) => (
          <div key={g.kind} style={{ marginBottom: 24 }}>
            <div className="text-uppercase small mb-2" style={{ color: '#8C85AA', fontWeight: 600 }}>
              {g.label} <span className="badge bg-light text-muted ms-1">{g.items.length}</span>
            </div>
            <div className="row g-2">
              {g.items.map((w) => {
                const logoUrl = getBankLogoUrl(w.Name, w.Icon);
                return (
                  <div key={w.Id} className="col-md-4" style={{ flex: '0 0 100%', maxWidth: '100%' }}>
                    <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          {logoUrl ? (
                            <div className="d-flex align-items-center justify-content-center p-1 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', width: 44, height: 44 }}>
                              <img src={logoUrl} alt={w.Name} style={{ width: 34, height: 34, objectFit: 'contain' }} />
                            </div>
                          ) : (
                            <div className="d-flex align-items-center gap-2">
                              <div style={{ width: 10, height: 34, borderRadius: 4, backgroundColor: w.Color }} />
                              {w.Icon && <span className="fs-5">{w.Icon}</span>}
                            </div>
                          )}
                          <div>
                            <div className="fw-semibold text-white">{w.Name}</div>
                            <div className="small" style={{ color: '#8C85AA' }}>{KIND_LABELS[w.Kind] || 'Outro'}</div>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-semibold text-white">{money(w.balance)}</div>
                          <button className="btn btn-outline-secondary btn-sm mt-1" onClick={() => { setEditWallet(w); setShowForm(true); }}>Editar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p className="text-muted">Nenhuma conta criada.</p>
      )}

      {showForm && (
        <Modal open title={editWallet ? 'Editar conta' : 'Nova conta'} onClose={() => setShowForm(false)}>
          <WalletForm wallet={editWallet} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
        </Modal>
      )}
    </div>
  );
}

function WalletForm({ wallet, onClose, onSaved }) {
  const isEdit = Boolean(wallet);
  const [name, setName] = useState(wallet?.Name || '');
  const [kind, setKind] = useState(wallet?.Kind ?? 2);
  const [icon, setIcon] = useState(wallet?.Icon || '💼');
  const [color, setColor] = useState(wallet?.Color || '#5B8DEF');
  const [initialBalance, setInitialBalance] = useState(wallet?.InitialBalance || 0);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Informe o nome.'); return; }
    try {
      if (isEdit) {
        await api.put(`/wallets/${wallet.Id}`, { name, kind, icon, color, initialBalance: Number(initialBalance) || 0 });
      } else {
        await api.post('/wallets', { name, kind, icon, color, initialBalance: Number(initialBalance) || 0, currency: 'R$' });
      }
      showToast(isEdit ? 'Conta atualizada' : 'Conta criada');
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Conta</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank, Dinheiro" autoFocus />
      </div>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Tipo</label>
        <select className="select" value={kind} onChange={(e) => setKind(parseInt(e.target.value, 10))}>
          {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Ícone</label>
        <input className="input" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="💼" maxLength={4} />
      </div>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Cor</label>
        <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Saldo inicial</label>
        <input className="input" type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-success">Salvar</button>
      </div>
    </form>
  );
}