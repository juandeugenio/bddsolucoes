const db = require('../db');
const { uid } = require('../utils/ids');

const Frequency = { Daily: 0, Weekly: 1, Monthly: 2, Yearly: 3 };

function nextDue(from, frequency) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  switch (frequency) {
    case Frequency.Daily:
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case Frequency.Weekly:
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case Frequency.Monthly:
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case Frequency.Yearly:
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d;
}

function toDateOnly(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

async function generateDue(tenantId, asOf) {
  const today = new Date();
  const todayStr = toDateOnly(today);

  // 1) Deleta receitas futuras geradas automaticamente, não pagas e no futuro
  await db.query(
    `DELETE FROM Transactions
     WHERE TenantId = ? AND Kind = 0 AND IsPaid = 0
       AND RecurringSourceId IS NOT NULL AND Date > ?`,
    [tenantId, asOf]
  );

  const rules = await db.query(
    'SELECT * FROM RecurringTransactions WHERE TenantId = ? AND Enabled = 1',
    [tenantId]
  );

  let created = 0;
  for (const rule of rules) {
    const maxDue =
      rule.Kind === 0
        ? new Date(Math.min(asOf.getTime(), today.getTime()))
        : new Date(asOf.getTime());

    // EndDate efetivo ou instalment pattern n/T
    let effectiveEnd = rule.EndDate ? new Date(rule.EndDate) : null;
    if (!effectiveEnd && rule.Note) {
      const m = rule.Note.match(/\((\d+)\/(\d+)\)/);
      if (m) {
        const total = parseInt(m[2], 10);
        const start = new Date(rule.StartDate);
        effectiveEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + (total - 1), start.getUTCDate()));
      }
    }

    let due = new Date(rule.NextDueDate);
    let iterations = 0;
    let createdForRule = 0;
    while (due <= maxDue && iterations < 1000) {
      if (effectiveEnd && due > effectiveEnd) break;

      const dueStr = toDateOnly(due);
      const note = buildOccurrenceNote(rule, due);
      await db.query(
        `INSERT INTO Transactions (Id, TenantId, WalletId, CategoryId, CardId, CounterWalletId,
           RecurringSourceId, PayerMemberId, Kind, IsPaid, PaidDate, Obs, Amount, Currency, Note, Date, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, ?, 0, NULL, NULL, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          uid(),
          tenantId,
          rule.WalletId,
          rule.CategoryId,
          rule.Id,
          rule.Kind,
          rule.Amount,
          rule.Currency,
          note,
          new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate(), 12)),
        ]
      );
      created++;
      createdForRule++;

      const next = nextDue(due, rule.Frequency);
      if (next.getTime() === due.getTime()) {
        break;
      }
      due = next;
      iterations++;
    }

    if (createdForRule > 0) {
      await db.query(
        'UPDATE RecurringTransactions SET NextDueDate = ? WHERE Id = ?',
        [toDateOnly(due), rule.Id]
      );
    }

    if (effectiveEnd && rule.NextDueDate && new Date(rule.NextDueDate) > effectiveEnd) {
      await db.query(
        'UPDATE RecurringTransactions SET Enabled = 0 WHERE Id = ?',
        [rule.Id]
      );
    }
  }

  // 3) Fix legado: recorrências pagas sem PaidDate/Obs -> marca como não pago
  await db.query(
    `UPDATE Transactions SET IsPaid = 0
     WHERE TenantId = ? AND RecurringSourceId IS NOT NULL AND IsPaid = 1
       AND PaidDate IS NULL AND (Obs IS NULL OR Obs = '')`,
    [tenantId]
  );

  return created;
}

function buildOccurrenceNote(rule, dueDate) {
  if (!rule.Note) return rule.Note;
  const m = rule.Note.match(/\((\d+)\/(\d+)\)/);
  if (!m) return rule.Note;
  const total = parseInt(m[2], 10);
  const start = new Date(rule.StartDate);
  const base = rule.Note.replace(/\s*\(\d+\/\d+\)\s*/, '').trim();

  let occurrence;
  switch (rule.Frequency) {
    case Frequency.Daily:
      occurrence = Math.round((dueDate - start) / (24 * 60 * 60 * 1000)) + 1;
      break;
    case Frequency.Weekly:
      occurrence = Math.round((dueDate - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
      break;
    case Frequency.Monthly:
      occurrence = (dueDate.getUTCFullYear() - start.getUTCFullYear()) * 12 + (dueDate.getUTCMonth() - start.getUTCMonth()) + 1;
      break;
    case Frequency.Yearly:
      occurrence = dueDate.getUTCFullYear() - start.getUTCFullYear() + 1;
      break;
    default:
      occurrence = 1;
  }
  return `${base} (${occurrence}/${total})`;
}

async function getAll(tenantId) {
  return db.query(
    `SELECT r.*, w.Name AS WalletName, c.Name AS CategoryName
     FROM RecurringTransactions r
     LEFT JOIN Wallets w ON w.Id = r.WalletId
     LEFT JOIN Categories c ON c.Id = r.CategoryId
     WHERE r.TenantId = ? AND r.Enabled = 1
     ORDER BY r.NextDueDate ASC`,
    [tenantId]
  );
}

async function getUpcoming(tenantId, daysAhead) {
  const limit = new Date();
  limit.setUTCDate(limit.getUTCDate() + daysAhead);
  return db.query(
    `SELECT r.*, w.Name AS WalletName, c.Name AS CategoryName
     FROM RecurringTransactions r
     LEFT JOIN Wallets w ON w.Id = r.WalletId
     LEFT JOIN Categories c ON c.Id = r.CategoryId
     WHERE r.TenantId = ? AND r.Enabled = 1 AND r.NextDueDate <= ?
     ORDER BY r.NextDueDate ASC`,
    [tenantId, toDateOnly(limit)]
  );
}

async function update(tenantId, updated) {
  const existing = await db.queryOne(
    'SELECT * FROM RecurringTransactions WHERE Id = ? AND TenantId = ?',
    [updated.Id, tenantId]
  );
  if (!existing) throw new Error('Recorrência não encontrada.');
  await db.query(
    `UPDATE RecurringTransactions SET
       Note = ?, Amount = ?, Kind = ?, Frequency = ?, NextDueDate = ?,
       CategoryId = ?, WalletId = ?, StartDate = ?, EndDate = ?
     WHERE Id = ? AND TenantId = ?`,
    [
      updated.Note,
      updated.Amount,
      updated.Kind,
      updated.Frequency,
      toDateOnly(updated.NextDueDate),
      updated.CategoryId || null,
      updated.WalletId || null,
      toDateOnly(updated.StartDate),
      updated.EndDate ? toDateOnly(updated.EndDate) : null,
      updated.Id,
      tenantId,
    ]
  );
}

async function remove(tenantId, id) {
  await db.query('DELETE FROM RecurringTransactions WHERE Id = ? AND TenantId = ?', [
    id,
    tenantId,
  ]);
}

module.exports = {
  Frequency,
  nextDue,
  generateDue,
  getAll,
  getUpcoming,
  update,
  remove,
};