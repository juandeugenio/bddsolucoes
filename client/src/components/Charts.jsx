import React from 'react';
import { money } from './Money.jsx';

// ===== Donut (replica ChartDonut do original: arc stroke-width 11, gaps 2°) =====
export function Donut({ data, size = 210, centerLabel, centerSub }) {
  const total = data.reduce((s, d) => s + Number(d.amount || 0), 0);
  const viewBox = 120;
  const r = 50;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;

  if (total <= 0) {
    return (
      <div className="text-center py-4">
        <svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2D234D" strokeWidth="11" />
        </svg>
        <div className="small text-muted">Sem dados para exibir.</div>
      </div>
    );
  }

  const segments = data.filter((d) => Number(d.amount || 0) > 0);
  const gap = 2; // graus de separação
  const gapFrac = gap / 360;

  let cumulative = 0;
  const arcs = segments.map((d) => {
    const frac = Number(d.amount) / total;
    const dash = Math.max(frac * circumference - gapFrac * circumference, 0.5);
    const seg = { ...d, dash, offset: cumulative };
    cumulative += frac * circumference;
    return seg;
  });

  return (
    <div className="d-flex align-items-center justify-content-center gap-3">
      <div className="position-relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`}>
          {arcs.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="11"
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="position-absolute w-100 text-center" style={{ top: '50%', transform: 'translateY(-50%)' }}>
          {centerSub && <div className="text-uppercase small" style={{ color: '#8C85AA', fontSize: '0.62rem', fontWeight: 600 }}>{centerSub}</div>}
          {centerLabel && <div className="fw-bold text-white" style={{ fontSize: '1.1rem' }}>{centerLabel}</div>}
        </div>
      </div>
    </div>
  );
}

// ===== Barras simples =====
export function Bars({ data, height = 180 }) {
  const max = Math.max(...data.map((d) => Number(d.value || 0)), 1);
  const w = 660;
  const h = height;
  const pad = 30;
  const bw = (w - pad * 2) / data.length * 0.6;
  const stepX = (w - pad * 2) / data.length;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = pad + (h - pad * 2) * (1 - f);
        return <line key={f} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />;
      })}
      {data.map((d, i) => {
        const bh = Math.max((Math.abs(Number(d.value || 0)) / max) * (h - pad * 2), 2);
        const x = pad + i * stepX + (stepX - bw) / 2;
        const y = h - pad - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx={3} fill={d.color || '#9675FF'} />
            <text x={x + bw / 2} y={h - 8} textAnchor="middle" fontSize="11" fill="#8C85AA">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ===== Linha (tendência com 2 séries + linha de limite) =====
export function TendenciaLineChart({ income, expense, limit, labels }) {
  const w = 660;
  const h = 220;
  const pad = 30;
  const data = expense;
  const all = [...income, ...expense, limit || 0].map(Number);
  const max = Math.max(...all, 1) * 1.15;
  const min = 0;
  const range = max - min;
  const stepX = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const xLabels = labels || data.map((_, i) => data[i].label);

  const toXY = (arr) => arr.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + ((max - Number(v || 0)) / range) * (h - pad * 2);
    return [x, y];
  });
  const expPts = toXY(expense);
  const incPts = toXY(income);
  const path = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = (pts) => `${path(pts)} L ${pts[pts.length - 1][0]} ${h - pad} L ${pts[0][0]} ${h - pad} Z`;
  const limitY = limit ? pad + ((max - Number(limit)) / range) * (h - pad * 2) : null;

  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF9500" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FF9500" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ECF8E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3ECF8E" stopOpacity="0" />
          </linearGradient>
        </defs>
        {expPts.length > 1 && <path d={area(expPts)} fill="url(#expGrad)" />}
        {incPts.length > 1 && <path d={area(incPts)} fill="url(#incGrad)" />}
        {expPts.length > 1 && <path d={path(expPts)} fill="none" stroke="#FF9500" strokeWidth="2.5" />}
        {incPts.length > 1 && <path d={path(incPts)} fill="none" stroke="#3ECF8E" strokeWidth="2.5" />}
        {expPts.map((p, i) => <circle key={`e${i}`} cx={p[0]} cy={p[1]} r="4" fill="#FF9500" stroke="#19132E" strokeWidth="1.5" />)}
        {incPts.map((p, i) => <circle key={`i${i}`} cx={p[0]} cy={p[1]} r="4" fill="#3ECF8E" stroke="#19132E" strokeWidth="1.5" />)}
        {limitY !== null && (
          <g>
            <line x1={pad} y1={limitY} x2={w - pad} y2={limitY} stroke="#7E52FF" strokeWidth="2" strokeDasharray="5 4" opacity="0.8" />
            <text x={w - pad} y={limitY - 6} textAnchor="end" fontSize="11" fill="#fff">{money(limit)}</text>
          </g>
        )}
        {data.map((_, i) => (
          <text key={i} x={pad + i * stepX} y={h - 8} textAnchor="middle" fontSize="11" fill="#6B6282">
            {(xLabels[i] || '').toLowerCase() + '.'}
          </text>
        ))}
      </svg>
      <div className="d-flex justify-content-center gap-4 mt-2">
        <div className="d-flex align-items-center gap-2 small" style={{ color: '#8C85AA' }}>
          <span style={{ width: 12, height: 3, background: '#FF9500', borderRadius: 2, display: 'inline-block' }} /> Despesas
        </div>
        <div className="d-flex align-items-center gap-2 small" style={{ color: '#8C85AA' }}>
          <span style={{ width: 12, height: 3, background: '#3ECF8E', borderRadius: 2, display: 'inline-block' }} /> Rendas
        </div>
      </div>
    </div>
  );
}

