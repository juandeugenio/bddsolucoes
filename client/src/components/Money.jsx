import React from 'react';

export function formatNumber(value, decimals = 2, currency = 'R$') {
  const n = Number(value || 0);
  return n.toLocaleString(currency === '$' ? 'en-US' : 'pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function money(value, currency = 'R$') {
  const formatted = formatNumber(value, 2, currency);
  if (currency === '$') return `$ ${formatted}`;
  if (currency === '€') return `€ ${formatted}`;
  return `${currency} ${formatted}`;
}

export function signed(value, currency = 'R$') {
  return `${value >= 0 ? '+' : '-'} ${money(Math.abs(value), currency)}`;
}