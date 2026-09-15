const PT_MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const PT_MONTHS_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

function monthLabel(year, month) {
  return PT_MONTHS[month - 1].toUpperCase();
}

function monthLabelShort(year, month) {
  const label = `${PT_MONTHS_SHORT[month - 1]}/${year}`;
  return label;
}

function toUtc(date) {
  if (!date) return null;
  if (date instanceof Date) return new Date(date.toISOString());
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

function utcNow() {
  return new Date();
}

function dayKey(date) {
  return date.getUTCDate();
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function startOfMonth(year, month) {
  return new Date(Date.UTC(year, month - 1, 1));
}

function endOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 1));
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

module.exports = {
  PT_MONTHS,
  PT_MONTHS_SHORT,
  monthLabel,
  monthLabelShort,
  toUtc,
  utcNow,
  dayKey,
  addMonths,
  startOfMonth,
  endOfMonth,
  daysInMonth,
};