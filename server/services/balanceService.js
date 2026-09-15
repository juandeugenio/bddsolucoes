const db = require('../db');
const splitService = require('./splitService');
const { uid } = require('../utils/ids');

const TransactionKind = { Income: 0, Expense: 1, Transfer: 2 };

function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

async function getTransactionsInRange(tenantId, start, end) {
  return db.query(
    `SELECT t.*, w.Name AS WalletName, w.Icon AS WalletIcon, w.Color AS WalletColor, w.Kind AS WalletKind,
            c.Name AS CategoryName, c.Icon AS CategoryIcon, c.Color AS CategoryColor,
            m.Name AS PayerName
     FROM Transactions t
     LEFT JOIN Wallets w ON w.Id = t.WalletId
     LEFT JOIN Categories c ON c.Id = t.CategoryId
     LEFT JOIN SplitMembers m ON m.Id = t.PayerMemberId
     WHERE t.TenantId = ? AND t.Date >= ? AND t.Date < ?
     ORDER BY t.Date DESC`,
    [tenantId, start, end]
  );
}

async function getTotalBalance(tenantId) {
  const wallets = await db.query(
    'SELECT InitialBalance FROM Wallets WHERE TenantId = ? AND IsArchived = 0',
    [tenantId]
  );
  const rows = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN Kind = 0 THEN Amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN Kind = 1 THEN Amount ELSE 0 END), 0) AS expense
     FROM Transactions WHERE TenantId = ? AND Kind <> 2`,
    [tenantId]
  );
  const initial = wallets.reduce((sum, w) => sum + Number(w.InitialBalance || 0), 0);
  return round2(initial + Number(rows[0].income || 0) - Number(rows[0].expense || 0));
}

async function getAccumulatedBalanceUpTo(tenantId, year, month) {
  const end = new Date(Date.UTC(year, month, 1));
  const wallets = await db.query(
    'SELECT InitialBalance FROM Wallets WHERE TenantId = ? AND IsArchived = 0',
    [tenantId]
  );
  const rows = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN Kind = 0 THEN Amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN Kind = 1 THEN Amount ELSE 0 END), 0) AS expense
     FROM Transactions WHERE TenantId = ? AND Kind <> 2 AND Date < ?`,
    [tenantId, end]
  );
  const initial = wallets.reduce((sum, w) => sum + Number(w.InitialBalance || 0), 0);
  return round2(initial + Number(rows[0].income || 0) - Number(rows[0].expense || 0));
}

async function getMonthlySummary(tenantId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const tx = await getTransactionsInRange(tenantId, start, end);

  let income = 0;
  let expense = 0;
  const byCategory = new Map();
  for (const t of tx) {
    if (t.Kind === TransactionKind.Income) income += Number(t.Amount);
    else if (t.Kind === TransactionKind.Expense) expense += Number(t.Amount);
  }
  income = round2(income);
  expense = round2(expense);

  const expenseByCategory = new Map();
  for (const t of tx) {
    if (t.Kind !== TransactionKind.Expense || !t.CategoryId) continue;
    const key = t.CategoryId;
    const cur = expenseByCategory.get(key) || { amount: 0, name: t.CategoryName, icon: t.CategoryIcon, color: t.CategoryColor };
    cur.amount += Number(t.Amount);
    expenseByCategory.set(key, cur);
  }

  // Limites por categoria (recorrente Period NULL + específico do mês)
  const period = `${year}-${String(month).padStart(2, '0')}`;
  const limits = await db.query(
    `SELECT cl.CategoryId, cl.Amount, cl.Period, c.Name, c.Icon, c.Color
     FROM CategoryLimits cl
     JOIN Categories c ON c.Id = cl.CategoryId
     WHERE cl.TenantId = ? AND (cl.Period IS NULL OR cl.Period = ?)`,
    [tenantId, period]
  );
  const limitMap = new Map();
  for (const l of limits) {
    const key = String(l.CategoryId);
    // Específico do mês (Period) sobrescreve o recorrente (Period NULL), como no legado
    if (l.Period) {
      limitMap.set(key, { amount: Number(l.Amount), name: l.Name, icon: l.Icon, color: l.Color });
    } else if (!limitMap.has(key)) {
      limitMap.set(key, { amount: Number(l.Amount), name: l.Name, icon: l.Icon, color: l.Color });
    }
  }

  const categories = [];
  for (const [catId, cat] of expenseByCategory) {
    const limit = limitMap.get(catId);
    const spent = round2(cat.amount);
    categories.push({
      categoryId: catId,
      name: cat.name || 'Sem categoria',
      icon: cat.icon,
      color: cat.color,
      spent,
      limit: limit ? round2(limit.amount) : null,
      hasLimit: !!limit,
      usedPct: limit ? Math.min(spent / Number(limit.amount), 1) : 0,
      overLimit: limit ? spent > Number(limit.amount) : false,
    });
  }
  categories.sort((a, b) => b.spent - a.spent);

  const totalBalance = await getTotalBalance(tenantId);
  const accumulatedBalance = await getAccumulatedBalanceUpTo(tenantId, year, month);

  return {
    year,
    month,
    income,
    expense,
    net: round2(income - expense),
    totalBalance,
    accumulatedBalance,
    categories,
  };
}

