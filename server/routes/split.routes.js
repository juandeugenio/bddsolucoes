const express = require('express');
const db = require('../db');
const splitService = require('../services/splitService');
const billingService = require('../services/billingService');
const syncService = require('../services/syncService');
const { authenticate, resolveTenant } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const groups = await splitService.getGroupsWithStats(req.tenantId);
    const plan = await billingService.getPlan(req.user.Id);
    res.json({ groups, plan, maxGroups: billingService.maxSplitGroups(plan) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const plan = await billingService.getPlan(req.user.Id);
    const max = billingService.maxSplitGroups(plan);
    if (max !== Infinity) {
      const count = await db.queryOne(
        'SELECT COUNT(*) AS c FROM SplitGroups WHERE TenantId = ?',
        [req.tenantId]
      );
      if (count.c >= max) {
        return res.status(403).json({ error: 'Limite de grupos de divisão do plano Free atingido.' });
      }
    }
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
    const result = await splitService.createGroup(req.tenantId, name, body.currency || 'R$');
    await syncService.bump(req.tenantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const detail = await splitService.getGroupDetail(req.tenantId, req.params.id);
    res.json(detail);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
    const result = await splitService.addMember(req.params.id, req.tenantId, name, email);
    await syncService.bump(req.tenantId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/entries', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await splitService.addEntry(req.params.id, req.tenantId, {
      title: body.title,
      amount: body.amount,
      date: body.date,
      payerMemberId: body.payerMemberId,
      shares: body.shares,
    });
    await syncService.bump(req.tenantId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/entries/:entryId', async (req, res) => {
  try {
    await splitService.deleteEntry(req.params.id, req.tenantId, req.params.entryId);
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/settle', async (req, res) => {
  try {
    const settlements = await splitService.settleDebts(req.tenantId, req.params.id);
    await syncService.bump(req.tenantId);
    res.json({ settlements });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;