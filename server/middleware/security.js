const crypto = require('crypto');

// ===== Configuração de cookies =====
// JWT fica em cookie HttpOnly (inacessível a JS) + SameSite=Strict (bloqueia CSRF cross-site).
function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production' && process.env.DISABLE_HTTPS_REDIRECT !== 'true';
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias (mesmo do JWT)
  };
}

function setAuthCookie(res, token) {
  res.cookie('bdd.auth', token, cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie('bdd.auth', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  res.clearCookie('bdd.csrf', { secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
}

function setCsrfCookie(res) {
  const csrfToken = crypto.randomBytes(32).toString('base64url');
  res.cookie('bdd.csrf', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return csrfToken;
}

function readCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

// ===== Headers de segurança (equivalente ao helmet, sem dependência) =====
function securityHeaders(req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // CSP conservador (o app usa estilos inline e fontes locais; sem script externo de terceiros)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https://api.qrserver.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'"
  );
  next();
}

// ===== Proteção CSRF (double-submit cookie) =====
// Todas as mutações (POST/PUT/DELETE) precisam do header X-CSRF-Token igual ao cookie bdd.csrf.
function csrfProtection(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const cookies = readCookies(req);
  const cookieToken = cookies['bdd.csrf'];
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Token CSRF inválido.' });
  }
  next();
}

// ===== Rate limiting simples (anti brute-force) em memória =====
const rateBuckets = new Map();

function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message = 'Muitas tentativas. Tente novamente mais tarde.' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count++;
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    // Limpa buckets antigos para não acumular
    if (rateBuckets.size > 10000) {
      for (const [k, v] of rateBuckets) {
        if (v.resetAt <= now) rateBuckets.delete(k);
      }
    }
    next();
  };
}

module.exports = {
  cookieOptions,
  setAuthCookie,
  clearAuthCookie,
  setCsrfCookie,
  readCookies,
  securityHeaders,
  csrfProtection,
  rateLimit,
};