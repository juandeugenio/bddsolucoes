import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api.js';
import HeaderMes from '../components/HeaderMes.jsx';
import { FiltroTipo, FiltroMetodo, FiltroStatus } from '../components/Filtros.jsx';
import MovimentoCard from '../components/MovimentoCard.jsx';
import CalendarioMensal from '../components/CalendarioMensal.jsx';
import FormDespesa from '../components/FormDespesa.jsx';
import FaturaModal from '../components/FaturaModal.jsx';
import ModalDespesaFutura from '../components/ModalDespesaFutura.jsx';
import { useToast } from '../components/Toast.jsx';
import { money } from '../components/Money.jsx';
import { getBankLogoUrl } from '../utils/bankLogo.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';

export default function Transactions() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [view, setView] = useState('list');
  const [data, setData] = useState({ transactions: [], wallets: [], categories: [], cards: [], members: [] });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [openFilter, setOpenFilter] = useState(null);
  const toggleFilter = (name) => setOpenFilter((prev) => (prev === name ? null : name));
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [defaultDate, setDefaultDate] = useState(null);
  const [selectedFatura, setSelectedFatura] = useState(null);
  const [faturaActionCardId, setFaturaActionCardId] = useState(null);
  const [futureExpenseTx, setFutureExpenseTx] = useState(null);
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get(`/transactions?year=${year}&month=${month}`);
      setData(result);
      try {
        const inv = await api.get(`/dashboard/invoices?year=${year}&month=${month}`);
        setInvoices(inv.invoices || []);
      } catch { /* sem cartões */ }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [year, month, showToast]);

  useEffect(() => {
    load();
    if (searchParams.get('new') === '1') {
      setEditTx(null);
      setDefaultDate(null);
      setShowForm(true);
    }
  }, [load, searchParams]);

  const onMonthChange = (y, m, newView) => {
    if (y && m) { setYear(y); setMonth(m); }
    if (newView) setView(newView);
  };

  const filtered = data.transactions.filter((t) => {
    if (filterType === 'income' && t.Kind !== 0) return false;
    if (filterType === 'expense' && t.Kind !== 1) return false;
    if (filterMethod !== 'all') {
      if (t.CardId && filterMethod === '0') return true;
      if (String(t.WalletKind) !== filterMethod) return false;
    }
    if (filterStatus === 'paid' && !(t.IsPaid === 1 || t.IsPaid === true)) return false;
    if (filterStatus === 'pending' && (t.IsPaid === 1 || t.IsPaid === true)) return false;
    return true;
  });

  const groupedByDay = {};
  for (const t of filtered) {
    const day = new Date(t.Date);
    const key = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString();
    (groupedByDay[key] = groupedByDay[key] || []).push(t);
  }
  const days = Object.keys(groupedByDay).sort().reverse();

  const togglePaid = async (t) => {
    try {
      await api.post(`/transactions/${t.Id}/toggle-paid`);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openForm = (tx, date) => {
    setEditTx(tx || null);
    setDefaultDate(date || null);
    setShowForm(true);
  };

  // Replica PagarFatura do original: pré-preenche FormDespesa com o total da fatura
  const pagarFatura = (fatura) => {
    const bankWallet = data.wallets.find((w) => w.Kind === 2) || data.wallets[0];
    setEditTx({
      Id: null,
      Kind: 1,
      Amount: fatura.total,
      Note: `Pagamento da fatura ${fatura.name}`,
      CategoryId: null,
      WalletId: bankWallet ? bankWallet.Id : null,
      CardId: null,
      PayerMemberId: null,
      Date: new Date().toISOString(),
      IsPaid: true,
      PaidDate: new Date().toISOString().slice(0, 10),
      Obs: '',
    });
    setDefaultDate(null);
    setShowForm(true);
  };

  const handleMovimentoClick = (tx) => {
    // Despesa futura (recorrência configurada) -> abre ModalDespesaFutura
    if (tx.RecurringSourceId && tx.Kind === 1) {
      setFutureExpenseTx(tx);
      return;
    }
    openForm(tx);
  };

  const walletById = {};
  for (const w of data.wallets) walletById[w.Id] = w;

  return (
    <div>
      <HeaderMes year={year} month={month} view={view} onViewChange={onMonthChange} />

      {/* Filtros */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        <FiltroTipo value={filterType} onChange={setFilterType} />
        <div className="d-flex justify-content-center gap-2 w-100">
          <FiltroMetodo value={filterMethod} onChange={setFilterMethod} open={openFilter === 'method'} onToggle={() => toggleFilter('method')} />
          <FiltroStatus value={filterStatus} onChange={setFilterStatus} open={openFilter === 'status'} onToggle={() => toggleFilter('status')} />
        </div>
      </div>

      {/* Faturas */}
      {invoices.length > 0 && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center px-2 mb-2">
            <span style={{ color: '#8C85AA', fontSize: '0.85rem', fontWeight: 500 }}>
              FATURAS
              {filterType === 'credit' && (
                <span className="badge rounded-pill fw-semibold px-2 py-0.5 ms-2" style={{ backgroundColor: '#2D234D', color: '#9675FF', fontSize: '0.68rem' }}>
                  Filtrando por crédito
                </span>
              )}
            </span>
            <a href="/settings/cards" style={{ color: '#9675FF', fontSize: '0.8rem', textDecoration: 'none' }}>Gerenciar cartões</a>
          </div>
          <div className="d-flex flex-column gap-2">
            {invoices.map((f) => {
              const logoUrl = getBankLogoUrl(f.name, f.icon);
              const lim = Number(f.limit || 0);
              const pct = lim > 0 ? Math.round(Math.min(f.total / lim * 100, 100)) : 0;
              const dueDate = new Date(f.dueDate);
              const isExpanded = faturaActionCardId === f.cardId;
              return (
                <div key={f.cardId} className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="d-flex align-items-center gap-3" style={{ cursor: 'pointer' }} onClick={() => setFaturaActionCardId(isExpanded ? null : f.cardId)}>
                    {logoUrl ? (
                      <div className="d-flex align-items-center justify-content-center p-1 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', width: 40, height: 40 }}>
                        <img src={logoUrl} alt={f.name} style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} />
                      </div>
                    ) : (
                      <div className="p-2 rounded-3" style={{ backgroundColor: '#2D234D', color: f.color }}>
                        <PhosphorIcon name={f.icon || 'credit-card'} size={20} />
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
                    <PhosphorIcon name={isExpanded ? 'caret-up' : 'caret-down'} size={16} style={{ color: '#6F688F' }} />
                  </div>
                  {isExpanded && (
                    <div className="d-flex gap-2 mt-3">
                      <button
                        className="btn flex-grow-1 fw-semibold text-white border-0"
                        style={{ backgroundColor: '#2D234D', borderRadius: 12, fontSize: '0.85rem' }}
                        onClick={() => { setFaturaActionCardId(null); setSelectedFatura(f); }}
                      >
                        <span className="me-1"><PhosphorIcon name="list-bullets" size={14} /></span> Detalhar fatura
                      </button>
                      {f.total > 0 && (
                        <button
                          className="btn flex-grow-1 fw-semibold text-white border-0"
                          style={{ background: 'linear-gradient(135deg,#2ED573,#22C55E)', borderRadius: 12, fontSize: '0.85rem' }}
                          onClick={() => { setFaturaActionCardId(null); pagarFatura(f); }}
                        >
                          <span className="me-1"><PhosphorIcon name="check-circle" size={14} /></span> Marcar fatura como paga
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : view === 'calendar' ? (
        <CalendarioMensal
          year={year}
          month={month}
          transactions={filtered}
          onTogglePaid={togglePaid}
          onSelectDay={(day) => {
            const d = new Date(year, month - 1, day);
            openForm(null, d);
          }}
        />
      ) : (
        <div>
          {days.map((dayKey) => {
            const dayDate = new Date(dayKey);
            const dayLabel = dayDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
            const net = groupedByDay[dayKey].reduce((s, t) => s + (t.Kind === 0 ? Number(t.Amount) : t.Kind === 1 ? -Number(t.Amount) : 0), 0);
            return (
              <div key={dayKey} style={{ marginBottom: 20 }}>
                <div className="d-flex align-items-center justify-content-between px-2 mb-2">
                  <div className="text-capitalize fw-bold text-white" style={{ fontSize: '0.95rem' }}>{dayLabel}</div>
                  <div className="small fw-semibold" style={{ color: net >= 0 ? '#3ECF8E' : '#FF9F94' }}>
                    {net >= 0 ? '+' : '-'}{money(Math.abs(net))}
                  </div>
                </div>
                <div className="date-group-container">
                  {groupedByDay[dayKey].map((t, i) => (
                    <div key={t.Id}>
                      {i > 0 && <div className="date-group-divider" />}
                      <MovimentoCard tx={t} wallet={walletById[t.WalletId]} onEdit={(x) => handleMovimentoClick(x)} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {days.length === 0 && (
            <p className="text-center py-5" style={{ color: '#8C85AA' }}>Nenhuma movimentação neste mês.</p>
          )}
        </div>
      )}

      {/* Botão adicionar neste dia (lista) */}
      {view === 'list' && (
        <button className="dashed-add-day-btn w-100" onClick={() => openForm(null, null)}>
          <PhosphorIcon name="plus" size={16} /> Adicionar novo movimento
        </button>
      )}

      {showForm && (
        <div className="position-fixed top-0 bottom-0 start-50 translate-middle-x w-100" style={{ maxWidth: 440, backgroundColor: '#130F24', zIndex: 1200, overflowY: 'auto', padding: '16px 20px' }}>
          <FormDespesa
            tx={editTx}
            wallets={data.wallets}
            categories={data.categories}
            cards={data.cards}
            members={data.members}
            defaultDate={defaultDate}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); load(); }}
          />
        </div>
      )}

      <FaturaModal
        fatura={selectedFatura}
        onClose={() => setSelectedFatura(null)}
        onPagar={(f) => pagarFatura(f)}
      />

      <ModalDespesaFutura
        tx={futureExpenseTx}
        onClose={() => setFutureExpenseTx(null)}
        onConfirmEdit={(tx) => { setFutureExpenseTx(null); openForm(tx); }}
      />
    </div>
  );
}