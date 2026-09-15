const express = require('express');
const db = require('../db');
const billingService = require('../services/billingService');
const authService = require('../services/authService');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const rows = await billingService.getAdminUserList();
    const users = [];
    for (const r of rows) {
      const spouse = await getSpouse(r);
      const isPro = r.Plan === billingService.Plan.Pro;
      users.push({
        userId: r.UserId,
        email: r.Email,
        userName: r.UserName,
        tenantId: r.ActiveTenantId,
        tenantName: r.TenantName,
        spouseEmail: spouse,
        plan: r.Plan,
        planExpiresAt: r.PlanExpiresAt,
        isProActive: isPro,
      });
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function getSpouse(r) {
  if (!r.ActiveTenantId) return null;
  const members = await db.query(
    `SELECT u.Email FROM FinanceTenantMembers m
     JOIN Users u ON u.Id = m.UserId
     WHERE m.TenantId = ? AND m.UserId <> ?`,
    [r.ActiveTenantId, r.UserId]
  );
  return members.length > 0 ? members[0].Email : null;
}

router.post('/users/:userId/toggle-pro', async (req, res) => {
  try {
    const { enable } = req.body || {};
    await billingService.toggleProStatus(req.params.userId, !!enable, 365);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/link-spouses', async (req, res) => {
  try {
    const { primaryEmail, spouseEmail } = req.body || {};
    if (!primaryEmail || !spouseEmail) {
      return res.status(400).json({ error: 'Informe os dois e-mails.' });
    }
    const tenantId = await billingService.linkSpousesByEmail(primaryEmail, spouseEmail);
    res.json({ ok: true, tenantId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;