// ===== Barras duplas (comparação usuários) =====
export function UserComparisonBarChart({ categories, firstColor = '#9675FF', secondColor = '#00B2FE' }) {
  const w = 660;
  const h = 220;
  const pad = 30;
  const max = Math.max(...categories.map((c) => Math.max(c.firstMember, c.secondMember)), 1) * 1.15;
  const stepX = categories.length > 0 ? (w - pad * 2) / categories.length : 0;
  const bw = (stepX * 0.6) / 2;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = pad + (h - pad * 2) * (1 - f);
        return <line key={f} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />;
      })}
      {categories.map((c, i) => {
        const h1 = Math.max((c.firstMember / max) * (h - pad * 2), 2);
        const h2 = Math.max((c.secondMember / max) * (h - pad * 2), 2);
        const x0 = pad + i * stepX + (stepX - bw * 2) / 2;
        return (
          <g key={i}>
            <rect x={x0} y={h - pad - h1} width={bw} height={h1} rx={3} fill={firstColor} />
            <rect x={x0 + bw + 2} y={h - pad - h2} width={bw} height={h2} rx={3} fill={secondColor} />
            <text x={x0 + bw} y={h - 8} textAnchor="middle" fontSize="9.5" fill="#8C85AA">{c.categoryName}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ===== Barras duplas por mês (renda/despesa/saldo) =====
export function GroupedBarChart({ series }) {
  const w = 660;
  const h = 220;
  const pad = 30;
  const max = Math.max(...series.map((s) => Math.max(Math.abs(s.income), Math.abs(s.expense), Math.abs(s.net))), 1) * 1.15;
  const stepX = series.length > 0 ? (w - pad * 2) / series.length : 0;
  const bw = (stepX * 0.6) / 3;

  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const y = pad + (h - pad * 2) * (1 - f);
          return <line key={f} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />;
        })}
        {series.map((s, i) => {
          const x0 = pad + i * stepX + (stepX - bw * 3) / 2;
          const hInc = Math.max((Math.abs(s.income) / max) * (h - pad * 2), 2);
          const hExp = Math.max((Math.abs(s.expense) / max) * (h - pad * 2), 2);
          const netY = pad + ((max - s.net) / (max * 2)) * (h - pad * 2);
          return (
            <g key={i}>
              <rect x={x0} y={h - pad - hInc} width={bw} height={hInc} rx={2} fill="#3ECF8E" />
              <rect x={x0 + bw + 2} y={h - pad - hExp} width={bw} height={hExp} rx={2} fill="#F06040" />
              <line x1={x0 + bw * 2 + 4} y1={netY} x2={x0 + bw * 3 + 4} y2={netY} stroke="#A080F0" strokeWidth="3" strokeLinecap="round" />
              <text x={x0 + bw * 1.5} y={h - 8} textAnchor="middle" fontSize="10" fill="#8C85AA">{s.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="d-flex justify-content-center gap-4 mt-2">
        <span className="d-flex align-items-center gap-1 small" style={{ color: '#8C85AA' }}><span style={{ width: 10, height: 10, background: '#3ECF8E', borderRadius: 2 }} /> Renda</span>
        <span className="d-flex align-items-center gap-1 small" style={{ color: '#8C85AA' }}><span style={{ width: 10, height: 10, background: '#F06040', borderRadius: 2 }} /> Despesa</span>
        <span className="d-flex align-items-center gap-1 small" style={{ color: '#8C85AA' }}><span style={{ width: 14, height: 3, background: '#A080F0', borderRadius: 2 }} /> Saldo</span>
      </div>
    </div>
  );
}

// ===== Movimentos diários (2 polylines renda/despesa) =====
export function DailyMovementsChart({ days }) {
  const w = 660;
  const h = 220;
  const pad = 30;
  const max = Math.max(...days.map((d) => Math.max(d.income, d.expense)), 1) * 1.2;
  const stepX = days.length > 1 ? (w - pad * 2) / (days.length - 1) : 0;

  const pts = (fn) => days.map((d, i) => [pad + i * stepX, pad + ((max - fn(d)) / max) * (h - pad * 2)]);
  const incPts = pts((d) => d.income);
  const expPts = pts((d) => d.expense);
  const path = (list) => list.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const xTicks = [1, 5, 10, 15, 20, 25, 30, 31].filter((d) => d <= days.length);

  const compact = (v) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(2)} mi`;
    if (v >= 1000) return `${(v / 1000).toFixed(2)} mil`;
    return v.toFixed(0);
  };

  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {[20, 58, 96, 134, 172].map((y) => (
          <g key={y}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />
            <text x={pad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6B6282">
              {compact((max / (h - pad * 2)) * (h - pad - y + pad) * 0 + ((max / 172) * (172 - y)))}
            </text>
          </g>
        ))}
        <polyline points={incPts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#3ECF8E" strokeWidth="2.5" />
        <polyline points={expPts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#FF9500" strokeWidth="2.5" />
        {incPts.map((p, i) => <circle key={`i${i}`} cx={p[0]} cy={p[1]} r="3" fill="#3ECF8E" />)}
        {expPts.map((p, i) => <circle key={`e${i}`} cx={p[0]} cy={p[1]} r="3" fill="#FF9500" />)}
        {xTicks.map((t) => {
          const idx = t - 1;
          return <text key={t} x={pad + idx * stepX} y={202} textAnchor="middle" fontSize="10" fill="#6B6282">{t}</text>;
        })}
      </svg>
      <div className="d-flex justify-content-center gap-4 mt-2">
        <span className="d-flex align-items-center gap-1 small" style={{ color: '#8C85AA' }}><span style={{ width: 14, height: 3, background: '#3ECF8E' }} /> Rendas</span>
        <span className="d-flex align-items-center gap-1 small" style={{ color: '#8C85AA' }}><span style={{ width: 14, height: 3, background: '#FF9500' }} /> Despesas</span>
      </div>
    </div>
  );
}