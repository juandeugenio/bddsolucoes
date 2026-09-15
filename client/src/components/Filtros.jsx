import React from 'react';
import PhosphorIcon from './PhosphorIcon.jsx';

export function FiltroTipo({ value, onChange }) {
  return (
    <div className="segmented-control-container segmented-control-stretch">
      {[
        { v: 'all', label: 'Tudo' },
        { v: 'expense', label: 'Despesas' },
        { v: 'income', label: 'Rendas' },
      ].map((f) => (
        <button key={f.v} className={`segmented-control-btn ${value === f.v ? 'active' : ''}`} onClick={() => onChange(f.v)}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function FiltroMetodo({ value, onChange, open, onToggle }) {
  const options = [
    { v: 'all', label: 'Todos' },
    { v: '4', label: 'Pix', icon: 'currency-dollar' },
    { v: '0', label: 'Crédito', icon: 'credit-card' },
    { v: '1', label: 'Dinheiro', icon: 'coins' },
    { v: '2', label: 'Débito em conta', icon: 'bank' },
    { v: '3', label: 'Outro', icon: 'tag-simple' },
  ];
  const current = options.find((o) => o.v === value);

  return (
    <div style={{ position: 'relative' }}>
      <button className="method-filter-btn" onClick={onToggle}>
        <PhosphorIcon name="funnel-simple" size={14} />
        <span>{current?.label || 'Método'}</span>
        <PhosphorIcon name={open ? 'caret-up' : 'caret-down'} size={12} />
      </button>
      {open && (
        <div className="method-popover-dropdown" style={{ top: 44, left: 0 }}>
          {options.map((o) => (
            <div
              key={o.v}
              className={`method-popover-item ${value === o.v ? 'active' : ''}`}
              onClick={() => { onChange(o.v); onToggle(); }}
            >
              <span className="d-flex align-items-center gap-2">
                <PhosphorIcon name={o.icon || 'check'} size={16} className="item-icon" />
                {o.label}
              </span>
              {value === o.v && <PhosphorIcon name="check" size={14} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FiltroStatus({ value, onChange, open, onToggle }) {
  const options = [
    { v: 'all', label: 'Todos' },
    { v: 'paid', label: 'Pago' },
    { v: 'pending', label: 'Pendente' },
  ];
  const current = options.find((o) => o.v === value);

  return (
    <div style={{ position: 'relative' }}>
      <button className="method-filter-btn" onClick={onToggle}>
        <PhosphorIcon name="check-circle" size={14} />
        <span>{current?.label || 'Status'}</span>
        <PhosphorIcon name={open ? 'caret-up' : 'caret-down'} size={12} />
      </button>
      {open && (
        <div className="method-popover-dropdown" style={{ top: 44, right: 0 }}>
          {options.map((o) => (
            <div
              key={o.v}
              className={`method-popover-item ${value === o.v ? 'active' : ''}`}
              onClick={() => { onChange(o.v); onToggle(); }}
            >
              <span>{o.label}</span>
              {value === o.v && <PhosphorIcon name="check" size={14} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}