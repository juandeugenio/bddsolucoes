import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import { money } from '../components/Money.jsx';
import { getBankLogoUrl } from '../utils/bankLogo.js';

const GaugeCx = 287.5;
const GaugeCy = 287.5;
const GaugeR = 237.5;

function pointX(angle, radius = GaugeR) {
  return GaugeCx + radius * Math.cos(angle);
}
function pointY(angle, radius = GaugeR) {
  return GaugeCy - radius * Math.sin(angle);
}

function firstName(name) {
  return String(name || '').split(' ').filter(Boolean)[0] || name || '';
}

export default function Dashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [bills, setBills] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { showToast } = useToast();

  const monthName = (() => {
    const raw = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  const load = useCallback(async () => {
    try {
      const summary = await api.get(`/dashboard/summary?year=${year}&month=${month}`);
      const inv = await api.get(`/dashboard/invoices?year=${year}&month=${month}`);
      const billsRes = await api.get(`/dashboard/bills?year=${year}&month=${month}`);
      setData(summary);
      setInvoices(inv.invoices || []);
      setBills(billsRes.bills || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoaded(true);
    }
  }, [year, month, showToast]);

  useEffect(() => {
    setIsLoaded(false);
    load();
  }, [load]);

  const prevMonth = () => {
    let m = month - 1;
    let y = year;
    if (m === 0) { m = 12; y--; }
    setYear(y);
    setMonth(m);
  };
  const nextMonth = () => {
    let m = month + 1;
    let y = year;
    if (m === 13) { m = 1; y++; }
    setYear(y);
    setMonth(m);
  };

  const toggleBillPaid = async (bill) => {
    try {
      await api.post(`/transactions/${bill.id}/toggle-paid`);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (!data) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" />
      </div>
    );
  }

  const members = data.memberSummary || [];
  // Sem cônjuge (1 membro), não existe divisão 50/50 — sempre modo conjunto.
  const hasCouple = members.length >= 2;
  const isSplit = hasCouple && data.controlMode === 0;
  const monthlyExpense = Number(data.expense || 0);
  const monthlyIncome = Number(data.income || 0);
  const monthlyNet = Number(data.net || 0);
  const accumulatedBalance = Number(data.accumulatedBalance || 0);
  const monthlyLimit = Number(data.overallLimit || 0);
  const usedPct = monthlyLimit > 0 ? Math.round((monthlyExpense / monthlyLimit) * 100) : 0;

  const firstMember = members[0] || null;
  const secondMember = members[1] || null;
  const firstExpense = Number(firstMember?.expense || 0);
  const secondExpense = Number(secondMember?.expense || 0);
  const firstExpensePct = monthlyExpense > 0 ? Math.round((firstExpense / monthlyExpense) * 100) : 0;
  const secondExpensePct = monthlyExpense > 0 ? Math.round((secondExpense / monthlyExpense) * 100) : 0;
  // Divisão reflete quem paga mais: % do gasto real de cada membro (mesma base do gauge/cards)
  const splitLabel = monthlyExpense > 0 ? `${firstExpensePct}/${secondExpensePct}` : '50/50';

  const settlement = data.coupleSettlement || { totalOwed: 0, settlements: [] };
  const toSettleAmount = Number(settlement.totalOwed || 0);
  const toSettleSubtitle =
    settlement.settlements?.length > 0
      ? `${firstName(settlement.settlements[0].fromName)} deve a ${firstName(settlement.settlements[0].toName)}`
      : 'Nenhum acerto pendente';

  // Gauge arc paths
  const firstPct = monthlyExpense > 0 ? Math.min(Math.max(firstExpense / monthlyExpense, 0.001), 0.999) : 0;
  const gaugeBoundaryAngle = Math.PI * (1 - firstPct);
  const purpleArcPath = `M ${pointX(Math.PI).toFixed(1)} ${pointY(Math.PI).toFixed(1)} A ${GaugeR.toFixed(1)} ${GaugeR.toFixed(1)} 0 0 1 ${pointX(gaugeBoundaryAngle).toFixed(1)} ${pointY(gaugeBoundaryAngle).toFixed(1)}`;
  const cyanArcPath = `M ${pointX(gaugeBoundaryAngle).toFixed(1)} ${pointY(gaugeBoundaryAngle).toFixed(1)} A ${GaugeR.toFixed(1)} ${GaugeR.toFixed(1)} 0 0 1 ${pointX(0).toFixed(1)} ${pointY(0).toFixed(1)}`;
  const jointArcPath = `M ${pointX(Math.PI).toFixed(1)} ${pointY(Math.PI).toFixed(1)} A ${GaugeR.toFixed(1)} ${GaugeR.toFixed(1)} 0 0 1 ${pointX(0).toFixed(1)} ${pointY(0).toFixed(1)}`;
  const sepX1 = pointX(gaugeBoundaryAngle, GaugeR - 25).toFixed(1);
  const sepY1 = pointY(gaugeBoundaryAngle, GaugeR - 25).toFixed(1);
  const sepX2 = pointX(gaugeBoundaryAngle, GaugeR + 25).toFixed(1);
  const sepY2 = pointY(gaugeBoundaryAngle, GaugeR + 25).toFixed(1);

  return (
    <div style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.2s' }}>
      {/* Top Month Navigator */}
      <div className="d-flex align-items-center justify-content-center gap-3 mb-3 pt-2">
        <button
          className="btn btn-link text-white text-decoration-none fs-4 p-0 opacity-75 fw-light"
          onClick={prevMonth}
          title="Mês anterior"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          &lt;
        </button>
        <h4 className="mb-0 text-white fw-bold" style={{ fontSize: '1.15rem', letterSpacing: '-0.2px' }}>
          {monthName} de {year}
        </h4>
        <button
          className="btn btn-link text-white text-decoration-none fs-4 p-0 opacity-75 fw-light"
          onClick={nextMonth}
          title="Próximo mês"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          &gt;
        </button>
      </div>

      {/* 1. Gauge + 2. Card do Casal — lado a lado no desktop */}
      <div className="row align-items-stretch mb-4">
        <div className="col-12 col-lg-5 d-flex align-items-center justify-content-center">
          <div className="text-center position-relative my-3" style={{ width: '100%', maxWidth: 560 }}>
        {isSplit ? (
          <>
            <div className="d-inline-block mb-1" style={{ position: 'relative', zIndex: 2 }}>
              <span className="badge bg-white text-dark rounded-pill fw-bold px-3 py-1" style={{ fontSize: '0.7rem', letterSpacing: '0.2px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                Divisão {splitLabel}
              </span>
            </div>
            <div className="position-relative w-100 mx-auto" style={{ height: 185 }}>
              <svg viewBox="0 0 575 315" className="w-100 h-100" style={{ overflow: 'visible' }} preserveAspectRatio="xMidYMid meet">
                <path d={purpleArcPath} fill="none" stroke="#9675FF" strokeWidth="50" strokeLinecap="butt" />
                <path d={cyanArcPath} fill="none" stroke="#00B2FE" strokeWidth="50" strokeLinecap="butt" />
                <line x1={sepX1} y1={sepY1} x2={sepX2} y2={sepY2} stroke="#130F24" strokeWidth="4" strokeLinecap="round" />
                <line x1="287.5" y1="15" x2="287.5" y2="85" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
              </svg>
              <div className="position-absolute w-100 text-center" style={{ top: 52, left: '50%', transform: 'translateX(-50%)' }}>
                <br /><br />
                <div className="fw-normal mb-1" style={{ fontSize: '0.78rem', color: '#8C85AA', letterSpacing: '0.1px' }}>A acertar</div>
                <div className="fw-bold text-white my-1" style={{ fontSize: '1.95rem', letterSpacing: '-0.6px', lineHeight: 1.1 }}>
                  {money(toSettleAmount)}
                </div>
                <div className="fw-normal mt-1" style={{ fontSize: '0.78rem', color: '#8C85AA', letterSpacing: '0.1px' }}>{toSettleSubtitle}</div>
              </div>
            </div>
          </>
        ) : (
          <>
            {hasCouple && (
              <div className="d-inline-block mb-1" style={{ position: 'relative', zIndex: 2 }}>
                <span className="badge bg-white text-dark rounded-pill fw-bold px-3 py-1" style={{ fontSize: '0.7rem', letterSpacing: '0.2px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  Conta conjunta
                </span>
              </div>
            )}
            <div className="position-relative w-100 mx-auto" style={{ height: 185 }}>
              <svg viewBox="0 0 575 315" className="w-100 h-100" style={{ overflow: 'visible' }} preserveAspectRatio="xMidYMid meet">
                <path d={jointArcPath} fill="none" stroke="#9675FF" strokeWidth="50" strokeLinecap="round" />
              </svg>
              <div className="position-absolute w-100 text-center" style={{ top: 52, left: '50%', transform: 'translateX(-50%)' }}>
                <br /><br />
                <div className="fw-normal mb-1" style={{ fontSize: '0.78rem', color: '#8C85AA', letterSpacing: '0.1px' }}>
                  {hasCouple ? `Saldo do casal em ${monthName}` : `Saldo em ${monthName}`}
                </div>
                <div className="fw-bold text-white my-1" style={{ fontSize: '1.95rem', letterSpacing: '-0.6px', lineHeight: 1.1 }}>
                  {monthlyNet >= 0 ? '+' : '-'} {money(Math.abs(monthlyNet))}
                </div>
                <div className="fw-normal mt-1" style={{ fontSize: '0.78rem', color: '#8C85AA', letterSpacing: '0.1px' }}>
                  Receita: +{money(monthlyIncome)}
                </div>
              </div>
            </div>
          </>
        )}
          </div>
        </div>
        <div className="col-12 col-lg-7 d-flex">
      {isSplit ? (
        <div className="card p-3 border-0 w-100" style={{ backgroundColor: '#1D1735', borderRadius: 26 }}>
          <div className="row text-center">
            <div className="col-6 border-end" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                <svg viewBox="0 0 36 36" style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #9675FF', flexShrink: 0 }}>
                  <circle cx="18" cy="18" r="18" fill="#3D2D63" />
                  <circle cx="18" cy="13" r="6" fill="#F0C8B0" />
                  <path d="M 8 32 C 8 23 28 23 28 32 Z" fill="#9675FF" />
                </svg>
                <span className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>{firstName(firstMember?.name)}</span>
                <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ backgroundColor: '#251E44', color: '#A8A2C9', fontSize: '0.7rem' }}>{firstExpensePct}%</span>
              </div>
              <div className="d-flex justify-content-between px-2 small mb-1">
                <span style={{ color: '#8C85AA', fontSize: '0.78rem' }}>Gasto</span>
                <span className="fw-bold text-white" style={{ fontSize: '0.78rem' }}>-{money(firstExpense)}</span>
              </div>
              <div className="d-flex justify-content-between px-2 small">
                <span style={{ color: '#8C85AA', fontSize: '0.78rem' }}>Rendas</span>
                <span className="fw-bold text-white" style={{ fontSize: '0.78rem' }}>+{money(firstMember?.income || 0)}</span>
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ backgroundColor: '#251E44', color: '#A8A2C9', fontSize: '0.7rem' }}>{secondExpensePct}%</span>
                <span className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>{firstName(secondMember?.name)}</span>
                <svg viewBox="0 0 36 36" style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #22D3EE', flexShrink: 0 }}>
                  <circle cx="18" cy="18" r="18" fill="#184856" />
                  <circle cx="18" cy="13" r="6" fill="#FAD4C0" />
                  <path d="M 8 32 C 8 23 28 23 28 32 Z" fill="#22D3EE" />
                </svg>
              </div>
              <div className="d-flex justify-content-between px-2 small mb-1">
                <span style={{ color: '#8C85AA', fontSize: '0.78rem' }}>Gasto</span>
                <span className="fw-bold text-white" style={{ fontSize: '0.78rem' }}>-{money(secondExpense)}</span>
              </div>
              <div className="d-flex justify-content-between px-2 small">
                <span style={{ color: '#8C85AA', fontSize: '0.78rem' }}>Rendas</span>
                <span className="fw-bold text-white" style={{ fontSize: '0.78rem' }}>+{money(secondMember?.income || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-3 border-0 w-100" style={{ backgroundColor: '#1D1735', borderRadius: 26 }}>
          <div className="row text-center">
            <div className="col-12">
              <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                <svg viewBox="0 0 36 36" style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #9675FF', flexShrink: 0 }}>
                  <circle cx="18" cy="18" r="18" fill="#3D2D63" />
                  <circle cx="18" cy="13" r="6" fill="#F0C8B0" />
                  <path d="M 8 32 C 8 23 28 23 28 32 Z" fill="#9675FF" />
                </svg>
                <span className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>{firstName(firstMember?.name)}</span>
                {hasCouple && (
                  <>
                    <span className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>&amp;</span>
                    <span className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>{firstName(secondMember?.name)}</span>
                    <svg viewBox="0 0 36 36" style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #22D3EE', flexShrink: 0 }}>
                      <circle cx="18" cy="18" r="18" fill="#184856" />
                      <circle cx="18" cy="13" r="6" fill="#FAD4C0" />
                      <path d="M 8 32 C 8 23 28 23 28 32 Z" fill="#22D3EE" />
                    </svg>
                  </>
                )}
              </div>
              <div className="d-flex justify-content-between small mb-1">
                <span style={{ color: '#8C85AA', fontSize: '0.78rem' }}>{hasCouple ? 'Gasto do casal' : 'Gasto'}</span>
                <span className="fw-bold text-white" style={{ fontSize: '0.78rem' }}>-{money(monthlyExpense)}</span>
              </div>
              <div className="d-flex justify-content-between small">
                <span style={{ color: '#8C85AA', fontSize: '0.78rem' }}>{hasCouple ? 'Rendas do casal' : 'Rendas'}</span>
                <span className="fw-bold text-white" style={{ fontSize: '0.78rem' }}>+{money(monthlyIncome)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* 3. Card de Gasto no Mês */}
      <div className="card mb-4 p-4 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 26 }}>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="fw-bold text-white" style={{ fontSize: '1.05rem' }}>Gasto em {monthName}</span>
          <span style={{ color: '#8C85AA', fontSize: '0.82rem' }}>limite {money(monthlyLimit)}</span>
        </div>
        <div className="d-flex justify-content-between align-items-baseline mb-3">
          <span className="fw-bold text-white" style={{ fontSize: '2.1rem', letterSpacing: '-0.5px' }}>{money(monthlyExpense)}</span>
          <span style={{ color: '#8C85AA', fontSize: '0.82rem' }} className="fw-semibold">{usedPct}%</span>
        </div>
        <div className="progress mb-2" style={{ height: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20 }}>
          <div className="progress-bar" style={{ width: `${Math.min(100, usedPct)}%`, backgroundColor: '#FF5C4D', borderRadius: 20 }} />
        </div>
        <div className="text-end small mb-4 fw-semibold" style={{ color: '#FF5C4D', fontSize: '0.82rem' }}>
          {monthlyExpense > monthlyLimit ? (
            <span>{money(monthlyExpense - monthlyLimit)} acima do limite</span>
          ) : (
            <span style={{ color: '#8C85AA' }}>{money(monthlyLimit - monthlyExpense)} restante</span>
          )}
        </div>
        <div className="row pt-3 text-center border-top" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="col-4 border-end" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="mb-1" style={{ color: '#8C85AA', fontSize: '0.72rem' }}>Renda do mês</div>
            <div className="fw-bold text-white" style={{ fontSize: '0.85rem' }}>+{money(monthlyIncome)}</div>
          </div>
          <div className="col-4 border-end" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="mb-1" style={{ color: '#8C85AA', fontSize: '0.72rem' }}>Saldo do mês</div>
            <div className="fw-bold" style={{ fontSize: '0.85rem', color: monthlyNet < 0 ? '#FF5C4D' : '#22C55E' }}>
              {monthlyNet >= 0 ? '+' : '-'}{money(Math.abs(monthlyNet))}
            </div>
          </div>
          <div className="col-4">
            <div className="mb-1" style={{ color: '#8C85AA', fontSize: '0.72rem' }}>Saldo acumulado</div>
            <div className="fw-bold" style={{ fontSize: '0.85rem', color: accumulatedBalance < 0 ? '#FF5C4D' : '#2ED573' }}>
              {money(accumulatedBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Faturas do Mês */}
      {invoices.length > 0 && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center px-2 mb-2">
            <span style={{ color: '#8C85AA', fontSize: '0.85rem', fontWeight: 500 }}>
              FATURAS DO MÊS
              {invoices.length > 5 && (
                <span className="badge rounded-pill fw-semibold px-2 py-0.5 ms-2" style={{ backgroundColor: '#2D234D', color: '#9675FF', fontSize: '0.68rem' }}>
                  5 de {invoices.length} (role para ver mais)
                </span>
              )}
            </span>
            <a href="/transactions" style={{ color: '#9675FF', fontSize: '0.8rem', textDecoration: 'none' }}>Ver em Movimentos</a>
          </div>
          <div className="d-flex flex-column gap-2" style={invoices.length > 5 ? { maxHeight: 360, overflowY: 'auto', paddingRight: 4 } : {}}>
            {invoices.slice(0, invoices.length).map((f) => {
              const logoUrl = getBankLogoUrl(f.name, f.icon);
              const lim = Number(f.limit || 0);
              const pct = lim > 0 ? Math.round(Math.min(f.total / lim * 100, 100)) : 0;
              const dueDate = new Date(f.dueDate);
              return (
                <div key={f.cardId} className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="d-flex align-items-center gap-3">
                    {logoUrl ? (
                      <div className="d-flex align-items-center justify-content-center p-1 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', width: 40, height: 40 }}>
                        <img src={logoUrl} alt={f.name} style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} />
                      </div>
                    ) : (
                      <div className="p-2 rounded-3" style={{ backgroundColor: '#2D234D', color: f.color }}>
                        <span style={{ fontSize: '1.2rem' }}><PhosphorIcon name={f.icon || 'credit-card'} /></span>
                      </div>
                    )}
                    <div className="flex-grow-1">
                      <div className="fw-semibold text-white">{f.name}</div>
                      <div className="small" style={{ color: '#6F688F' }}>
                        Fecha dia {f.closingDay} · Vence {dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold" style={{ color: f.total > 0 ? '#FF9F94' : '#8C85AA', fontSize: '1.05rem' }}>{money(f.total)}</div>
                      {lim > 0 && <div className="small" style={{ color: '#6F688F' }}>{pct}% do limite</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Próximas Contas */}
      {bills.length > 0 && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center px-2 mb-2">
            <span style={{ color: '#8C85AA', fontSize: '0.85rem', fontWeight: 500 }}>
              CONTAS DO MÊS DE {monthName.toUpperCase()}
              {bills.length > 5 && (
                <span className="badge rounded-pill fw-semibold px-2 py-0.5 ms-2" style={{ backgroundColor: '#2D234D', color: '#9675FF', fontSize: '0.68rem' }}>
                  5 de {bills.length} (role para ver mais)
                </span>
              )}
            </span>
            <a href="/transactions" style={{ color: '#9675FF', fontSize: '0.8rem', textDecoration: 'none' }}>Ver todas em Movimentos</a>
          </div>
          <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
            <div className="d-flex flex-column gap-2" style={bills.length > 5 ? { maxHeight: 290, overflowY: 'auto', paddingRight: 4 } : {}}>
              {bills.map((bill, i) => (
                <div key={bill.id}>
                  {i > 0 && <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />}
                  <div className="d-flex align-items-center justify-content-between py-1">
                    <div className="d-flex align-items-center gap-3">
                      <div className="settings-squircle" style={{ backgroundColor: '#2D234D' }}>
                        <span style={{ fontSize: '1.1rem' }}><PhosphorIcon name={bill.icon || 'wallet'} /></span>
                      </div>
                      <div>
                        <div className="fw-semibold text-white">{bill.note}</div>
                        <div className="small" style={{ color: '#8C85AA' }}>Vence dia {new Date(bill.date).getDate()}</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <div className="fw-bold text-white">{money(bill.amount)}</div>
                      <button
                        className="btn btn-sm rounded-pill fw-semibold px-3 border-0"
                        style={{ backgroundColor: bill.isPaid ? '#22C55E' : '#2D234D', color: bill.isPaid ? '#FFF' : '#FF5C4D', fontSize: '0.75rem' }}
                        onClick={() => toggleBillPaid(bill)}
                      >
                        {bill.isPaid ? 'Pago' : 'Pendente'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}