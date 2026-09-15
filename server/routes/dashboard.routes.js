const express = require('express');
const db = require('../db');
const balanceService = require('../services/balanceService');
const splitService = require('../services/splitService');
const recurrenceService = require('../services/recurrenceService');
const tenantService = require('../services/tenantService');
const { authenticate, resolveTenant } = require('../middleware/auth');
const { daysInMonth } = require('../utils/dates');

const router = express.Router();
router.use(authenticate, resolveTenant);

function parseYearMonth(query) {
  const now = new Date();
  const year = parseInt(query.year, 10) || now.getFullYear();
  const month = parseInt(query.month, 10) || now.getMonth() + 1;
  return { year, month };
}

router.get('/summary', async (req, res) => {
  try {
    const { year, month } = parseYearMonth(req.query);
    await recurrenceService.generateDue(req.tenantId, new Date(Date.UTC(year, month - 1, daysInMonth(year, month))));
    const summary = await balanceService.getMonthlySummary(req.tenantId, year, month);
    const coupleSettlement = await balanceService.getCoupleSettlement(req.tenantId, year, month);
    const memberSummary = await balanceService.getMemberSummary(req.tenantId, year, month);
    const controlMode = await tenantService.getControlMode(req.tenantId);
    const splitRatio = await splitService.getSplitRatioLabel(req.tenantId);
    const overallLimit = await balanceService.getOverallMonthlyLimit(req.tenantId);
    res.json({
      ...summary,
      coupleSettlement,
      memberSummary,
      controlMode,
      splitRatio,
      overallLimit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/series', async (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 6;
    const series = await balanceService.getMonthlySeries(req.tenantId, months);
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const count = parseInt(req.query.count, 10) || 10;
    const txs = await balanceService.getRecentTransactions(req.tenantId, count);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/wallet-balances', async (req, res) => {
  try {
    const balances = await balanceService.getWalletBalances(req.tenantId);
    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const { year, month } = parseYearMonth(req.query);
    const cards = await db.query(
      'SELECT * FROM CreditCards WHERE TenantId = ? AND IsArchived = 0',
      [req.tenantId]
    );
    const invoices = [];
    if (cards.length > 0) {
      const cardIds = cards.map((c) => c.Id);
      const prevMonthDt = new Date(Date.UTC(year, month - 1, 1));
      prevMonthDt.setUTCMonth(prevMonthDt.getUTCMonth() - 1);
      const minPrevClose = new Date(
        Date.UTC(
          prevMonthDt.getUTCFullYear(),
          prevMonthDt.getUTCMonth(),
          Math.min(Math.min(...cards.map((c) => c.ClosingDay)), daysInMonth(prevMonthDt.getUTCFullYear(), prevMonthDt.getUTCMonth() + 1))
        )
      );
      const maxDue = new Date(
        Date.UTC(year, month, Math.min(Math.max(...cards.map((c) => c.DueDay)), daysInMonth(year, month)))
      );

      const startOffset = new Date(Date.UTC(minPrevClose.getUTCFullYear(), minPrevClose.getUTCMonth(), minPrevClose.getUTCDate()));
      const endOffset = new Date(Date.UTC(maxDue.getUTCFullYear(), maxDue.getUTCMonth(), maxDue.getUTCDate() + 1));

      const cardTxList = await db.query(
        `SELECT CardId, Amount, Date FROM Transactions
         WHERE TenantId = ? AND CardId IS NOT NULL AND Kind = 1 AND Date >= ? AND Date < ?`,
        [req.tenantId, startOffset, endOffset]
      );
      const cardPaymentsList = await db.query(
        `SELECT Note, Amount, Date FROM Transactions
         WHERE TenantId = ? AND Kind = 1 AND Note IS NOT NULL AND Date >= ? AND Date < ?`,
        [req.tenantId, startOffset, endOffset]
      );

      for (const card of cards) {
        const prevClose = new Date(
          Date.UTC(
            prevMonthDt.getUTCFullYear(),
            prevMonthDt.getUTCMonth(),
            Math.min(card.ClosingDay, daysInMonth(prevMonthDt.getUTCFullYear(), prevMonthDt.getUTCMonth() + 1))
          )
        );
        const currClose = new Date(
          Date.UTC(year, month, Math.min(card.ClosingDay, daysInMonth(year, month)))
        );
        const due = new Date(
          Date.UTC(year, month, Math.min(card.DueDay, daysInMonth(year, month)))
        );

        const cardTx = cardTxList.filter(
          (t) => t.CardId === card.Id && new Date(t.Date) >= prevClose && new Date(t.Date) < currClose
        );
        const cardTotalTx = cardTx.reduce((s, t) => s + Number(t.Amount), 0);

        const cardTotalPayments = cardPaymentsList
          .filter(
            (t) =>
              String(t.Note || '').toLowerCase().includes(String(card.Name).toLowerCase()) &&
              new Date(t.Date) >= prevClose &&
              new Date(t.Date) <= new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 20))
          )
          .reduce((s, t) => s + Number(t.Amount), 0);

        const total = Math.max(0, cardTotalTx - cardTotalPayments);

        // Breakdown por categoria
        const txWithCategory = await db.query(
          `SELECT t.Amount, c.Name AS CategoryName, c.Icon AS CategoryIcon, c.Color AS CategoryColor, t.Note, t.Date
           FROM Transactions t
           LEFT JOIN Categories c ON c.Id = t.CategoryId
           WHERE t.TenantId = ? AND t.CardId = ? AND t.Kind = 1 AND t.Date >= ? AND t.Date < ?`,
          [req.tenantId, card.Id, prevClose, currClose]
        );

        const catMap = new Map();
        for (const t of txWithCategory) {
          const key = t.CategoryName || 'Outros';
          const cur = catMap.get(key) || { name: key, amount: 0 };
          cur.amount += Number(t.Amount);
          catMap.set(key, cur);
        }
        const categories = [...catMap.values()]
          .map((c) => ({ name: c.name, amount: Math.round(c.amount * 100) / 100 }))
          .sort((a, b) => b.amount - a.amount);

        const items = txWithCategory
          .sort((a, b) => new Date(b.Date) - new Date(a.Date))
          .map((t) => ({
            id: t.Id,
            note: t.Note || t.CategoryName || 'Compra',
            amount: Math.round(Number(t.Amount) * 100) / 100,
            date: t.Date,
            categoryName: t.CategoryName || 'Outros',
            categoryIcon: t.CategoryIcon || 'shopping-bag',
            categoryColor: t.CategoryColor || '#9675FF',
          }));

        invoices.push({
          cardId: card.Id,
          name: card.Name,
          icon: card.Icon,
          color: card.Color,
          closingDay: card.ClosingDay,
          dueDay: card.DueDay,
          dueDate: due,
          total: Math.round(total * 100) / 100,
          limit: card.Limit ? Math.round(Number(card.Limit) * 100) / 100 : null,
          categories,
          items,
        });
      }
    }
    res.json({ invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bills', async (req, res) => {
  try {
    const { year, month } = parseYearMonth(req.query);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 1));
    const bills = await db.query(
      `SELECT t.Id, t.Note, t.Amount, t.Date, t.IsPaid, t.CategoryId,
              c.Icon AS CategoryIcon, c.Color AS CategoryColor, c.Name AS CategoryName
       FROM Transactions t
       LEFT JOIN Categories c ON c.Id = t.CategoryId
       WHERE t.TenantId = ? AND t.Kind = 1
         AND ((t.Date >= ? AND t.Date < ?) OR (YEAR(t.Date) = ? AND MONTH(t.Date) = ?))
       ORDER BY t.Date ASC`,
      [req.tenantId, startOfMonth, endOfMonth, year, month]
    );
    const list = bills.map((t) => ({
      id: t.Id,
      note: t.Note || t.CategoryName || 'Despesa',
      amount: Math.round(Number(t.Amount) * 100) / 100,
      date: t.Date,
      icon: t.CategoryIcon || 'wallet',
      color: t.CategoryColor || '#FF5C4D',
      isPaid: t.IsPaid === 1 || t.IsPaid === true,
    }));
    res.json({ bills: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;