async function getCoupleSettlement(tenantId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await db.query(
    `SELECT t.PayerMemberId, COALESCE(SUM(t.Amount), 0) AS total
     FROM Transactions t
     WHERE t.TenantId = ? AND t.Kind = 1 AND t.Date >= ? AND t.Date < ?
     GROUP BY t.PayerMemberId`,
    [tenantId, start, end]
  );

  const members = await db.query(
    `SELECT m.* FROM FinanceTenantMembers m WHERE m.TenantId = ? ORDER BY m.JoinedAt ASC`,
    [tenantId]
  );

  const balances = members.map((m) => ({
    memberId: m.Id,
    name: m.Name || m.Email,
    paid: round2(rows.find((r) => r.PayerMemberId === m.Id)?.total || 0),
    share: 0,
  }));

  if (balances.length === 0) {
    return { totalOwed: 0, settlements: [] };
  }

  const total = balances.reduce((s, b) => s + b.paid, 0);
  const shareEach = round2(total / balances.length);
  for (const b of balances) b.share = shareEach;

  const settlements = splitService.simplifyDebts(balances);
  const totalOwed = round2(settlements.reduce((s, x) => s + x.amount, 0));

  return { totalOwed, settlements };
}

async function getWalletBalances(tenantId) {
  const wallets = await db.query(
    'SELECT Id, InitialBalance FROM Wallets WHERE TenantId = ? AND IsArchived = 0',
    [tenantId]
  );
  const tx = await db.query(
    `SELECT t.Id, t.WalletId, t.CounterWalletId, t.Kind, t.Amount
     FROM Transactions t WHERE t.TenantId = ?`,
    [tenantId]
  );
  const balances = new Map(wallets.map((w) => [w.Id, Number(w.InitialBalance || 0)]));
  for (const t of tx) {
    const amount = Number(t.Amount);
    if (t.WalletId) {
      if (t.Kind === TransactionKind.Income) balances.set(t.WalletId, (balances.get(t.WalletId) || 0) + amount);
      else if (t.Kind === TransactionKind.Expense) balances.set(t.WalletId, (balances.get(t.WalletId) || 0) - amount);
      else if (t.Kind === TransactionKind.Transfer) balances.set(t.WalletId, (balances.get(t.WalletId) || 0) - amount);
    }
    if (t.Kind === TransactionKind.Transfer && t.CounterWalletId && t.CounterWalletId !== t.WalletId) {
      balances.set(t.CounterWalletId, (balances.get(t.CounterWalletId) || 0) + amount);
    }
  }
  const result = {};
  for (const [k, v] of balances) result[k] = round2(v);
  return result;
}

async function getRecentTransactions(tenantId, count) {
  const rows = await db.query(
    `SELECT t.*, w.Name AS WalletName, w.Icon AS WalletIcon, w.Color AS WalletColor,
            c.Name AS CategoryName, c.Icon AS CategoryIcon, c.Color AS CategoryColor,
            m.Name AS PayerName
     FROM Transactions t
     LEFT JOIN Wallets w ON w.Id = t.WalletId
     LEFT JOIN Categories c ON c.Id = t.CategoryId
     LEFT JOIN SplitMembers m ON m.Id = t.PayerMemberId
     WHERE t.TenantId = ?
     ORDER BY t.Date DESC
     LIMIT ?`,
    [tenantId, count]
  );
  return rows;
}

