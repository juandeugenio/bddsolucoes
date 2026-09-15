const express = require('express');
const db = require('../db');
const { uid } = require('../utils/ids');
const billingService = require('../services/billingService');
const syncService = require('../services/syncService');
const { authenticate, resolveTenant } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const cards = await db.query(
      'SELECT * FROM CreditCards WHERE TenantId = ? AND IsArchived = 0 ORDER BY CreatedAt ASC',
      [req.tenantId]
    );
    const plan = await billingService.getPlan(req.user.Id);
    res.json({ cards, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const plan = await billingService.getPlan(req.user.Id);
    if (plan !== billingService.Plan.Pro) {
      return res.status(403).json({ error: 'Cartões de crédito são um recurso Pro.' });
    }
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
    const id = uid();
    await db.query(
      `INSERT INTO CreditCards (Id, TenantId, Name, Icon, Color, ClosingDay, DueDay, \`Limit\`, IsArchived, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())`,
      [
        id,
        req.tenantId,
        name,
        body.icon || 'credit-card',
        body.color || '#9675FF',
        body.closingDay || 1,
        body.dueDay || 5,
        body.limit || null,
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
    const body = req.body || {};
    const existing = await db.queryOne(
      'SELECT * FROM CreditCards WHERE Id = ? AND TenantId = ?',
      [req.params.id, req.tenantId]
    );
    if (!existing) return res.status(404).json({ error: 'Cartão não encontrado.' });
    await db.query(
      `UPDATE CreditCards SET Name = ?, Icon = ?, Color = ?, ClosingDay = ?, DueDay = ?, \`Limit\` = ? WHERE Id = ?`,
      [
        body.name !== undefined ? body.name : existing.Name,
        body.icon !== undefined ? body.icon : existing.Icon,
        body.color !== undefined ? body.color : existing.Color,
        body.closingDay !== undefined ? body.closingDay : existing.ClosingDay,
        body.dueDay !== undefined ? body.dueDay : existing.DueDay,
        body.limit !== undefined ? body.limit : existing.Limit,
        req.params.id,
      ]
    );
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('UPDATE CreditCards SET IsArchived = 1 WHERE Id = ? AND TenantId = ?', [
      req.params.id,
      req.tenantId,
    ]);
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;