const db = require('../db');
const authService = require('./authService');
const { uid, token64 } = require('../utils/ids');

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍝', color: '#F59E0B', type: 0 },
  { name: 'Supermercado', icon: '🥫', color: '#84CC16', type: 0 },
  { name: 'Transporte', icon: '🚘', color: '#06B6D4', type: 0 },
  { name: 'Moradia & Contas', icon: '🏠', color: '#8B5CF6', type: 0 },
  { name: 'Lazer & Viagens', icon: '🎵', color: '#EC4899', type: 0 },
  { name: 'Saúde & Bem-Estar', icon: '🏥', color: '#EF4444', type: 0 },
  { name: 'Salário', icon: '💰', color: '#22C55E', type: 1 },
  { name: 'Renda Extra / Freelance', icon: '💻', color: '#10B981', type: 1 },
  { name: 'Investimentos', icon: '📈', color: '#3B82F6', type: 1 },
];

async function seedDefaults(tenantId, conn) {
  const exec = conn ? conn : db;
  // db.query -> rows[]; conn.query -> [rows, fields]. Normaliza para rows[].
  const rowsOf = (res) => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res);
  const existing = rowsOf(
    await exec.query('SELECT COUNT(*) AS c FROM Categories WHERE TenantId = ?', [tenantId])
  );
  if (existing[0].c === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await exec.query(
        `INSERT INTO Categories (Id, TenantId, Name, Icon, Color, Type, IsArchived, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())`,
        [uid(), tenantId, cat.name, cat.icon, cat.color, cat.type]
      );
    }
  }
  const wallets = rowsOf(
    await exec.query('SELECT COUNT(*) AS c FROM Wallets WHERE TenantId = ?', [tenantId])
  );
  if (wallets[0].c === 0) {
    await exec.query(
      `INSERT INTO Wallets (Id, TenantId, Name, Icon, Color, InitialBalance, Currency, Kind, IsArchived, CreatedAt)
       VALUES (?, ?, 'Carteira / Conta Principal', '💼', '#5B8DEF', 0, 'R$', 2, 0, UTC_TIMESTAMP())`,
      [uid(), tenantId]
    );
  }
}

async function createTenant(ownerUserId, name, conn) {
  const exec = conn ? conn : db;
  const tenantId = uid();
  await exec.query(
    `INSERT INTO FinanceTenants (Id, OwnerUserId, Name, ControlMode, CreatedAt, Plan, PlanExpiresAt)
     VALUES (?, ?, ?, 0, UTC_TIMESTAMP(), 0, NULL)`,
    [tenantId, ownerUserId, name]
  );
  await exec.query(
    `INSERT INTO FinanceTenantMembers (Id, TenantId, UserId, Name, Email, Role, JoinedAt)
     VALUES (?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())`,
    [tenantId, tenantId, ownerUserId, name, null]
  );
  await exec.query(
    'INSERT INTO DataVersions (TenantId, Version) VALUES (?, 0)',
    [tenantId]
  );
  await seedDefaults(tenantId, exec);
  return tenantId;
}

async function getActiveTenantId(userId) {
  const user = await authService.getUserById(userId);
  if (!user) throw new Error('Usuário não encontrado.');

  if (user.ActiveTenantId) {
    const member = await db.queryOne(
      'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? AND UserId = ?',
      [user.ActiveTenantId, userId]
    );
    if (member) return member.TenantId;
  }

  const memberships = await db.query(
    `SELECT m.TenantId, t.CreatedAt FROM FinanceTenantMembers m
     JOIN FinanceTenants t ON t.Id = m.TenantId
     WHERE m.UserId = ? ORDER BY t.CreatedAt ASC`,
    [userId]
  );

  if (memberships.length > 0) {
    const tenantId = memberships[0].TenantId;
    await db.query('UPDATE Users SET ActiveTenantId = ? WHERE Id = ?', [
      tenantId,
      userId,
    ]);
    return tenantId;
  }

  // Cria tenant automático + defaults
  const tenantId = await createTenant(userId, 'Minhas Finanças');
  await db.query('UPDATE Users SET ActiveTenantId = ? WHERE Id = ?', [
    tenantId,
    userId,
  ]);
  return tenantId;
}

async function getUserTenants(userId) {
  return db.query(
    `SELECT t.* FROM FinanceTenants t
     JOIN FinanceTenantMembers m ON m.TenantId = t.Id
     WHERE m.UserId = ?
     ORDER BY t.CreatedAt DESC`,
    [userId]
  );
}

async function switchTenant(userId, tenantId) {
  const member = await db.queryOne(
    'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? AND UserId = ?',
    [tenantId, userId]
  );
  if (!member) return false;
  await db.query('UPDATE Users SET ActiveTenantId = ? WHERE Id = ?', [
    tenantId,
    userId,
  ]);
  return true;
}

async function getMembers(tenantId) {
  return db.query(
    'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? ORDER BY JoinedAt ASC',
    [tenantId]
  );
}

async function getMembersWithUser(tenantId) {
  return db.query(
    `SELECT m.*, u.DefaultCurrency, u.NotificationsEnabled
     FROM FinanceTenantMembers m
     LEFT JOIN Users u ON u.Id = m.UserId
     WHERE m.TenantId = ? ORDER BY m.JoinedAt ASC`,
    [tenantId]
  );
}

