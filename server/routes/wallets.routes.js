const express = require('express');
const db = require('../db');
const { uid } = require('../utils/ids');
const balanceService = require('../services/balanceService');
const billingService = require('../services/billingService');
const syncService = require('../services/syncService');
const { authenticate, resolveTenant } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const wallets = await db.query(
      'SELECT * FROM Wallets WHERE TenantId = ? AND IsArchived = 0 ORDER BY CreatedAt ASC',
      [req.tenantId]
    );
    const balances = await balanceService.getWalletBalances(req.tenantId);
    const plan = await billingService.getPlan(req.user.Id);
    const list = wallets.map((w) => ({
      ...w,
      balance: balances[w.Id] || 0,
    }));
    res.json({ wallets: list, plan, maxWallets: billingService.maxWallets(plan) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const plan = await billingService.getPlan(req.user.Id);
    const max = billingService.maxWallets(plan);
    if (max !== Infinity) {
      const count = await db.queryOne(
        'SELECT COUNT(*) AS c FROM Wallets WHERE TenantId = ? AND IsArchived = 0',
        [req.tenantId]
      );
      if (count.c >= max) {
        return res.status(403).json({ error: 'Limite de carteiras do plano Free atingido.' });
      }
    }
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
    const dup = await db.queryOne(
      'SELECT * FROM Wallets WHERE TenantId = ? AND Name = ? AND IsArchived = 0',
      [req.tenantId, name]
    );
    if (dup) return res.status(400).json({ error: 'Já existe uma carteira com esse nome.' });

    const id = uid();
    await db.query(
      `INSERT INTO Wallets (Id, TenantId, Name, Icon, Color, InitialBalance, Currency, Kind, IsArchived, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())`,
      [
        id,
        req.tenantId,
        name,
        body.icon || '💼',
        body.color || '#5B8DEF',
        body.initialBalance || 0,
        body.currency || 'R$',
        body.kind !== undefined ? body.kind : 2,
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
      'SELECT * FROM Wallets WHERE Id = ? AND TenantId = ?',
      [req.params.id, req.tenantId]
    );
    if (!existing) return res.status(404).json({ error: 'Carteira não encontrada.' });
    await db.query(
      `UPDATE Wallets SET Name = ?, Icon = ?, Color = ?, Kind = ?, InitialBalance = ? WHERE Id = ?`,
      [
        body.name !== undefined ? body.name : existing.Name,
        body.icon !== undefined ? body.icon : existing.Icon,
        body.color !== undefined ? body.color : existing.Color,
        body.kind !== undefined ? body.kind : existing.Kind,
        body.initialBalance !== undefined ? body.initialBalance : existing.InitialBalance,
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
    await db.query('UPDATE Wallets SET IsArchived = 1 WHERE Id = ? AND TenantId = ?', [
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