async function getMonthlySeries(tenantId, months) {
  const now = new Date();
  const series = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    const rows = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN Kind = 0 THEN Amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN Kind = 1 THEN Amount ELSE 0 END), 0) AS expense
       FROM Transactions WHERE TenantId = ? AND Date >= ? AND Date < ?`,
      [tenantId, start, end]
    );
    const income = round2(Number(rows[0].income || 0));
    const expense = round2(Number(rows[0].expense || 0));
    series.push({
      year: y,
      month: m,
      label: monthLabel(y, m),
      income,
      expense,
      net: round2(income - expense),
    });
  }
  return series;
}

function monthLabel(year, month) {
  const names = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return names[month - 1];
}

async function getDailyExpenses(tenantId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await db.query(
    `SELECT DAY(t.Date) AS day, SUM(t.Amount) AS amount
     FROM Transactions t
     WHERE t.TenantId = ? AND t.Kind = 1 AND t.Date >= ? AND t.Date < ?
     GROUP BY DAY(t.Date)`,
    [tenantId, start, end]
  );
  return rows.map((r) => ({ day: r.day, amount: round2(Number(r.amount || 0)) }));
}

async function getSpendingByKind(tenantId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await db.query(
    `SELECT w.Kind AS walletKind, SUM(t.Amount) AS amount
     FROM Transactions t
     LEFT JOIN Wallets w ON w.Id = t.WalletId
     WHERE t.TenantId = ? AND t.Kind = 1 AND t.Date >= ? AND t.Date < ?
     GROUP BY w.Kind`,
    [tenantId, start, end]
  );
  const labels = {
    0: { label: 'Cartão', color: '#5B8DEF' },
    1: { label: 'Dinheiro', color: '#22C55E' },
    2: { label: 'Conta bancária', color: '#F59E0B' },
    4: { label: 'Pix', color: '#00B2FE' },
  };
  return rows.map((r) => {
    const def = labels[r.walletKind] || { label: 'Outro', color: '#A78BFA' };
    return { kind: r.walletKind, label: def.label, color: def.color, amount: round2(Number(r.amount || 0)) };
  });
}

async function getSpendingByMember(tenantId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await db.query(
    `SELECT t.PayerMemberId, m.Name AS memberName, SUM(t.Amount) AS amount
     FROM Transactions t
     LEFT JOIN SplitMembers m ON m.Id = t.PayerMemberId
     WHERE t.TenantId = ? AND t.Kind = 1 AND t.Date >= ? AND t.Date < ?
     GROUP BY t.PayerMemberId, m.Name`,
    [tenantId, start, end]
  );
  return rows.map((r) => ({
    memberId: r.PayerMemberId,
    name: r.memberName || 'Compartilhado',
    amount: round2(Number(r.amount || 0)),
  }));
}

async function getMemberSummary(tenantId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const members = await db.query(
    'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? ORDER BY Role ASC, Name ASC',
    [tenantId]
  );
  const tx = await db.query(
    `SELECT Kind, PayerMemberId, Amount FROM Transactions
     WHERE TenantId = ? AND Kind IN (0, 1) AND Date >= ? AND Date < ?`,
    [tenantId, start, end]
  );

  const memberCount = Math.max(members.length, 1);
  const totals = members.map((m) => ({
    memberId: m.Id,
    name: m.Name || m.Email,
    income: 0,
    expense: 0,
  }));

  const shared = { income: 0, expense: 0 };
  for (const t of tx) {
    const amount = Number(t.Amount);
    if (t.PayerMemberId) {
      const m = totals.find((x) => x.memberId === t.PayerMemberId);
      if (m) {
        if (t.Kind === TransactionKind.Income) m.income += amount;
        else m.expense += amount;
      }
    } else {
      if (t.Kind === TransactionKind.Income) shared.income += amount;
      else shared.expense += amount;
    }
  }

  for (const m of totals) {
    m.income = round2(m.income + shared.income / memberCount);
    m.expense = round2(m.expense + shared.expense / memberCount);
  }
  return totals;
}

async function getDailyMovements(tenantId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await db.query(
    `SELECT DAY(t.Date) AS day,
       COALESCE(SUM(CASE WHEN Kind = 0 THEN Amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN Kind = 1 THEN Amount ELSE 0 END), 0) AS expense
     FROM Transactions t
     WHERE t.TenantId = ? AND Kind IN (0, 1) AND Date >= ? AND Date < ?
     GROUP BY DAY(t.Date)`,
    [tenantId, start, end]
  );
  const map = {};
  for (const r of rows) {
    map[r.day] = { day: r.day, income: round2(Number(r.income || 0)), expense: round2(Number(r.expense || 0)) };
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    result.push(map[d] || { day: d, income: 0, expense: 0 });
  }
  return result;
}

async function getMonthTransactions(tenantId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return getTransactionsInRange(tenantId, start, end);
}

async function getCategorySpending(tenantId, year, month, kind) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await db.query(
    `SELECT t.CategoryId, c.Name, c.Icon, c.Color, SUM(t.Amount) AS spent,
       (SELECT COALESCE(MAX(cl.Amount), 0) FROM CategoryLimits cl
        WHERE cl.CategoryId = t.CategoryId AND cl.Period IS NULL) AS \`limit\`
     FROM Transactions t
     LEFT JOIN Categories c ON c.Id = t.CategoryId
     WHERE t.TenantId = ? AND t.Kind = ? AND t.Date >= ? AND t.Date < ?
     GROUP BY t.CategoryId, c.Name, c.Icon, c.Color`,
    [tenantId, kind, start, end]
  );
  return rows.map((r) => ({
    categoryId: r.CategoryId,
    name: r.Name || 'Sem categoria',
    icon: r.Icon,
    color: r.Color,
    spent: round2(Number(r.spent || 0)),
    limit: r.limit ? round2(Number(r.limit)) : null,
    hasLimit: !!r.limit && Number(r.limit) > 0,
    usedPct: r.limit && Number(r.limit) > 0 ? Math.min(Number(r.spent || 0) / Number(r.limit), 1) : 0,
    overLimit: r.limit && Number(r.limit) > 0 && Number(r.spent || 0) > Number(r.limit),
  }));
}

