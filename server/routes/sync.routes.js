const express = require('express');
const syncService = require('../services/syncService');
const { authenticate, resolveTenant } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/tenant-version', async (req, res) => {
  try {
    const version = await syncService.getVersion(req.tenantId);
    res.json({ tenantId: req.tenantId, version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;