const jwt = require('jsonwebtoken');
const config = require('../config');
const authService = require('../services/authService');
const tenantService = require('../services/tenantService');
const { readCookies } = require('./security');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  // Fallback: cookie HttpOnly
  const cookies = readCookies(req);
  return cookies['bdd.auth'] || null;
}

async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await authService.getUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida.' });
  }
}

async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      req.user = await authService.getUserById(payload.sub);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });
  const isAdmin = await authService.isInRole(req.user.Id, 'Admin');
  if (!isAdmin) return res.status(403).json({ error: 'Acesso restrito.' });
  next();
}

async function resolveTenant(req, res, next) {
  try {
    const tenantId = await tenantService.getActiveTenantId(req.user.Id);
    req.tenantId = tenantId;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { authenticate, optionalAuth, requireAdmin, resolveTenant };