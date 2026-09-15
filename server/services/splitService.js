const db = require('../db');
const { uid } = require('../utils/ids');

function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function splitEvenly(amount, memberIds) {
  const n = memberIds.length;
  if (n === 0) return [];
  const each = Math.floor((amount * 100) / n) / 100;
  let remainder = round2(amount - each * n);
  const result = memberIds.map((id, i) => {
    let amt = each;
    if (i < Math.round(remainder * 100)) {
      amt = round2(amt + 0.01);
    }
    return { memberId: id, amount: amt };
  });
  // corrige possível diferença de centavos por arredondamento
  const total = round2(result.reduce((s, x) => s + x.amount, 0));
  if (total !== round2(amount)) {
    result[0].amount = round2(result[0].amount + round2(round2(amount) - total));
  }
  return result;
}

function simplifyDebts(balances) {
  const debtors = balances
    .filter((b) => Number(b.net || 0) < -0.005)
    .map((b) => ({ id: b.memberId, name: b.name, amount: round2(-b.net) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => Number(b.net || 0) > 0.005)
    .map((b) => ({ id: b.memberId, name: b.name, amount: round2(b.net) }))
    .sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay >= 0.005) {
      settlements.push({
        from: debtors[i].id,
        fromName: debtors[i].name,
        to: creditors[j].id,
        toName: creditors[j].name,
        amount: round2(pay),
      });
    }
    debtors[i].amount = round2(debtors[i].amount - pay);
    creditors[j].amount = round2(creditors[j].amount - pay);
    if (debtors[i].amount <= 0.005) i++;
    if (creditors[j].amount <= 0.005) j++;
  }
  return settlements;
}

async function getGroupDetail(tenantId, groupId) {
  const group = await db.queryOne(
    'SELECT * FROM SplitGroups WHERE Id = ? AND TenantId = ?',
    [groupId, tenantId]
  );
  if (!group) throw new Error('Grupo não encontrado.');

  const members = await db.query(
    'SELECT * FROM SplitMembers WHERE GroupId = ? ORDER BY CreatedAt ASC',
    [groupId]
  );
  const entries = await db.query(
    `SELECT e.*, p.Name AS PayerName FROM SplitEntries e
     LEFT JOIN SplitMembers p ON p.Id = e.PayerMemberId
     WHERE e.GroupId = ? ORDER BY e.Date DESC`,
    [groupId]
  );
  const shares = await db.query(
    'SELECT * FROM SplitShares WHERE EntryId IN (SELECT Id FROM SplitEntries WHERE GroupId = ?)',
    [groupId]
  );

  const balances = members.map((m) => {
    const paid = entries
      .filter((e) => e.PayerMemberId === m.Id)
      .reduce((s, e) => s + Number(e.Amount), 0);
    const share = shares
      .filter((s) => s.MemberId === m.Id)
      .reduce((s, x) => s + Number(x.Amount), 0);
    return {
      memberId: m.Id,
      name: m.Name,
      paid: round2(paid),
      share: round2(share),
      net: round2(paid - share),
    };
  });

  balances.sort((a, b) => b.net - a.net);
  const settlements = simplifyDebts(balances);

  return {
    group,
    members,
    entries,
    balances,
    settlements,
  };
}

async function getMonthlySettlement(tenantId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const groups = await db.query(
    'SELECT * FROM SplitGroups WHERE TenantId = ?',
    [tenantId]
  );
  const allBalances = [];
  for (const g of groups) {
    const detail = await getGroupDetail(tenantId, g.Id);
    // mantém apenas entradas do mês
    const monthEntries = detail.entries.filter(
      (e) => new Date(e.Date) >= start && new Date(e.Date) < end
    );
    for (const m of detail.members) {
      const paid = monthEntries
        .filter((e) => e.PayerMemberId === m.Id)
        .reduce((s, e) => s + Number(e.Amount), 0);
      const share = detail.shares
        .filter((x) => x.MemberId === m.Id)
        .reduce((s, x) => s + Number(x.Amount), 0);
      allBalances.push({
        memberId: m.Id,
        name: m.Name,
        paid: round2(paid),
        share: round2(share),
        net: round2(paid - share),
      });
    }
  }
  const settlements = simplifyDebts(allBalances);
  const totalOwed = round2(settlements.reduce((s, x) => s + x.amount, 0));
  return { totalOwed, settlements };
}

async function getSplitRatioLabel(tenantId) {
  const groups = await db.query(
    'SELECT * FROM SplitGroups WHERE TenantId = ?',
    [tenantId]
  );
  if (groups.length === 0) return '';

  let bestGroup = null;
  let bestTotal = 0;
  for (const g of groups) {
    const total = await db.queryOne(
      `SELECT COALESCE(SUM(Amount), 0) AS total FROM SplitShares WHERE EntryId IN
       (SELECT Id FROM SplitEntries WHERE GroupId = ?)`,
      [g.Id]
    );
    if (Number(total.total) > bestTotal) {
      bestTotal = Number(total.total);
      bestGroup = g;
    }
  }
  if (!bestGroup) return '';

  const detail = await getGroupDetail(tenantId, bestGroup.Id);
  if (detail.members.length < 2) return '';

  const total = detail.balances.reduce((s, b) => s + b.share, 0);
  if (total <= 0) return '';

  const sorted = [...detail.balances].sort((a, b) => b.share - a.share);
  const top2 = sorted.slice(0, 2);
  const pct = top2.map((b) => Math.round((b.share / total) * 100));
  return `${pct[0]}/${pct[1]}`;
}

