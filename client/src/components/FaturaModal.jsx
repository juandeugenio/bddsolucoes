import React from 'react';
import PhosphorIcon from './PhosphorIcon.jsx';
import { money } from './Money.jsx';
import { formatDate } from '../format.js';

export default function FaturaModal({ fatura, onClose, onPagar }) {
  if (!fatura) return null;
  const total = Number(fatura.total || 0);
  const lim = Number(fatura.limit || 0);
  const pct = lim > 0 ? Math.round(Math.min(total / lim * 100, 100)) : 0;
  const dueDate = new Date(fatura.dueDate);

  return (
    <>
      <div
        className="modal-backdrop fade show"
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,8,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 1050 }}
        onClick={onClose}
      />
      <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="modal-content text-white border-0 shadow-lg" style={{ backgroundColor: '#161129', borderRadius: 24, border: '1px solid rgba(150,117,255,0.2)', maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between p-4 pb-0">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 rounded-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#2D234D', color: fatura.color, width: 44, height: 44 }}>
                <PhosphorIcon name={fatura.icon || 'credit-card'} size={22} />
              </div>
              <div>
                <h5 className="fw-bold text-white mb-0" style={{ fontSize: '1.15rem' }}>{fatura.name}</h5>
                {total === 0 ? (
                  <span className="badge rounded-pill fw-semibold px-2 py-1 mt-1" style={{ backgroundColor: 'rgba(46,213,115,0.15)', color: '#2ED573', fontSize: '0.7rem' }}>
                    ✓ Fatura Paga
                  </span>
                ) : (
                  <span className="badge rounded-pill fw-semibold px-2 py-1 mt-1" style={{ backgroundColor: 'rgba(255,159,148,0.15)', color: '#FF9F94', fontSize: '0.7rem' }}>
                    ● Fatura Aberta
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="btn btn-outline-secondary btn-icon" style={{ width: 34, height: 34 }}>
              <PhosphorIcon name="x" size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {/* Total Value Card */}
            <div className="p-3 mb-4 rounded-4" style={{ background: 'linear-gradient(135deg, rgba(45,35,77,0.6), rgba(22,17,41,0.8))', border: '1px solid rgba(150,117,255,0.15)' }}>
              <div className="small text-uppercase fw-semibold mb-1" style={{ color: '#8C85AA', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Valor Total da Fatura</div>
              <div className="fw-bold" style={{ color: '#FF9F94', fontSize: '1.8rem' }}>{money(total)}</div>
              <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top" style={{ borderColor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem', color: '#A8A3C1' }}>
                <div className="d-flex align-items-center gap-1"><PhosphorIcon name="calendar-blank" size={14} /> Fechamento: <strong>dia {fatura.closingDay}</strong></div>
                <div className="d-flex align-items-center gap-1"><PhosphorIcon name="clock" size={14} /> Vencimento: <strong>{dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</strong></div>
              </div>
              {lim > 0 && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between small mb-1" style={{ color: '#8C85AA' }}>
                    <span>Limite utilizado</span>
                    <span>{money(total)} de {money(lim)} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: '#2D234D', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#9675FF,#FF9F94)', borderRadius: 4 }} />
                  </div>
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            {(fatura.categories || []).length > 0 && (
              <div className="mb-4">
                <div className="small text-uppercase fw-bold mb-2" style={{ color: '#8C85AA', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  Onde você gastou no crédito
                </div>
                <div className="d-flex flex-column gap-2 p-3 rounded-4" style={{ backgroundColor: '#1E1838' }}>
                  {fatura.categories.map((cat, i) => {
                    const pctOfTotal = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small text-white">{cat.name}</span>
                          <span className="small" style={{ color: '#A8A3C1' }}>
                            {money(cat.amount)} <span style={{ color: '#6F688F' }}>({pctOfTotal}%)</span>
                          </span>
                        </div>
                        <div style={{ height: 6, backgroundColor: '#2D234D', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pctOfTotal}%`, background: 'linear-gradient(90deg,#9675FF,#7E52FF)', borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Itemized Purchases */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-uppercase fw-bold" style={{ color: '#8C85AA', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  Lançamentos da Fatura ({(fatura.items || []).length})
                </span>
              </div>
              {(fatura.items || []).length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {fatura.items.map((item) => (
                    <div key={item.id} className="d-flex align-items-center justify-content-between rounded-3" style={{ backgroundColor: '#1E1838', border: '1px solid rgba(255,255,255,0.03)', padding: '10px 12px' }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: '#2D234D', color: item.categoryColor, width: 36, height: 36 }}>
                          <PhosphorIcon name={item.categoryIcon} size={16} />
                        </div>
                        <div>
                          <div className="fw-semibold text-white" style={{ fontSize: '0.9rem' }}>{item.note}</div>
                          <div className="small" style={{ color: '#6F688F', fontSize: '0.75rem' }}>
                            {item.categoryName} · {formatDate(item.date)}
                          </div>
                        </div>
                      </div>
                      <div className="fw-bold" style={{ color: '#FF9F94', fontSize: '0.92rem' }}>-{money(item.amount)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 rounded-4" style={{ backgroundColor: '#1E1838', color: '#6F688F' }}>
                  <PhosphorIcon name="receipt" size={32} />
                  <div className="small mt-1">Nenhuma compra registrada nesta fatura.</div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="d-flex gap-2 p-4 pt-0">
            {total > 0 ? (
              <button
                className="btn fw-semibold text-white flex-grow-1 border-0 py-2"
                style={{ background: 'linear-gradient(135deg,#2ED573,#22C55E)', borderRadius: 14, fontSize: '0.95rem' }}
                onClick={() => { const f = fatura; onClose(); onPagar && onPagar(f); }}
              >
                <PhosphorIcon name="check-circle" size={16} /> Marcar fatura como paga
              </button>
            ) : (
              <div className="flex-grow-1 text-center py-2 rounded-3 small fw-semibold" style={{ backgroundColor: 'rgba(46,213,115,0.1)', color: '#2ED573' }}>
                <PhosphorIcon name="check-circle" size={16} /> Fatura totalmente quitada
              </div>
            )}
            <button
              className="btn fw-semibold text-white border-0 py-2 px-4"
              style={{ backgroundColor: '#2D234D', borderRadius: 14, fontSize: '0.95rem' }}
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}