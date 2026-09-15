const db = require('../db');
const authService = require('./authService');
const { uid } = require('../utils/ids');

const CommonCurrencies = ['EUR', 'USD', 'BRL', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN', 'CNY', 'INR'];

async function getDefaultCurrency(userId) {
  const user = await authService.getUserById(userId);
  return user ? user.DefaultCurrency || 'R$' : 'R$';
}

async function setDefaultCurrency(userId, currency) {
  const cur = String(currency || '').toUpperCase();
  await db.query('UPDATE Users SET DefaultCurrency = ? WHERE Id = ?', [cur, userId]);
}

async function getRates() {
  return db.query(
    'SELECT * FROM ExchangeRates ORDER BY FromCurrency ASC, ToCurrency ASC, Date DESC'
  );
}

async function setRate(from, to, rate, date, createdByUserId = null) {
  from = String(from || '').toUpperCase();
  to = String(to || '').toUpperCase();
  if (from === to) throw new Error('Não é possível definir uma taxa entre moedas iguais.');
  if (Number(rate) <= 0) throw new Error('A taxa deve ser maior que zero.');
  const d = date || new Date().toISOString().slice(0, 10);
  const existing = await db.queryOne(
    'SELECT * FROM ExchangeRates WHERE FromCurrency = ? AND ToCurrency = ? AND Date = ?',
    [from, to, d]
  );
  if (existing) {
    await db.query(
      'UPDATE ExchangeRates SET Rate = ?, UpdatedAt = UTC_TIMESTAMP() WHERE Id = ?',
      [rate, existing.Id]
    );
    return existing.Id;
  }
  const id = uid();
  await db.query(
    `INSERT INTO ExchangeRates (Id, FromCurrency, ToCurrency, Rate, Date, Source, CreatedByUserId, UpdatedAt)
     VALUES (?, ?, ?, ?, ?, 'manual', ?, UTC_TIMESTAMP())`,
    [id, from, to, rate, d, createdByUserId]
  );
  return id;
}

async function deleteRate(id, userId = null) {
  // Auditoria F4: apenas quem criou a taxa (ou admin) pode excluí-la.
  if (userId) {
    const rate = await db.queryOne(
      'SELECT * FROM ExchangeRates WHERE Id = ?',
      [id]
    );
    if (!rate) throw new Error('Taxa não encontrada.');
    if (rate.CreatedByUserId && rate.CreatedByUserId !== userId) {
      throw new Error('Você não tem permissão para excluir esta taxa.');
    }
  }
  await db.query('DELETE FROM ExchangeRates WHERE Id = ?', [id]);
}

async function findRate(from, to, date) {
  if (!date) {
    return db.queryOne(
      'SELECT * FROM ExchangeRates WHERE FromCurrency = ? AND ToCurrency = ? ORDER BY Date DESC LIMIT 1',
      [from, to]
    );
  }
  return db.queryOne(
    'SELECT * FROM ExchangeRates WHERE FromCurrency = ? AND ToCurrency = ? AND Date <= ? ORDER BY Date DESC LIMIT 1',
    [from, to, date]
  );
}

async function convert(amount, from, to, date) {
  if (from === to) return Number(amount);
  const direct = await findRate(from, to, date);
  if (direct) return Number(amount) * Number(direct.Rate);
  // via EUR
  const f = await findRate(from, 'EUR', date);
  const t = await findRate('EUR', to, date);
  if (f && t) return Number(amount) * Number(f.Rate) * Number(t.Rate);
  return Number(amount);
}

module.exports = {
  CommonCurrencies,
  getDefaultCurrency,
  setDefaultCurrency,
  getRates,
  setRate,
  deleteRate,
  convert,
  findRate,
};