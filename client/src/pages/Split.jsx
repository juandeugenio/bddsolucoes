import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';
import { money } from '../components/Money.jsx';
import PhosphorIcon from '../components/PhosphorIcon.jsx';

export default function Split() {
  const [data, setData] = useState({ groups: [], plan: 0, maxGroups: 2 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groups, mode] = await Promise.all([
        api.get('/split'),
        api.get('/tenants/control-mode'),
      ]);
      setData(groups);
      if (mode.controlMode === 1) navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold text-white mb-0" style={{ fontSize: '1.4rem' }}>Divisões</h2>
          <div className="small" style={{ color: '#8C85AA' }}>Racha as despesas do grupo</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <PhosphorIcon name="plus" size={16} /> Novo grupo
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {data.plan === 0 && (
        <div className="alert alert-info">
          Limite do plano grátis ({data.maxGroups} grupos de divisão). Assine o Pro para ilimitados.
        </div>
      )}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {data.groups.map((g) => (
            <Link key={g.Id} to={`/split/${g.Id}`} className="list-group-item-action list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: '#161129', borderRadius: 20, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none', color: '#fff' }}>
              <div>
                <div className="fw-semibold text-white">{g.Name}</div>
                <div className="small" style={{ color: '#8C85AA' }}>{g.memberCount} participantes · {g.entryCount} despesas</div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary-subtle text-primary-emphasis" style={{ fontSize: '0.9rem' }}>{money(g.total)}</span>
                <PhosphorIcon name="caret-right" size={16} style={{ color: '#8C85AA' }} />
              </div>
            </Link>
          ))}
          {data.groups.length === 0 && (
            <div className="text-center py-5" style={{ color: '#8C85AA' }}>
              Nenhum grupo de divisão. Crie um para dividir despesas entre amigos.
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="card p-4 mb-4 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
          <SplitForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
        </div>
      )}
    </div>
  );
}

function SplitForm({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Informe o nome.'); return; }
    try {
      await api.post('/split', { name });
      showToast('Grupo criado');
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Nome do grupo</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aluguel da casa" autoFocus />
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary">Criar</button>
      </div>
    </form>
  );
}