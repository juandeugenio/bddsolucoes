const express = require('express');
const currencyService = require('../services/currencyService');
const { authenticate, resolveTenant } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const rates = await currencyService.getRates();
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { fromCurrency, toCurrency, rate, date } = req.body || {};
    const id = await currencyService.setRate(fromCurrency, toCurrency, rate, date, req.user.Id);
    res.json({ id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await currencyService.deleteRate(req.params.id, req.user.Id);
    res.json({ ok: true });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

module.exports = router;