import React from 'react';
import PhosphorIcon from './PhosphorIcon.jsx';

export default function HeaderMes({ year, month, view, onViewChange }) {
  const label = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);

  const prev = () => {
    let m = month - 1;
    let y = year;
    if (m === 0) { m = 12; y--; }
    onViewChange(y, m);
  };
  const next = () => {
    let m = month + 1;
    let y = year;
    if (m === 13) { m = 1; y++; }
    onViewChange(y, m);
  };

  return (
    <div className="d-flex align-items-center justify-content-between mb-3">
      <div className="d-flex align-items-center gap-2">
        <button
          onClick={prev}
          title="Mês anterior"
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.75 }}
        >
          <PhosphorIcon name="caret-left" size={20} />
        </button>
        <h4 className="mb-0 text-white fw-bold" style={{ fontSize: '1.05rem', letterSpacing: '-0.2px' }}>
          {capitalized} de {year}
        </h4>
        <button
          onClick={next}
          title="Próximo mês"
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.75 }}
        >
          <PhosphorIcon name="caret-right" size={20} />
        </button>
      </div>
      <button
        onClick={() => onViewChange && onViewChange(null, null, view === 'list' ? 'calendar' : 'list')}
        title={view === 'list' ? 'Ver no calendário' : 'Ver em lista'}
        style={{
          width: 52,
          height: 52,
          borderRadius: '16px',
          backgroundColor: '#1D1735',
          border: '1px solid rgba(255,255,255,0.06)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <PhosphorIcon name={view === 'list' ? 'calendar-blank' : 'list'} size={22} />
      </button>
    </div>
  );
}