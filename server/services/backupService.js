const db = require('../db');

async function buildBackup(tenantId, defaultCurrency) {
  const tenant = await db.queryOne('SELECT * FROM FinanceTenants WHERE Id = ?', [tenantId]);
  const members = await db.query('SELECT * FROM FinanceTenantMembers WHERE TenantId = ?', [tenantId]);
  const wallets = await db.query('SELECT * FROM Wallets WHERE TenantId = ?', [tenantId]);
  const categories = await db.query('SELECT * FROM Categories WHERE TenantId = ?', [tenantId]);
  const limits = await db.query('SELECT * FROM CategoryLimits WHERE TenantId = ?', [tenantId]);
  const transactions = await db.query('SELECT * FROM Transactions WHERE TenantId = ?', [tenantId]);
  const attachments = await db.query('SELECT * FROM Attachments WHERE TenantId = ?', [tenantId]);
  const recurring = await db.query('SELECT * FROM RecurringTransactions WHERE TenantId = ?', [tenantId]);
  const groups = await db.query('SELECT * FROM SplitGroups WHERE TenantId = ?', [tenantId]);

  const groupIds = groups.map((g) => g.Id);
  const membersByGroup = {};
  const entries = [];
  const shares = [];
  if (groupIds.length > 0) {
    const placeholders = groupIds.map(() => '?').join(',');
    const sm = await db.query(`SELECT * FROM SplitMembers WHERE GroupId IN (${placeholders})`, groupIds);
    for (const m of sm) {
      (membersByGroup[m.GroupId] = membersByGroup[m.GroupId] || []).push(m);
    }
    const se = await db.query(`SELECT * FROM SplitEntries WHERE GroupId IN (${placeholders})`, groupIds);
    entries.push(...se);
    const entryIds = se.map((e) => e.Id);
    if (entryIds.length > 0) {
      const ph = entryIds.map(() => '?').join(',');
      const ss = await db.query(`SELECT * FROM SplitShares WHERE EntryId IN (${ph})`, entryIds);
      shares.push(...ss);
    }
  }

  const rates = await db.query('SELECT * FROM ExchangeRates');

  return {
    Format: 'bdd-backup',
    Version: 1,
    ExportedAt: new Date().toISOString(),
    Tenant: tenant,
    Members: members,
    Wallets: wallets,
    Categories: categories,
    CategoryLimits: limits,
    Transactions: transactions.map((t) => ({ ...t })),
    Attachments: attachments.map((a) => ({
      ...a,
      Data: Buffer.from(a.Data || []).toString('base64'),
    })),
    RecurringTransactions: recurring,
    SplitGroups: groups,
    SplitMembers: Object.values(membersByGroup).flat(),
    SplitEntries: entries,
    SplitShares: shares,
    ExchangeRates: rates,
    DefaultCurrency: defaultCurrency,
  };
}

function serialize(doc) {
  return JSON.stringify(doc, null, 2);
}

module.exports = { buildBackup, serialize };