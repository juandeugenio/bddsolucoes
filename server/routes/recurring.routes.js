const express = require('express');
const db = require('../db');
const recurrenceService = require('../services/recurrenceService');
const billingService = require('../services/billingService');
const syncService = require('../services/syncService');
const { authenticate, resolveTenant } = require('../middleware/auth');
const { validateRefs } = require('../utils/refs');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const rules = await recurrenceService.getAll(req.tenantId);
    const wallets = await db.query(
      'SELECT * FROM Wallets WHERE TenantId = ? AND IsArchived = 0 ORDER BY Name ASC',
      [req.tenantId]
    );
    const categories = await db.query(
      'SELECT * FROM Categories WHERE TenantId = ? AND IsArchived = 0 ORDER BY Name ASC',
      [req.tenantId]
    );
    const plan = await billingService.getPlan(req.user.Id);
    res.json({ rules, wallets, categories, plan, maxRecurring: billingService.maxRecurring(plan) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const plan = await billingService.getPlan(req.user.Id);
    if (plan !== billingService.Plan.Pro) {
      return res.status(403).json({ error: 'Transações recorrentes são um recurso Pro.' });
    }
    const id = require('../utils/ids').uid();

    // Auditoria F3: valida que wallet/categoria pertencem ao tenant.
    const refError = await validateRefs(req.tenantId, {
      walletId: body.walletId || null,
      categoryId: body.categoryId || null,
    });
    if (refError) {
      return res.status(400).json({ error: refError });
    }

    await db.query(
      `INSERT INTO RecurringTransactions (Id, TenantId, WalletId, CategoryId, Kind, Amount, Currency, Note,
         Frequency, StartDate, EndDate, NextDueDate, LastGeneratedDate, Enabled, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'R$', ?, ?, ?, ?, ?, NULL, 1, UTC_TIMESTAMP())`,
      [
        id,
        req.tenantId,
        body.walletId || null,
        body.categoryId || null,
        body.kind,
        body.amount,
        body.note || null,
        body.frequency,
        body.startDate,
        body.endDate || null,
        body.nextDueDate,
      ]
    );
    await syncService.bump(req.tenantId);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const plan = await billingService.getPlan(req.user.Id);
    if (plan !== billingService.Plan.Pro) {
      return res.status(403).json({ error: 'Transações recorrentes são um recurso Pro.' });
    }
    await recurrenceService.update(req.tenantId, { Id: req.params.id, ...req.body });
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await recurrenceService.remove(req.tenantId, req.params.id);
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const rules = await recurrenceService.getUpcoming(req.tenantId, days);
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;