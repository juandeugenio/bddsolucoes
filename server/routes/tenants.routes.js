const express = require('express');
const tenantService = require('../services/tenantService');
const billingService = require('../services/billingService');
const emailService = require('../services/emailService');
const { authenticate, resolveTenant } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/active', async (req, res) => {
  try {
    const tenantId = await tenantService.getActiveTenantId(req.user.Id);
    res.json({ tenantId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const tenants = await tenantService.getUserTenants(req.user.Id);
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/switch', async (req, res) => {
  try {
    const { tenantId } = req.body || {};
    const ok = await tenantService.switchTenant(req.user.Id, tenantId);
    if (!ok) return res.status(403).json({ error: 'Você não é membro deste espaço.' });
    res.json({ ok: true, tenantId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/members', resolveTenant, async (req, res) => {
  try {
    const members = await tenantService.getMembersWithUser(req.tenantId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/control-mode', resolveTenant, async (req, res) => {
  try {
    const mode = await tenantService.getControlMode(req.tenantId);
    res.json({ controlMode: mode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/control-mode', resolveTenant, async (req, res) => {
  try {
    const { controlMode } = req.body || {};
    await tenantService.setControlMode(req.tenantId, controlMode);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invites', resolveTenant, async (req, res) => {
  try {
    const invites = await tenantService.getInvites(req.tenantId);
    res.json(invites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invites', resolveTenant, async (req, res) => {
  try {
    const { email } = req.body || {};
    const invite = await tenantService.createInvite(req.user.Id, req.tenantId, email);
    if (emailService.isConfigured()) {
      const inviteUrl = `${req.protocol}://${req.get('host')}/invite/${invite.Token}`;
      await emailService.sendInviteEmail(email, inviteUrl);
    }
    res.json(invite);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/invites/:id/revoke', resolveTenant, async (req, res) => {
  try {
    await tenantService.revokeInvite(req.user.Id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/invite/accept', async (req, res) => {
  try {
    const { token } = req.body || {};
    const tenantId = await tenantService.acceptInvite(req.user.Id, token);
    res.json({ tenantId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/plan', async (req, res) => {
  try {
    const plan = await billingService.getPlan(req.user.Id);
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upgrade de plano é restrito ao painel admin (toggleProStatus).
// Endpoint público de auto-ativação removido por segurança (auditoria F1).

router.post('/timezone', async (req, res) => {
  try {
    const { timezone } = req.body || {};
    await tenantService.setTimezone(req.user.Id, timezone);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;