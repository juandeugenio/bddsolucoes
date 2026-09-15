import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';

const ICON_OPTIONS = [
  'house', 'wallet', 'shopping-bag', 'receipt', 'car', 'airplane', 'barbell', 'first-aid-kit',
  'briefcase', 'piggy-bank', 'currency-dollar', 'trend-up', 'trend-down', 'gift', 'pizza', 'coffee',
  'game-controller', 'music-notes', 'film-strip', 'book-bookmark', 'paw-print', 'baby', 'snowflake',
  'lightning', 'drop', 'leaf', 'heart', 'star', 'tag', 'credit-card', 'bank', 'coins', 'clock',
];

// Fallback: ícones não-existirem na fonte Phosphor viram emoji
const ICON_EMOJI_MAP = {
  house: '🏠', wallet: '💼', 'shopping-bag': '🛒', receipt: '🧾', car: '🚗', airplane: '✈️',
  'first-aid-kit': '🏥', briefcase: '💼', 'piggy-bank': '🐷', 'currency-dollar': '💰',
  'trend-up': '📈', 'trend-down': '📉', gift: '🎁', pizza: '🍕', coffee: '☕',
  'game-controller': '🎮', 'music-notes': '🎵', 'film-strip': '🎬', leaf: '🌿',
  heart: '❤️', star: '⭐', tag: '🏷️', 'credit-card': '💳', bank: '🏦', coins: '🪙', clock: '⏰',
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [limits, setLimits] = useState({ limits: [], overall: 0 });
  const [type, setType] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, lims] = await Promise.all([
        api.get('/categories'),
        api.get('/categories/limits'),
      ]);
      setCategories(cats);
      setLimits(lims);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const list = categories.filter((c) => c.Type === type);
  const limitMap = {};
  for (const l of limits.limits) limitMap[l.categoryId] = l.limit;

  const remove = async (id) => {
    if (!confirm('Arquivar esta categoria?')) return;
    try {
      await api.del(`/categories/${id}`);
      showToast('Categoria arquivada');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <a href="/settings" className="btn btn-outline-secondary" style={{ width: 36, height: 36, borderRadius: 12, padding: 0 }}>
          <PhosphorIcon name="caret-left" size={18} />
        </a>
        <h4 className="mb-0 text-white fw-bold" style={{ fontSize: "1.2rem", letterSpacing: "-0.2px" }}>Categorias</h4>
        <button className="btn btn-primary rounded-pill" onClick={() => { setEditCat(null); setShowForm(true); }}>
          <PhosphorIcon name="plus" size={16} /> Nova categoria
        </button>
      </div>

      <div className="segmented-control-container mb-4" style={{ backgroundColor: '#161129' }}>
        <button className={`segmented-control-btn flex-fill ${type === 0 ? 'active' : ''}`} onClick={() => setType(0)} style={{ backgroundColor: type === 0 ? '#2D234D' : 'transparent' }}>Despesas</button>
        <button className={`segmented-control-btn flex-fill ${type === 1 ? 'active' : ''}`} onClick={() => setType(1)} style={{ backgroundColor: type === 1 ? '#23382D' : 'transparent' }}>Receitas</button>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <div className="d-flex flex-column gap-2-5" style={{ gap: 10 }}>
          {list.map((c) => (
            <div key={c.Id} className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
              <div className="d-flex align-items-center gap-3">
                <div className="settings-squircle" style={{ backgroundColor: `${c.Color}22`, color: c.Color }}>
                  <PhosphorIcon name={c.Icon || 'tag'} size={20} style={{ color: c.Color }} />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold text-white">{c.Name}</div>
                  {limitMap[c.Id] ? (
                    <span className="badge rounded-pill" style={{ backgroundColor: '#2D234D', color: '#9675FF', fontSize: '0.68rem' }}>
                      Limite: R$ {Number(limitMap[c.Id]).toFixed(2)}
                    </span>
                  ) : (
                    <div className="small" style={{ color: '#6F688F' }}>Sem limite mensal</div>
                  )}
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => { setEditCat(c); setShowForm(true); }}>
                  <PhosphorIcon name="pencil-simple" size={14} />
                </button>
                <button className="btn btn-outline-secondary btn-sm" style={{ color: '#FF5C4D' }} onClick={() => remove(c.Id)}>
                  <PhosphorIcon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-center py-5" style={{ color: '#8C85AA' }}>
              Nenhuma categoria de {type === 0 ? 'despesa' : 'receita'} cadastrada.
            </div>
          )}
        </div>
      )}

      {showForm && (
        <Modal open title={`${editCat ? 'Editar' : 'Nova'} Categoria de ${type === 0 ? 'Despesa' : 'Receita'}`} onClose={() => setShowForm(false)}>
          <CategoryForm cat={editCat} type={type} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
        </Modal>
      )}
    </div>
  );
}

function CategoryForm({ cat, type, onClose, onSaved }) {
  const isEdit = Boolean(cat);
  const [name, setName] = useState(cat?.Name || '');
  const [icon, setIcon] = useState(cat?.Icon || 'tag');
  const [color, setColor] = useState(cat?.Color || '#5B8DEF');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Informe o nome.'); return; }
    try {
      if (isEdit) {
        await api.put(`/categories/${cat.Id}`, { name, icon, color, limit: limit !== '' ? Number(limit) : undefined });
      } else {
        await api.post('/categories', { name, icon, color, type, limit: limit !== '' ? Number(limit) : undefined });
      }
      showToast(isEdit ? 'Categoria atualizada' : 'Categoria criada');
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Nome da categoria</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alimentação, Salário, Freelance..." autoFocus />
      </div>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Ícone</label>
        <div className="d-flex flex-wrap gap-2">
          {ICON_OPTIONS.map((i) => (
            <button
              key={i}
              type="button"
              className="edit-pill-btn"
              style={icon === i ? { borderColor: '#9675FF', backgroundColor: '#2D234D' } : {}}
              onClick={() => setIcon(i)}
            >
              <PhosphorIcon name={i} size={16} />
            </button>
          ))}
        </div>
      </div>
      <div className="form-group mb-3">
        <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Cor</label>
        <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      {type === 0 && (
        <div className="form-group mb-3">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Limite mensal de gasto (R$)</label>
          <input className="input" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Sem limite" />
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-success">Salvar Categoria</button>
      </div>
    </form>
  );
}