const express = require('express');
const authService = require('../services/authService');
const tenantService = require('../services/tenantService');
const emailService = require('../services/emailService');
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { setAuthCookie, setCsrfCookie, clearAuthCookie, rateLimit } = require('../middleware/security');
const config = require('../config');
const crypto = require('crypto');

const router = express.Router();

// Auth é o alvo de brute-force: limita tentativas
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { userName, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }
    const existing = await authService.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }
    const user = await authService.createUser({
      userName: userName || email.split('@')[0],
      email,
      password,
    });

    // Gera token de confirmação de e-mail (se SMTP configurado)
    if (emailService.isConfigured()) {
      const confirmToken = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await db.query(
        `INSERT INTO UserTokens (UserId, LoginProvider, Name, Value)
         VALUES (?, 'EmailConfirmation', 'EmailConfirmation', ?)
         ON DUPLICATE KEY UPDATE Value = VALUES(Value)`,
        [user.Id, JSON.stringify({ token: confirmToken, expiresAt })]
      );
      const confirmUrl = `${req.protocol}://${req.get('host')}/confirm-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(confirmToken)}`;
      await emailService.send(
        user.Email,
        'Confirme seu e-mail - BDD Soluções Financeiras',
        `<p>Bem-vindo ao BDD! Confirme seu e-mail clicando no link abaixo (válido por 24h):</p><p><a href="${confirmUrl}">Confirmar e-mail</a></p>`
      );
    }

    const token = authService.signToken(user);
    setAuthCookie(res, token);
    setCsrfCookie(res);
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    const user = await authService.getUserByEmail(email);
    if (!user || !authService.verifyPassword(password, user.PasswordHash)) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    const token = authService.signToken(user);
    setAuthCookie(res, token);
    setCsrfCookie(res);
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

router.post('/forgot-password', optionalAuth, async (req, res) => {
  try {
    const { email } = req.body || {};
    const user = await authService.getUserByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
      // Persiste o token seguindo o padrão Identity (UserTokens)
      await db.query(
        `INSERT INTO UserTokens (UserId, LoginProvider, Name, Value)
         VALUES (?, 'ResetPassword', 'ResetPassword', ?)
         ON DUPLICATE KEY UPDATE Value = VALUES(Value)`,
        [user.Id, JSON.stringify({ token, expiresAt })]
      );
      if (emailService.isConfigured()) {
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
        await emailService.send(
          user.Email,
          'Redefinição de senha - BDD Soluções Financeiras',
          `<p>Para redefinir sua senha, clique no link abaixo (válido por 1 hora):</p><p><a href="${resetUrl}">Redefinir senha</a></p>`
        );
      }
    }
    // Não revela se o e-mail existe
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body || {};
    if (!email || !token || !password) {
      return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }
    const user = await authService.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const stored = await db.queryOne(
      `SELECT Value FROM UserTokens WHERE UserId = ? AND LoginProvider = 'ResetPassword' AND Name = 'ResetPassword'`,
      [user.Id]
    );
    if (!stored) return res.status(400).json({ error: 'Link inválido ou expirado.' });

    let payload;
    try {
      payload = JSON.parse(stored.Value);
    } catch {
      return res.status(400).json({ error: 'Link inválido ou expirado.' });
    }
    if (payload.token !== token) {
      return res.status(400).json({ error: 'Link inválido ou expirado.' });
    }
    if (new Date(payload.expiresAt) < new Date()) {
      await db.query(
        `DELETE FROM UserTokens WHERE UserId = ? AND LoginProvider = 'ResetPassword' AND Name = 'ResetPassword'`,
        [user.Id]
      );
      return res.status(400).json({ error: 'Link expirado. Solicite um novo.' });
    }

    const hash = authService.hashPassword(password);
    await db.query('UPDATE Users SET PasswordHash = ?, ConcurrencyStamp = ? WHERE Id = ?', [
      hash,
      crypto.randomUUID(),
      user.Id,
    ]);
    await db.query(
      `DELETE FROM UserTokens WHERE UserId = ? AND LoginProvider = 'ResetPassword' AND Name = 'ResetPassword'`,
      [user.Id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirmação de e-mail no registro
router.get('/confirm-email', async (req, res) => {
  try {
    const { email, token } = req.query;
    if (!email || !token) {
      return res.status(400).json({ error: 'Link inválido.' });
    }
    const user = await authService.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const stored = await db.queryOne(
      `SELECT Value FROM UserTokens WHERE UserId = ? AND LoginProvider = 'EmailConfirmation' AND Name = 'EmailConfirmation'`,
      [user.Id]
    );
    let payload = null;
    if (stored) {
      try {
        payload = JSON.parse(stored.Value);
      } catch { /* inválido */ }
    }
    if (!payload || payload.token !== token) {
      return res.status(400).json({ error: 'Link inválido ou expirado.' });
    }
    if (new Date(payload.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Link expirado.' });
    }

    await db.query('UPDATE Users SET EmailConfirmed = 1 WHERE Id = ?', [user.Id]);
    await db.query(
      `DELETE FROM UserTokens WHERE UserId = ? AND LoginProvider = 'EmailConfirmation' AND Name = 'EmailConfirmation'`,
      [user.Id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/google', authLimiter, async (req, res) => {
  try {
    const { credential, email, name } = req.body || {};
    if (!config.google.clientId) {
      return res.status(400).json({ error: 'Login com Google não configurado.' });
    }
    if (!email) {
      return res.status(400).json({ error: 'E-mail não informado.' });
    }
    let user = await authService.getUserByEmail(email);
    if (!user) {
      user = await authService.createUser({
        userName: name || email.split('@')[0],
        email,
        password: crypto.randomBytes(24).toString('hex'),
      });
    }
    const token = authService.signToken(user);
    setAuthCookie(res, token);
    setCsrfCookie(res);
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function toPublicUser(user) {
  return {
    id: user.Id,
    email: user.Email,
    userName: user.UserName,
    defaultCurrency: user.DefaultCurrency,
    activeTenantId: user.ActiveTenantId,
    plan: user.Plan,
    timezone: user.Timezone,
    notificationsEnabled: user.NotificationsEnabled === 1 || user.NotificationsEnabled === true,
    role: user.Role,
  };
}

module.exports = router;