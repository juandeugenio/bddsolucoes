const express = require('express');
const db = require('../db');
const { uid } = require('../utils/ids');
const balanceService = require('../services/balanceService');
const syncService = require('../services/syncService');
const { authenticate, resolveTenant } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const categories = await db.query(
      'SELECT * FROM Categories WHERE TenantId = ? AND IsArchived = 0 ORDER BY Type ASC, Name ASC',
      [req.tenantId]
    );
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
    const dup = await db.queryOne(
      'SELECT * FROM Categories WHERE TenantId = ? AND Name = ?',
      [req.tenantId, name]
    );
    if (dup) return res.status(400).json({ error: 'Já existe uma categoria com esse nome.' });

    const id = uid();
    await db.query(
      `INSERT INTO Categories (Id, TenantId, Name, Icon, Color, Type, ParentId, IsArchived, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())`,
      [
        id,
        req.tenantId,
        name,
        body.icon || '🏷️',
        body.color || '#5B8DEF',
        body.type !== undefined ? body.type : 0,
        body.parentId || null,
      ]
    );
    if (body.limit && Number(body.limit) > 0) {
      await balanceService.setCategoryLimit(req.tenantId, id, Number(body.limit));
    }
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
      'SELECT * FROM Categories WHERE Id = ? AND TenantId = ?',
      [req.params.id, req.tenantId]
    );
    if (!existing) return res.status(404).json({ error: 'Categoria não encontrada.' });
    await db.query(
      `UPDATE Categories SET Name = ?, Icon = ?, Color = ?, Type = ?, ParentId = ? WHERE Id = ?`,
      [
        body.name !== undefined ? body.name : existing.Name,
        body.icon !== undefined ? body.icon : existing.Icon,
        body.color !== undefined ? body.color : existing.Color,
        body.type !== undefined ? body.type : existing.Type,
        body.parentId !== undefined ? body.parentId : existing.ParentId,
        req.params.id,
      ]
    );
    if (body.limit !== undefined) {
      await balanceService.setCategoryLimit(req.tenantId, req.params.id, Number(body.limit) || null);
    }
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('UPDATE Categories SET IsArchived = 1 WHERE Id = ? AND TenantId = ?', [
      req.params.id,
      req.tenantId,
    ]);
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/limits', async (req, res) => {
  try {
    const limits = await balanceService.getCategoryLimits(req.tenantId);
    const overall = await balanceService.getOverallMonthlyLimit(req.tenantId);
    res.json({ limits, overall });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/limits/:categoryId', async (req, res) => {
  try {
    const { amount } = req.body || {};
    await balanceService.setCategoryLimit(req.tenantId, req.params.categoryId, amount);
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/overall-limit', async (req, res) => {
  try {
    const { amount } = req.body || {};
    await balanceService.setOverallMonthlyLimit(req.tenantId, amount);
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;