import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { Donut, TendenciaLineChart, GroupedBarChart, UserComparisonBarChart, DailyMovementsChart } from '../components/Charts.jsx';
import { useToast } from '../components/Toast.jsx';
import { money } from '../components/Money.jsx';
import { getBankLogoUrl } from '../utils/bankLogo.js';

const TABS = [
  { v: 'diarios', label: 'Movimentos Diários' },
  { v: 'categorias', label: 'Categorias' },
  { v: 'metodos', label: 'Métodos pagamento' },
  { v: 'usuarios', label: 'Usuários' },
  { v: 'tendencia', label: 'Tendência' },
];

export default function Analytics() {
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState(() => {
    const valid = TABS.find((t) => t.v === tabParam);
    return valid ? tabParam : 'categorias';
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const goTab = (v) => {
    setTab(v);
    navigate(v === 'categorias' ? '/analytics' : `/analytics/${v}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints = {
        categorias: `/analytics/categories?year=${year}&month=${month}`,
        metodos: `/analytics/methods?year=${year}&month=${month}`,
        usuarios: `/analytics/users?year=${year}&month=${month}`,
        tendencia: `/analytics/trend?year=${year}&month=${month}`,
        diarios: `/analytics/daily?year=${year}&month=${month}`,
      };
      const result = await api.get(endpoints[tab]);
      setData(result);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [year, month, tab, showToast]);

  useEffect(() => { load(); }, [load]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const capitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const prev = () => { let m = month - 1, y = year; if (m === 0) { m = 12; y--; } setYear(y); setMonth(m); };
  const next = () => { let m = month + 1, y = year; if (m === 13) { m = 1; y++; } setYear(y); setMonth(m); };

  return (
    <div>
      {/* Nav header */}
      <div className="d-flex align-items-center justify-content-center gap-3 mb-2">
        <button onClick={prev} title="Anterior" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.75 }}>
          <PhosphorIcon name="caret-left" size={20} />
        </button>
        <h4 className="mb-0 text-white fw-bold" style={{ fontSize: '1.15rem' }}>
          {tab === 'tendencia' ? 'Últimos 6 Meses' : `${capitalized} de ${year}`}
        </h4>
        <button onClick={next} title="Próximo" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.75 }}>
          <PhosphorIcon name="caret-right" size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs-container">
        {TABS.map((t) => (
          <button key={t.v} className={`analytics-tab-item ${tab === t.v ? 'active' : ''}`} onClick={() => goTab(t.v)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <TabContent tab={tab} data={data} year={year} month={month} />
      )}
    </div>
  );
}

function TabContent({ tab, data, year, month }) {
  if (!data) return <div className="text-center py-5 text-muted">Sem dados</div>;

  if (tab === 'diarios') {
    const movements = data.movements || [];
    const totalIncome = movements.reduce((s, m) => s + m.income, 0);
    const totalExpense = movements.reduce((s, m) => s + m.expense, 0);
    return (
      <div>
        <div className="card p-4 border-0 mb-3" style={{ backgroundColor: '#161129', borderRadius: 28 }}>
          <div className="d-flex justify-content-between mb-3">
            <div>
              <div className="text-uppercase small" style={{ color: '#8C85AA', fontSize: '0.72rem', fontWeight: 600 }}>RECEITAS TOTAIS</div>
              <div className="fw-bold" style={{ color: '#3ECF8E', fontSize: '1.3rem' }}>+{money(totalIncome)}</div>
            </div>
            <div className="text-end">
              <div className="text-uppercase small" style={{ color: '#8C85AA', fontSize: '0.72rem', fontWeight: 600 }}>DESPESAS TOTAIS</div>
              <div className="fw-bold" style={{ color: '#FF9500', fontSize: '1.3rem' }}>-{money(totalExpense)}</div>
            </div>
          </div>
          <DailyMovementsChart days={movements} />
        </div>
      </div>
    );
  }

  if (tab === 'categorias') {
    const cats = data.categories || [];
    const total = cats.reduce((s, c) => s + c.spent, 0);
    return (
      <div>
        <div className="card p-4 border-0 mb-3" style={{ backgroundColor: '#161129', borderRadius: 28 }}>
          <Donut data={cats.map((c) => ({ color: c.color || '#9675FF', amount: c.spent }))} size={210} centerLabel={money(total)} centerSub="DESPESAS TOTAIS" />
        </div>
        <div className="date-group-container">
          {cats.map((c, i) => (
            <div key={i}>
              {i > 0 && <div className="date-group-divider" />}
              <div className="date-group-item" style={{ cursor: 'default' }}>
                <div className="settings-squircle" style={{ backgroundColor: `${c.color || '#9675FF'}22` }}>
                  <PhosphorIcon name={c.icon || 'tag'} size={20} style={{ color: c.color || '#9675FF' }} />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold text-white">{c.name}</div>
                  {c.hasLimit && (
                    <div className="progress mt-1" style={{ height: 4, maxWidth: 140 }}>
                      <div className="progress-bar" style={{ width: `${c.usedPct * 100}%`, backgroundColor: c.overLimit ? '#FF5C4D' : '#9675FF', height: 4, borderRadius: 2 }} />
                    </div>
                  )}
                </div>
                <div className="text-end">
                  <div className="fw-semibold text-white">{money(c.spent)}</div>
                  <div className="small" style={{ color: '#8C85AA' }}>
                    {total > 0 ? `${Math.round((c.spent / total) * 100)}%` : '0%'}
                  </div>
                </div>
                <PhosphorIcon name="caret-right" size={14} style={{ color: '#6F688F' }} />
              </div>
            </div>
          ))}
        </div>
        <a href="/categories" className="d-block text-center small" style={{ color: '#9675FF' }}>Ver todas as categorias</a>
      </div>
    );
  }

  if (tab === 'metodos') {
    const methods = data.methods || [];
    const total = methods.reduce((s, m) => s + m.amount, 0);
    const iconMap = { 0: 'credit-card', 4: 'currency-dollar', 2: 'bank', 1: 'coins' };
    return (
      <div>
        <div className="card p-4 border-0 mb-3" style={{ backgroundColor: '#161129', borderRadius: 28 }}>
          <Donut data={methods.map((m) => ({ color: m.color, amount: m.amount }))} size={210} centerLabel={money(total)} centerSub="DESPESAS TOTAIS" />
        </div>
        <div className="date-group-container">
          {methods.map((m, i) => (
            <div key={i}>
              {i > 0 && <div className="date-group-divider" />}
              <div className="date-group-item" style={{ cursor: 'default' }}>
                <div className="settings-squircle" style={{ backgroundColor: '#1A344A' }}>
                  <PhosphorIcon name={iconMap[m.kind] || 'tag'} size={20} style={{ color: '#00B2FE' }} />
                </div>
                <div className="flex-grow-1"><div className="fw-semibold text-white">{m.label}</div></div>
                <div className="text-end">
                  <div className="fw-semibold text-white">{money(m.amount)}</div>
                  <div className="small" style={{ color: '#8C85AA' }}>
                    {total > 0 ? `${Math.round((m.amount / total) * 100)}%` : '0%'}
                  </div>
                </div>
                <PhosphorIcon name="caret-right" size={14} style={{ color: '#6F688F' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'usuarios') {
    const members = data.members || [];
    const comparison = data.comparison || [];
    const total = members.reduce((s, m) => s + m.expense, 0);
    const colors = ['#9675FF', '#00B2FE'];
    return (
      <div>
        <div className="card p-4 border-0 mb-3" style={{ backgroundColor: '#161129', borderRadius: 28 }}>
          <Donut data={members.map((m, i) => ({ color: colors[i % 2], amount: m.expense }))} size={210} centerLabel={money(total)} centerSub="DESPESAS TOTAIS" />
        </div>
        <div className="date-group-container">
          {members.map((m, i) => (
            <div key={i}>
              {i > 0 && <div className="date-group-divider" />}
              <div className="date-group-item" style={{ cursor: 'default' }}>
                <div className="avatar-circle" style={{ background: colors[i % 2] }}>
                  {String(m.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold text-white">{m.name}</div>
                </div>
                <div className="text-end">
                  <div className="fw-semibold text-white">{money(m.expense)}</div>
                  <div className="small" style={{ color: '#8C85AA' }}>
                    {total > 0 ? `${Math.round((m.expense / total) * 100)}%` : '0%'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {comparison.length > 0 && (
          <div className="card p-4 border-0" style={{ backgroundColor: '#161129', borderRadius: 28 }}>
            <div className="text-uppercase small mb-3" style={{ color: '#8C85AA', fontSize: '0.72rem', fontWeight: 600 }}>Despesas por categoria</div>
            <UserComparisonBarChart categories={comparison} />
          </div>
        )}
      </div>
    );
  }

  if (tab === 'tendencia') {
    const series = data.series || [];
    const limit = data.overallLimit || 0;
    return (
      <div>
        <div className="card p-4 border-0 mb-3" style={{ backgroundColor: '#161129', borderRadius: 28 }}>
          <div className="text-uppercase small mb-3" style={{ color: '#8C85AA', fontSize: '0.72rem', fontWeight: 600 }}>Últimos 6 Meses</div>
          <TendenciaLineChart
            income={series.map((s) => s.income)}
            expense={series.map((s) => s.expense)}
            limit={limit}
            labels={series.map((s) => s.label)}
          />
        </div>
        {series.map((s, i) => (
          <div key={i} className="mb-3">
            <div className="fw-bold text-white px-2 mb-2" style={{ fontSize: '0.9rem' }}>{s.label.toLowerCase()}</div>
            <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
              <div className="row text-center g-2">
                <div className="col-4 border-end" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="small" style={{ color: '#8C85AA', fontSize: '0.68rem' }}>DESPESAS</div>
                  <div className="fw-bold" style={{ color: '#FF5C4D' }}>{money(s.expense)}</div>
                </div>
                <div className="col-4 border-end" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="small" style={{ color: '#8C85AA', fontSize: '0.68rem' }}>RENDAS</div>
                  <div className="fw-bold" style={{ color: '#3ECF8E' }}>+{money(s.income)}</div>
                </div>
                <div className="col-4">
                  <div className="small" style={{ color: '#8C85AA', fontSize: '0.68rem' }}>SALDO</div>
                  <div className="fw-bold" style={{ color: s.net < 0 ? '#FF5C4D' : '#22C55E' }}>
                    {s.net >= 0 ? '+' : '-'}{money(Math.abs(s.net))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}