import { money, signed } from './components/Money.jsx';

export function formatMoney(value, currency = 'R$') {
  return money(value, currency);
}

export function formatSigned(value, currency = 'R$') {
  return signed(value, currency);
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function parseAmount(str) {
  if (typeof str === 'number') return str;
  const s = String(str || '').replace(/[R$\s€£¥]/g, '').trim();
  if (!s) return null;
  if (s.includes(',') && !s.includes('.')) {
    return parseFloat(s.replace('.', '').replace(',', '.'));
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}