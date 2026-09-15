import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../format.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/admin/users');
      setUsers(Array.isArray(result) ? result : []);
    } catch (err) {
      setFeedback({ type: 'danger', msg: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || (u.email || '').toLowerCase().includes(q) || (u.userName || '').toLowerCase().includes(q) || (u.tenantName || '').toLowerCase().includes(q);
  });

  const togglePro = async (u) => {
    try {
      await api.post(`/admin/users/${u.userId}/toggle-pro`, { enable: !u.isProActive });
      setFeedback({ type: 'success', msg: `${u.email} ${u.isProActive ? 'revogado do Pro' : 'promovido a Pro'}` });
      load();
    } catch (err) {
      setFeedback({ type: 'danger', msg: err.message });
    }
  };

  const proCount = users.filter((u) => u.isProActive).length;

  return (
    <div className="py-4" style={{ maxWidth: 1100 }}>
      <span className="badge rounded-pill mb-2" style={{ backgroundColor: '#E5B842', color: '#18122B' }}>
        <PhosphorIcon name="shield-check" size={12} /> PAINEL ADMINISTRATIVO
      </span>
      <h2 className="fw-bold text-white" style={{ fontSize: '1.5rem' }}>Gerenciamento de Usuários &amp; Assinaturas Pro</h2>
      <p className="text-muted mb-3">Visualize os usuários cadastrados, libere o acesso Pro (R$ 60/ano) via Sweet Toggle e vincule cônjuges.</p>

      <div className="d-flex gap-2 mb-3 w-100">
        <button className="btn btn-outline-secondary flex-fill" onClick={load}><PhosphorIcon name="arrows-clockwise" size={14} /> Atualizar Grid</button>
        <button className="btn btn-primary flex-fill" onClick={() => setShowLinkModal(true)}><PhosphorIcon name="heart" size={14} /> Vincular Cônjuge</button>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {feedback.msg}
          <button style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setFeedback(null)}>✕</button>
        </div>
      )}

      <div className="mb-3">
        <div className="position-relative">
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por email, nome ou tenant..." style={{ paddingLeft: 40 }} />
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <PhosphorIcon name="magnifying-glass" size={16} style={{ color: '#8C85AA' }} />
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 16, flex: 1 }}>
          <div className="small" style={{ color: '#8C85AA' }}>Total Cadastrados</div>
          <div className="fw-bold text-white" style={{ fontSize: '1.3rem' }}>{users.length}</div>
        </div>
        <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 16, flex: 1 }}>
          <div className="small" style={{ color: '#8C85AA' }}>Assinantes Pro</div>
          <div className="fw-bold" style={{ fontSize: '1.3rem', color: '#E5B842' }}>{proCount}</div>
        </div>
      </div>

      <div className="card p-0 border-0" style={{ backgroundColor: '#161129', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="table align-middle mb-0" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th>Usuário / Email</th>
              <th>Espaço (Tenant)</th>
              <th>Cônjuge Vinculado</th>
              <th>Status Plano</th>
              <th>Validade Pro</th>
              <th>Sweet Toggle Pro</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4 text-muted"><div className="spinner-border" style={{ width: 24, height: 24 }} /> Carregando usuários...</td></tr>
            ) : filtered.length > 0 ? (
              filtered.map((u) => (
                <tr key={u.userId}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="avatar-circle" style={{ background: u.isProActive ? 'linear-gradient(135deg,#E5B842,#B8860B)' : '#2D234D' }}>
                        {String((u.email || '?')).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white fw-semibold">{u.email}</div>
                        <div className="small" style={{ color: '#8C85AA' }}>ID: {String(u.userId).slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-white">{u.tenantName || '-'}</td>
                  <td>
                    {u.spouseEmail ? (
                      <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(255,71,87,0.15)', color: '#FF9F94' }}>
                        <PhosphorIcon name="heart" size={10} /> {u.spouseEmail}
                      </span>
                    ) : <span className="text-muted small">Sem vínculo</span>}
                  </td>
                  <td>
                    {u.isProActive ? (
                      <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(229,184,66,0.15)', color: '#E5B842' }}>
                        <PhosphorIcon name="crown" size={10} /> PRO (Ativo)
                      </span>
                    ) : <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#8C85AA' }}>Gratuito</span>}
                  </td>
                  <td>
                    {u.planExpiresAt ? (
                      <span className="small" style={{ color: '#C0B7E8' }}>
                        <PhosphorIcon name="calendar-check" size={12} /> {formatDate(u.planExpiresAt)}
                      </span>
                    ) : <span className="text-muted small">—</span>}
                  </td>
                  <td>
                    <div className={`sweet-toggle-switch ${u.isProActive ? 'on' : ''}`} onClick={() => togglePro(u)} title={u.isProActive ? 'Revogar Pro' : 'Liberar Pro'} />
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="text-center py-4 text-muted">Nenhum usuário encontrado para a busca "{search}".</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showLinkModal && (
        <LinkSpousesModal onClose={() => setShowLinkModal(false)} onSaved={() => { setShowLinkModal(false); load(); }} />
      )}
    </div>
  );
}

function LinkSpousesModal({ onClose, onSaved }) {
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [spouseEmail, setSpouseEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/users/link-spouses', { primaryEmail, spouseEmail });
      showToast('Cônjuges vinculados');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Vincular Cônjuges (Mesmo Tenant)" onClose={onClose}>
      <div className="small mb-3" style={{ color: '#8C85AA' }}>
        Vincule dois usuários ao mesmo espaço. O plano Pro é compartilhado automaticamente entre os cônjuges.
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group mb-3">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>E-mail do Usuário 1 (Principal):</label>
          <input className="input" value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} placeholder="ex: marido@email.com" autoFocus />
        </div>
        <div className="form-group mb-3">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>E-mail do Usuário 2 (Cônjuge):</label>
          <input className="input" value={spouseEmail} onChange={(e) => setSpouseEmail(e.target.value)} placeholder="ex: esposa@email.com" />
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Vinculando...' : 'Vincular Agora'}</button>
        </div>
      </form>
    </Modal>
  );
}