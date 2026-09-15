const express = require('express');
const db = require('../db');
const authService = require('../services/authService');
const tenantService = require('../services/tenantService');
const currencyService = require('../services/currencyService');
const billingService = require('../services/billingService');
const pushService = require('../services/pushService');
const { authenticate, resolveTenant } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();
router.use(authenticate);

router.get('/profile', async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.Id);
    res.json({
      id: user.Id,
      email: user.Email,
      userName: user.UserName,
      defaultCurrency: user.DefaultCurrency,
      timezone: user.Timezone,
      notificationsEnabled: user.NotificationsEnabled === 1 || user.NotificationsEnabled === true,
      plan: user.Plan,
      planExpiresAt: user.PlanExpiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const body = req.body || {};
    if (body.name !== undefined || body.email !== undefined) {
      const name = body.name !== undefined ? body.name : req.user.UserName;
      const email = body.email !== undefined ? body.email : req.user.Email;
      await db.query(
        'UPDATE Users SET UserName = ?, NormalizedUserName = ?, Email = ?, NormalizedEmail = ? WHERE Id = ?',
        [
          name,
          String(name).toUpperCase(),
          email,
          authService.normalizeEmail(email),
          req.user.Id,
        ]
      );
    }
    if (body.defaultCurrency !== undefined) {
      await currencyService.setDefaultCurrency(req.user.Id, body.defaultCurrency);
    }
    if (body.timezone !== undefined) {
      await tenantService.setTimezone(req.user.Id, body.timezone);
    }
    if (body.notificationsEnabled !== undefined) {
      await db.query('UPDATE Users SET NotificationsEnabled = ? WHERE Id = ?', [
        body.notificationsEnabled ? 1 : 0,
        req.user.Id,
      ]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/members/:memberId', resolveTenant, async (req, res) => {
  try {
    const body = req.body || {};
    const member = await db.queryOne(
      'SELECT * FROM FinanceTenantMembers WHERE Id = ? AND TenantId = ?',
      [req.params.memberId, req.tenantId]
    );
    if (!member) return res.status(404).json({ error: 'Membro não encontrado.' });
    const name = body.name !== undefined ? body.name : member.Name;
    const email = body.email !== undefined ? body.email : member.Email;
    await db.query('UPDATE FinanceTenantMembers SET Name = ?, Email = ? WHERE Id = ?', [
      name,
      email,
      req.params.memberId,
    ]);
    if (member.UserId) {
      await db.query(
        'UPDATE Users SET UserName = ?, NormalizedUserName = ?, Email = ?, NormalizedEmail = ? WHERE Id = ?',
        [name, String(name).toUpperCase(), email, authService.normalizeEmail(email), member.UserId]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pin', async (req, res) => {
  try {
    const { pin } = req.body || {};
    const pinStr = String(pin || '');
    if (!/^\d{4,8}$/.test(pinStr)) {
      return res.status(400).json({ error: 'O PIN deve ter entre 4 e 8 dígitos.' });
    }
    const hash = authService.hashPassword(pinStr);
    await db.query('UPDATE Users SET PinHash = ? WHERE Id = ?', [hash, req.user.Id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pin/verify', async (req, res) => {
  try {
    const { pin } = req.body || {};
    const user = await authService.getUserById(req.user.Id);
    const ok = user.PinHash && authService.verifyPassword(String(pin || ''), user.PinHash);
    if (!ok) return res.status(400).json({ error: 'PIN incorreto.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pin/remove', async (req, res) => {
  try {
    await db.query('UPDATE Users SET PinHash = NULL WHERE Id = ?', [req.user.Id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chave PIX de recebimento: dado público por natureza (consta em toda cobrança).
// É consumida apenas pelo fluxo de assinatura Pro (PremiumGate) para gerar o QR.
// Protegida por autenticação; o valor é de recebimento, não é secreto.
router.get('/pix', (req, res) => {
  res.json({
    email: config.pix.email,
    copiaECola: config.pix.copiaECola,
  });
});

router.get('/push/public-key', (req, res) => {
  res.json({ publicKey: pushService.getPublicKeyForJs() });
});

module.exports = router;