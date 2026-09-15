import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import { money } from '../components/Money.jsx';
import { parseAmount } from '../format.js';

export default function SettingsLimits() {
  const [data, setData] = useState({ limits: [], overall: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/categories/limits');
      setData(result);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const saveLimit = async (catId) => {
    const amt = parseAmount(editing[catId]) || 0;
    try {
      await api.post(`/categories/limits/${catId}`, { amount: amt });
      showToast('Limite atualizado');
      setEditing({ ...editing, [catId]: undefined });
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const allocated = data.limits.reduce((s, l) => s + l.limit, 0);
  const overall = Number(data.overall || 0);
  const deficit = allocated > overall && overall > 0;

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-1">
        <a href="/settings" className="btn btn-outline-secondary" style={{ width: 36, height: 36, borderRadius: 12, padding: 0 }}>
          <PhosphorIcon name="caret-left" size={18} />
        </a>
        <h4 className="mb-0 text-white fw-bold" style={{ fontSize: "1.2rem", letterSpacing: "-0.2px" }}>Limites de gastos por categoria</h4>
      </div>
      <div className="small mb-4" style={{ color: '#8C85AA' }}>
        Defina um limite de gastos para cada categoria. Avisaremos quando você estiver chegando perto.
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <>
          {overall > 0 && (
            <div className="card p-4 border-0 mb-3" style={{ backgroundColor: '#161129', borderRadius: 20, border: '1px solid rgba(150,117,255,0.2)' }}>
              <div className="text-uppercase small" style={{ color: '#8C85AA', fontSize: '0.68rem', fontWeight: 600 }}>LIMITE GERAL ESTABELECIDO</div>
              <div className="fw-bold text-white" style={{ fontSize: '1.6rem' }}>{money(overall)}</div>
              <div className="row mt-2">
                <div className="col-6">
                  <div className="small" style={{ color: '#8C85AA' }}>Alocado por categoria: R$ {allocated.toFixed(2)}</div>
                </div>
                <div className="col-6 text-end">
                  {deficit ? (
                    <div className="small fw-semibold" style={{ color: '#FF5C4D' }}>Em déficit: R$ {(allocated - overall).toFixed(2)}</div>
                  ) : (
                    <div className="small fw-semibold" style={{ color: '#3ECF8E' }}>Disponível: R$ {(overall - allocated).toFixed(2)}</div>
                  )}
                </div>
              </div>
            </div>
          )}
          {deficit && (
            <div className="alert alert-danger">
              O limite mensal geral está em déficit de R$ {(allocated - overall).toFixed(2)} em relação aos limites por categoria.
            </div>
          )}

          <div className="d-flex flex-column gap-3">
            {data.limits.map((l) => (
              <div key={l.categoryId} className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 22 }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="settings-squircle" style={{ backgroundColor: '#2D234D', color: l.color || '#9675FF' }}>
                    <PhosphorIcon name={l.icon || 'tag'} size={20} />
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-bold text-white">{l.name}</div>
                    <div className="small" style={{ color: '#8C85AA' }}>
                      {l.limit > 0 ? `Limite: ${money(l.limit)}` : 'Nenhum limite definido'}
                    </div>
                  </div>
                  {editing[l.categoryId] !== undefined ? (
                    <div className="d-flex align-items-center gap-2">
                      <input
                        className="input"
                        style={{ width: 130 }}
                        inputMode="decimal"
                        value={editing[l.categoryId]}
                        onChange={(e) => setEditing({ ...editing, [l.categoryId]: e.target.value })}
                        placeholder="Ex: 500,00"
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => saveLimit(l.categoryId)}>Salvar</button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditing({ ...editing, [l.categoryId]: undefined })}>Cancelar</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm rounded-pill"
                      style={{ backgroundColor: 'rgba(150,117,255,0.15)', color: '#9675FF' }}
                      onClick={() => setEditing({ ...editing, [l.categoryId]: l.limit > 0 ? String(l.limit) : '' })}
                    >
                      {l.limit > 0 ? 'Editar limite' : '+ Definir limite'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}