const express = require('express');
const db = require('../db');
const { uid } = require('../utils/ids');
const syncService = require('../services/syncService');
const { authenticate, resolveTenant } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const methods = await db.query(
      'SELECT Id, Name FROM PaymentMethods WHERE TenantId = ? ORDER BY CreatedAt ASC',
      [req.tenantId]
    );
    res.json({ methods });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
    if (name.length > 60) return res.status(400).json({ error: 'Nome muito longo.' });
    const dup = await db.queryOne(
      'SELECT * FROM PaymentMethods WHERE TenantId = ? AND Name = ?',
      [req.tenantId, name]
    );
    if (dup) return res.status(400).json({ error: 'Já existe um método com esse nome.' });

    const id = uid();
    await db.query(
      'INSERT INTO PaymentMethods (Id, TenantId, Name, CreatedAt) VALUES (?, ?, ?, UTC_TIMESTAMP())',
      [id, req.tenantId, name]
    );
    await syncService.bump(req.tenantId);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM PaymentMethods WHERE Id = ? AND TenantId = ?', [
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