async function getOverallMonthlyLimit(tenantId) {
  const row = await db.queryOne(
    `SELECT cl.Amount FROM CategoryLimits cl
     JOIN Categories c ON c.Id = cl.CategoryId
     WHERE cl.TenantId = ? AND c.Name = '__OVERALL_LIMIT__' AND cl.Period IS NULL`,
    [tenantId]
  );
  return row ? round2(Number(row.Amount)) : 0;
}

async function setOverallMonthlyLimit(tenantId, amount) {
  const existing = await db.queryOne(
    `SELECT c.Id, c.IsArchived FROM Categories c
     WHERE c.TenantId = ? AND c.Name = '__OVERALL_LIMIT__'`,
    [tenantId]
  );
  let catId = existing?.Id;

  if (amount && amount > 0) {
    if (!catId) {
      catId = uid();
      await db.query(
        `INSERT INTO Categories (Id, TenantId, Name, Icon, Color, Type, ParentId, IsArchived, CreatedAt)
         VALUES (?, ?, '__OVERALL_LIMIT__', '📊', '#64748B', 0, NULL, 1, UTC_TIMESTAMP())`,
        [catId, tenantId]
      );
    } else if (existing.IsArchived === 0) {
      await db.query('UPDATE Categories SET IsArchived = 1 WHERE Id = ?', [catId]);
    }
    const limit = await db.queryOne(
      'SELECT Id FROM CategoryLimits WHERE TenantId = ? AND CategoryId = ? AND Period IS NULL',
      [tenantId, catId]
    );
    if (limit) {
      await db.query(
        'UPDATE CategoryLimits SET Amount = ?, UpdatedAt = UTC_TIMESTAMP() WHERE Id = ?',
        [amount, limit.Id]
      );
    } else {
      await db.query(
        `INSERT INTO CategoryLimits (Id, TenantId, CategoryId, Amount, Period, UpdatedAt)
         VALUES (?, ?, ?, ?, NULL, UTC_TIMESTAMP())`,
        [uid(), tenantId, catId, amount]
      );
    }
  } else if (catId) {
    await db.query(
      'DELETE FROM CategoryLimits WHERE TenantId = ? AND CategoryId = ? AND Period IS NULL',
      [tenantId, catId]
    );
  }
}

