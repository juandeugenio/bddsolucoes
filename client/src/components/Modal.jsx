import React from 'react';

export default function Modal({ open, title, onClose, children, width }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={width ? { maxWidth: width } : {}} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <button className="btn ghost sm" onClick={onClose}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}