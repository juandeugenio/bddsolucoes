const express = require('express');
const pushService = require('../services/pushService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.post('/subscribe', async (req, res) => {
  try {
    const { endpoint, p256dh, auth } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'Endpoint ausente.' });
    await pushService.subscribe(req.user.Id, endpoint, p256dh || '', auth || '');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'Endpoint ausente.' });
    await pushService.unsubscribe(endpoint);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;