async function getCategoryLimits(tenantId) {
  const rows = await db.query(
    `SELECT c.Id AS categoryId, c.Name, c.Icon, c.Color, cl.Amount AS \`limit\`
     FROM Categories c
     LEFT JOIN CategoryLimits cl
       ON cl.CategoryId = c.Id AND cl.TenantId = c.TenantId AND cl.Period IS NULL
     WHERE c.TenantId = ? AND c.IsArchived = 0 AND c.Type = 0
     ORDER BY cl.Amount DESC`,
    [tenantId]
  );
  return rows.map((r) => ({
    categoryId: r.categoryId,
    name: r.Name,
    icon: r.Icon,
    color: r.Color,
    limit: r.limit != null ? round2(Number(r.limit)) : null,
  }));
}

async function setCategoryLimit(tenantId, categoryId, amount) {
  const limit = await db.queryOne(
    'SELECT Id FROM CategoryLimits WHERE TenantId = ? AND CategoryId = ? AND Period IS NULL',
    [tenantId, categoryId]
  );
  if (amount && amount > 0) {
    if (limit) {
      await db.query(
        'UPDATE CategoryLimits SET Amount = ?, UpdatedAt = UTC_TIMESTAMP() WHERE Id = ?',
        [amount, limit.Id]
      );
    } else {
      await db.query(
        `INSERT INTO CategoryLimits (Id, TenantId, CategoryId, Amount, Period, UpdatedAt)
         VALUES (?, ?, ?, ?, NULL, UTC_TIMESTAMP())`,
        [uid(), tenantId, categoryId, amount]
      );
    }
  } else if (limit) {
    await db.query('DELETE FROM CategoryLimits WHERE Id = ?', [limit.Id]);
  }
}

async function getMemberCategoryComparison(tenantId, year, month, kind) {
  const members = await db.query(
    'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? ORDER BY Role ASC, Name ASC',
    [tenantId]
  );
  if (members.length < 2) return [];

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await db.query(
    `SELECT c.Name AS categoryName, c.Color AS categoryColor, t.PayerMemberId, t.Amount
     FROM Transactions t
     LEFT JOIN Categories c ON c.Id = t.CategoryId
     WHERE t.TenantId = ? AND t.Kind = ? AND t.Date >= ? AND t.Date < ?`,
    [tenantId, kind, start, end]
  );

  const memberCount = members.length;
  const map = new Map();
  for (const r of rows) {
    const key = r.categoryName || 'Sem categoria';
    let item = map.get(key);
    if (!item) {
      item = {
        categoryName: key,
        categoryColor: r.categoryColor || '#9675FF',
        firstMember: 0,
        secondMember: 0,
      };
      map.set(key, item);
    }
    const amount = Number(r.Amount);
    if (r.PayerMemberId === members[0].Id) item.firstMember += amount;
    else if (r.PayerMemberId === members[1].Id) item.secondMember += amount;
    else {
      item.firstMember += amount / memberCount;
      item.secondMember += amount / memberCount;
    }
  }
  return [...map.values()].map((x) => ({
    ...x,
    firstMember: round2(x.firstMember),
    secondMember: round2(x.secondMember),
  }));
}

module.exports = {
  TransactionKind,
  getTotalBalance,
  getAccumulatedBalanceUpTo,
  getMonthlySummary,
  getCoupleSettlement,
  getWalletBalances,
  getRecentTransactions,
  getMonthlySeries,
  getDailyExpenses,
  getSpendingByKind,
  getSpendingByMember,
  getMemberSummary,
  getDailyMovements,
  getMonthTransactions,
  getCategorySpending,
  getOverallMonthlyLimit,
  setOverallMonthlyLimit,
  getCategoryLimits,
  setCategoryLimit,
  getMemberCategoryComparison,
};