async function getControlMode(tenantId) {
  const t = await db.queryOne(
    'SELECT ControlMode FROM FinanceTenants WHERE Id = ?',
    [tenantId]
  );
  return t ? t.ControlMode : 0;
}

async function setControlMode(tenantId, mode) {
  await db.query('UPDATE FinanceTenants SET ControlMode = ? WHERE Id = ?', [
    mode,
    tenantId,
  ]);
}

async function getInvites(tenantId) {
  return db.query(
    `SELECT * FROM FinanceTenantInvites WHERE TenantId = ? AND Status = 0
     ORDER BY CreatedAt DESC`,
    [tenantId]
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function createInvite(userId, tenantId, email) {
  const member = await db.queryOne(
    'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? AND UserId = ?',
    [tenantId, userId]
  );
  if (!member) throw new Error('Você não é membro deste espaço.');

  email = String(email || '').trim();
  if (!isValidEmail(email)) throw new Error('E-mail inválido.');

  const dup = await db.queryOne(
    'SELECT * FROM FinanceTenantInvites WHERE TenantId = ? AND Email = ? AND Status = 0',
    [tenantId, email]
  );
  if (dup) throw new Error('Já existe um convite pendente para este e-mail.');

  const invite = {
    Id: uid(),
    TenantId: tenantId,
    Email: email,
    Token: token64(),
    CreatedByUserId: userId,
    Status: 0,
    CreatedAt: new Date(),
    ExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  await db.query(
    `INSERT INTO FinanceTenantInvites (Id, TenantId, Email, Token, CreatedByUserId, Status, CreatedAt, ExpiresAt)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      invite.Id,
      tenantId,
      email,
      invite.Token,
      userId,
      invite.CreatedAt,
      invite.ExpiresAt,
    ]
  );
  return invite;
}

async function acceptInvite(userId, token) {
  const invite = await db.queryOne(
    'SELECT * FROM FinanceTenantInvites WHERE Token = ?',
    [token]
  );
  if (!invite) throw new Error('Convite inválido.');

  if (invite.Status === 2) throw new Error('Este convite foi revogado.');
  if (invite.ExpiresAt && new Date(invite.ExpiresAt) < new Date()) {
    await db.query(
      'UPDATE FinanceTenantInvites SET Status = 3 WHERE Id = ?',
      [invite.Id]
    );
    throw new Error('Este convite expirou.');
  }

  const existing = await db.queryOne(
    'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? AND UserId = ?',
    [invite.TenantId, userId]
  );
  if (existing) {
    await db.query('UPDATE Users SET ActiveTenantId = ? WHERE Id = ?', [
      invite.TenantId,
      userId,
    ]);
    return invite.TenantId;
  }

  const user = await authService.getUserById(userId);
  await db.query(
    `INSERT INTO FinanceTenantMembers (Id, TenantId, UserId, Name, Email, Role, JoinedAt)
     VALUES (?, ?, ?, ?, ?, 1, UTC_TIMESTAMP())`,
    [uid(), invite.TenantId, userId, user.UserName, user.Email]
  );
  await db.query('UPDATE FinanceTenantInvites SET Status = 1, AcceptedByUserId = ?, AcceptedAt = UTC_TIMESTAMP() WHERE Id = ?', [
    userId,
    invite.Id,
  ]);
  await db.query('UPDATE Users SET ActiveTenantId = ? WHERE Id = ?', [
    invite.TenantId,
    userId,
  ]);
  return invite.TenantId;
}

async function revokeInvite(userId, inviteId) {
  const invite = await db.queryOne(
    'SELECT * FROM FinanceTenantInvites WHERE Id = ?',
    [inviteId]
  );
  if (!invite) throw new Error('Convite não encontrado.');
  const member = await db.queryOne(
    'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? AND UserId = ?',
    [invite.TenantId, userId]
  );
  if (!member) throw new Error('Você não é membro deste espaço.');
  await db.query('UPDATE FinanceTenantInvites SET Status = 2 WHERE Id = ?', [
    inviteId,
  ]);
}

async function setTimezone(userId, timezone) {
  await db.query('UPDATE Users SET Timezone = ? WHERE Id = ?', [
    timezone,
    userId,
  ]);
}

async function getActiveTenantIdForDisplay(userId) {
  const user = await authService.getUserById(userId);
  if (!user) return null;
  if (user.ActiveTenantId) {
    const member = await db.queryOne(
      'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? AND UserId = ?',
      [user.ActiveTenantId, userId]
    );
    if (member) return user.ActiveTenantId;
  }
  const rows = await db.query(
    `SELECT m.TenantId FROM FinanceTenantMembers m
     JOIN FinanceTenants t ON t.Id = m.TenantId
     WHERE m.UserId = ? ORDER BY t.CreatedAt ASC LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? rows[0].TenantId : null;
}

module.exports = {
  DEFAULT_CATEGORIES,
  seedDefaults,
  createTenant,
  getActiveTenantId,
  getUserTenants,
  switchTenant,
  getMembers,
  getMembersWithUser,
  getControlMode,
  setControlMode,
  getInvites,
  createInvite,
  acceptInvite,
  revokeInvite,
  setTimezone,
  getActiveTenantIdForDisplay,
};