async function createGroup(tenantId, name, currency = 'R$') {
  const id = uid();
  await db.query(
    `INSERT INTO SplitGroups (Id, TenantId, Name, Currency, CreatedAt)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
    [id, tenantId, name, currency]
  );
  return { Id: id };
}

async function addMember(groupId, tenantId, name, email) {
  const group = await db.queryOne(
    'SELECT * FROM SplitGroups WHERE Id = ? AND TenantId = ?',
    [groupId, tenantId]
  );
  if (!group) throw new Error('Grupo não encontrado.');
  const dup = await db.queryOne(
    'SELECT * FROM SplitMembers WHERE GroupId = ? AND Name = ?',
    [groupId, name]
  );
  if (dup) throw new Error('Já existe um membro com esse nome.');
  const id = uid();
  await db.query(
    `INSERT INTO SplitMembers (Id, GroupId, UserId, Name, Email, CreatedAt)
     VALUES (?, ?, NULL, ?, ?, UTC_TIMESTAMP())`,
    [id, groupId, name, email || null]
  );
  return { Id: id };
}

async function addEntry(groupId, tenantId, { title, amount, date, payerMemberId, shares }) {
  const group = await db.queryOne(
    'SELECT * FROM SplitGroups WHERE Id = ? AND TenantId = ?',
    [groupId, tenantId]
  );
  if (!group) throw new Error('Grupo não encontrado.');

  const id = uid();
  await db.query(
    `INSERT INTO SplitEntries (Id, GroupId, PayerMemberId, Title, Amount, Date, CreatedAt)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [id, groupId, payerMemberId, title, amount, new Date(date)]
  );

  if (shares && shares.length > 0) {
    for (const s of shares) {
      await db.query(
        `INSERT INTO SplitShares (Id, EntryId, MemberId, Amount)
         VALUES (?, ?, ?, ?)`,
        [uid(), id, s.memberId, s.amount]
      );
    }
  }
  return { Id: id };
}

async function deleteEntry(groupId, tenantId, entryId) {
  const entry = await db.queryOne(
    'SELECT * FROM SplitEntries WHERE Id = ? AND GroupId = ?',
    [entryId, groupId]
  );
  if (!entry) throw new Error('Lançamento não encontrado.');
  const group = await db.queryOne(
    'SELECT * FROM SplitGroups WHERE Id = ? AND TenantId = ?',
    [groupId, tenantId]
  );
  if (!group) throw new Error('Grupo não encontrado.');
  await db.query('DELETE FROM SplitShares WHERE EntryId = ?', [entryId]);
  await db.query('DELETE FROM SplitEntries WHERE Id = ?', [entryId]);
}

async function getGroupsWithStats(tenantId) {
  const groups = await db.query(
    'SELECT * FROM SplitGroups WHERE TenantId = ? ORDER BY CreatedAt ASC',
    [tenantId]
  );
  const result = [];
  for (const g of groups) {
    const memberCount = await db.queryOne(
      'SELECT COUNT(*) AS c FROM SplitMembers WHERE GroupId = ?',
      [g.Id]
    );
    const entryCount = await db.queryOne(
      'SELECT COUNT(*) AS c FROM SplitEntries WHERE GroupId = ?',
      [g.Id]
    );
    const total = await db.queryOne(
      `SELECT COALESCE(SUM(Amount), 0) AS t FROM SplitEntries WHERE GroupId = ?`,
      [g.Id]
    );
    result.push({
      ...g,
      memberCount: memberCount.c,
      entryCount: entryCount.c,
      total: round2(Number(total.t || 0)),
    });
  }
  return result;
}

async function settleDebts(tenantId, groupId) {
  const detail = await getGroupDetail(tenantId, groupId);
  const settlements = detail.settlements;
  const now = new Date();
  for (const s of settlements) {
    const entryId = uid();
    await db.query(
      `INSERT INTO SplitEntries (Id, GroupId, PayerMemberId, Title, Amount, Date, CreatedAt)
       VALUES (?, ?, ?, 'Acerto de contas', ?, ?, UTC_TIMESTAMP())`,
      [entryId, groupId, s.from, s.amount, now]
    );
    await db.query(
      `INSERT INTO SplitShares (Id, EntryId, MemberId, Amount)
       VALUES (?, ?, ?, ?)`,
      [uid(), entryId, s.to, s.amount]
    );
  }
  return settlements;
}

module.exports = {
  splitEvenly,
  simplifyDebts,
  getGroupDetail,
  getMonthlySettlement,
  getSplitRatioLabel,
  createGroup,
  addMember,
  addEntry,
  deleteEntry,
  getGroupsWithStats,
  settleDebts,
};