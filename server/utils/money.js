function getCultureForCurrency(currency) {
  if (currency === '$') return 'en-US';
  return 'pt-BR';
}

function formatNumber(value, decimals = 2, currency = 'R$') {
  const culture = getCultureForCurrency(currency);
  const opts = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  if (culture === 'en-US') {
    return new Intl.NumberFormat('en-US', opts).format(value);
  }
  return new Intl.NumberFormat('pt-BR', opts).format(value);
}

function money(value, currency = 'R$') {
  const formatted = formatNumber(value, 2, currency);
  if (currency === '$') return `$ ${formatted}`;
  if (currency === '€') return `€ ${formatted}`;
  return `${currency} ${formatted}`;
}

function signed(value, currency = 'R$') {
  return `${value >= 0 ? '+' : '-'} ${money(Math.abs(value), currency)}`;
}

function rawFormatted(value) {
  return formatNumber(value, 2);
}

function stripSymbols(input) {
  return String(input)
    .replace(/[R$\s€£¥.]/g, '')
    .replace(',', '.');
}

function tryParseAmount(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return input;
  let s = String(input).trim();
  if (s === '') return null;

  // normaliza: remove símbolos de moeda e espaços
  const normalized = stripSymbols(s);

  // tenta como número direto (ex: 1234.56)
  let parsed = Number(normalized);
  if (Number.isFinite(parsed)) return parsed;

  // tenta formatos pt-BR (1.234,56) e en-US (1,234.56)
  const commaAsDecimal = s.includes(',');
  const dotAsDecimal = s.includes('.') && !commaAsDecimal;
  if (commaAsDecimal) {
    const parts = s.split(',');
    const intPart = parts[0].replace(/[^0-9]/g, '');
    const decPart = parts[1].replace(/[^0-9]/g, '');
    if (decPart.length <= 2) {
      parsed = Number(`${intPart}.${decPart}`);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  if (dotAsDecimal) {
    parsed = Number(s.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

module.exports = { getCultureForCurrency, formatNumber, money, signed, rawFormatted, tryParseAmount };