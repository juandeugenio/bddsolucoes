import React from 'react';
import PhosphorIcon from './PhosphorIcon.jsx';

export default function ModalDespesaFutura({ tx, onClose, onConfirmEdit }) {
  if (!tx) return null;
  return (
    <div className="future-expense-modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="future-expense-card" style={{ backgroundColor: '#1A142E', borderRadius: 32, padding: '36px 24px 28px 24px', width: '100%', maxWidth: 380, textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, backgroundColor: '#251D42', color: '#9675FF', fontSize: '1.8rem' }}>
          <PhosphorIcon name="arrows-clockwise" size={30} />
        </div>
        <h4 className="text-white fw-bold mb-3" style={{ fontSize: '1.35rem' }}>Despesa futura</h4>
        <p style={{ color: '#8C85AA', fontSize: '0.92rem', lineHeight: 1.5 }} className="mb-4">
          Esta é uma despesa recorrente que você configurou. Você pode editá-la pelo respectivo menu nas configurações e as alterações entrarão em vigor a partir da próxima recorrência.
        </p>
        <button
          className="btn w-100 py-3 text-white fw-bold border-0 mb-3"
          style={{ background: 'linear-gradient(135deg,#B59BFF 0%,#7E52FF 100%)', borderRadius: 24, fontSize: '1.05rem', boxShadow: '0 8px 24px rgba(126,82,255,0.4)' }}
          onClick={() => onConfirmEdit && onConfirmEdit(tx)}
        >
          Editar a despesa
        </button>
        <button
          className="btn btn-link text-decoration-none fw-bold"
          style={{ color: '#9675FF', fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}