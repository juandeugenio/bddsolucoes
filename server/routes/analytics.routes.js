const express = require('express');
const balanceService = require('../services/balanceService');
const recurrenceService = require('../services/recurrenceService');
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

router.get('/daily', async (req, res) => {
  try {
    const { year, month } = parseYearMonth(req.query);
    const movements = await balanceService.getDailyMovements(req.tenantId, year, month);
    res.json({ year, month, movements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const { year, month } = parseYearMonth(req.query);
    const kind = parseInt(req.query.kind, 10) || 1;
    const categories = await balanceService.getCategorySpending(req.tenantId, year, month, kind);
    res.json({ year, month, kind, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/methods', async (req, res) => {
  try {
    const { year, month } = parseYearMonth(req.query);
    const methods = await balanceService.getSpendingByKind(req.tenantId, year, month);
    res.json({ year, month, methods });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { year, month } = parseYearMonth(req.query);
    const members = await balanceService.getMemberSummary(req.tenantId, year, month);
    const comparison = await balanceService.getMemberCategoryComparison(req.tenantId, year, month, 1);
    res.json({ year, month, members, comparison });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trend', async (req, res) => {
  try {
    const { year, month } = parseYearMonth(req.query);
    await recurrenceService.generateDue(req.tenantId, new Date(Date.UTC(year, month - 1, daysInMonth(year, month))));
    const series = await balanceService.getMonthlySeries(req.tenantId, 6);
    const overallLimit = await balanceService.getOverallMonthlyLimit(req.tenantId);
    const summary = await balanceService.getMonthlySummary(req.tenantId, year, month);
    res.json({ year, month, series, overallLimit, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;