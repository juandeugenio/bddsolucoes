import React from 'react';
import PhosphorIcon from './PhosphorIcon.jsx';
import { money } from './Money.jsx';
import { getBankLogoUrl } from '../utils/bankLogo.js';

const KIND_LABELS = {
  0: { label: 'Receita', color: '#3ECF8E' },
  1: { label: 'Despesa', color: '#FF9F94' },
  2: { label: 'Transferência', color: '#00B2FE' },
};

export default function MovimentoCard({ tx, wallet, onEdit }) {
  const isIncome = tx.Kind === 0;
  const isExpense = tx.Kind === 1;
  const isRecurring = Boolean(tx.RecurringSourceId);
  const isShared = !tx.PayerMemberId;
  const sign = isIncome ? '+' : isExpense ? '-' : '';
  const valueColor = isIncome ? '#3ECF8E' : isExpense ? '#FF9F94' : '#00B2FE';

  // Occorrência "n/T" do campo Note, ex: "Internet (2/12)"
  let occurrence = null;
  const occMatch = String(tx.Note || '').match(/\((\d+)\/(\d+)\)/);
  if (occMatch) occurrence = { current: occMatch[1], total: occMatch[2] };

  const logoUrl = wallet ? getBankLogoUrl(wallet.Name, wallet.Icon) : null;

  // Método de pagamento: usa o nome gravado na transação; fallback para o tipo da carteira.
  const methodLabel =
    tx.PaymentMethodName
    || (tx.CardId ? 'Cartão de crédito'
        : wallet && wallet.Kind === 1 ? 'Dinheiro'
        : wallet && wallet.Kind === 2 ? 'Débito em conta'
        : wallet && wallet.Kind === 4 ? 'Pix'
        : wallet && wallet.Kind === 0 ? 'Cartão de crédito'
        : 'Outro');

  const paid = tx.IsPaid === 1 || tx.IsPaid === true;

  return (
    <button className="date-group-item" onClick={() => onEdit && onEdit(tx)}>
      <div className="category-squircle-wrapper" style={{ backgroundColor: tx.CategoryColor ? `${tx.CategoryColor}22` : '#2D234D' }}>
        {logoUrl ? (
          <img src={logoUrl} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
        ) : (
          <PhosphorIcon name={tx.CategoryIcon || (isIncome ? 'currency-dollar' : isExpense ? 'receipt' : 'arrows-clockwise')} size={22} style={{ color: tx.CategoryColor || '#fff' }} />
        )}
        {isShared && (
          <span className="shared-cyan-badge">
            <PhosphorIcon name="users" size={12} />
          </span>
        )}
      </div>

      <div className="flex-grow-1 overflow-hidden">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold text-white text-truncate">{tx.Note || tx.Obs || 'Sem descrição'}</span>
          {isRecurring && <PhosphorIcon name="arrows-clockwise" size={14} style={{ color: '#8C85AA' }} />}
          {occurrence && (
            <span className="badge rounded-pill px-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#B9B2D6', fontSize: '0.62rem' }}>
              {occurrence.current}/{occurrence.total}
            </span>
          )}
          <span
            className="badge rounded-pill px-2 py-0.5"
            style={{
              backgroundColor: paid ? 'rgba(62,207,142,0.15)' : 'rgba(255,92,77,0.15)',
              color: paid ? '#3ECF8E' : '#FF9F94',
              fontSize: '0.62rem',
            }}
          >
            {paid ? 'Pago' : 'Pendente'}
          </span>
        </div>
        <div className="small text-truncate" style={{ color: '#6F688F' }}>
          {tx.CategoryName || (wallet ? wallet.Name : 'Geral')}
          {tx.Obs ? ` · ${tx.Obs}` : ''}
        </div>
      </div>

      <div className="text-end flex-shrink-0">
        <div className="fw-bold" style={{ fontSize: '0.95rem', color: valueColor }}>
          {sign}{money(Math.abs(tx.Amount))}
        </div>
        <span className="badge rounded-pill px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#8C85AA', fontSize: '0.6rem' }}>
          {methodLabel}
        </span>
      </div>
    </button>
  );
}