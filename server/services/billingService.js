const db = require('../db');
const authService = require('./authService');
const tenantService = require('./tenantService');
const { uid } = require('../utils/ids');

const Plan = { Free: 0, Pro: 1 };

function maxWallets(plan) {
  return plan === Plan.Pro ? Infinity : 3;
}
function maxSplitGroups(plan) {
  return plan === Plan.Pro ? Infinity : 2;
}
function maxRecurring(plan) {
  return plan === Plan.Pro ? Infinity : 3;
}

function isExpired(planExpiresAt) {
  if (!planExpiresAt) return false;
  return new Date(planExpiresAt) < new Date();
}

async function getTenant(tenantId) {
  return db.queryOne('SELECT * FROM FinanceTenants WHERE Id = ?', [tenantId]);
}

async function getPlan(userId) {
  const user = await authService.getUserById(userId);
  if (!user) return Plan.Free;

  if (user.Plan === Plan.Pro && !isExpired(user.PlanExpiresAt)) {
    return Plan.Pro;
  }

  if (user.ActiveTenantId) {
    const tenant = await getTenant(user.ActiveTenantId);
    if (tenant && tenant.Plan === Plan.Pro && !isExpired(tenant.PlanExpiresAt)) {
      return Plan.Pro;
    }
    if (tenant && tenant.Plan === Plan.Pro && isExpired(tenant.PlanExpiresAt)) {
      await db.query('UPDATE FinanceTenants SET Plan = 0, PlanExpiresAt = NULL WHERE Id = ?', [
        tenant.Id,
      ]);
    }
  }

  if (user.Plan === Plan.Pro && isExpired(user.PlanExpiresAt)) {
    await db.query('UPDATE Users SET Plan = 0, PlanExpiresAt = NULL WHERE Id = ?', [
      user.Id,
    ]);
  }

  return Plan.Free;
}

async function isPro(userId) {
  return (await getPlan(userId)) === Plan.Pro;
}

async function upgradeToPro(userId, months = 12) {
  const user = await authService.getUserById(userId);
  if (!user) throw new Error('Usuário não encontrado.');

  const base =
    user.Plan === Plan.Pro && !isExpired(user.PlanExpiresAt)
      ? new Date(user.PlanExpiresAt)
      : new Date();
  const expires = new Date(base);
  expires.setMonth(expires.getMonth() + months);

  await db.query('UPDATE Users SET Plan = 1, PlanExpiresAt = ? WHERE Id = ?', [
    expires,
    userId,
  ]);

  if (user.ActiveTenantId) {
    await db.query(
      'UPDATE FinanceTenants SET Plan = 1, PlanExpiresAt = ? WHERE Id = ?',
      [expires, user.ActiveTenantId]
    );
  }
}

async function downgrade(userId) {
  const user = await authService.getUserById(userId);
  if (!user) return;
  await db.query('UPDATE Users SET Plan = 0, PlanExpiresAt = NULL WHERE Id = ?', [
    userId,
  ]);
  if (user.ActiveTenantId) {
    await db.query(
      'UPDATE FinanceTenants SET Plan = 0, PlanExpiresAt = NULL WHERE Id = ?',
      [user.ActiveTenantId]
    );
  }
}

async function toggleProStatus(userId, enablePro, durationDays = 365) {
  const user = await authService.getUserById(userId);
  if (!user) throw new Error('Usuário não encontrado.');

  if (enablePro) {
    const base =
      user.Plan === Plan.Pro && !isExpired(user.PlanExpiresAt)
        ? new Date(user.PlanExpiresAt)
        : new Date();
    const expires = new Date(base);
    expires.setDate(expires.getDate() + durationDays);
    await db.query('UPDATE Users SET Plan = 1, PlanExpiresAt = ? WHERE Id = ?', [
      expires,
      userId,
    ]);
    if (user.ActiveTenantId) {
      await db.query(
        'UPDATE FinanceTenants SET Plan = 1, PlanExpiresAt = ? WHERE Id = ?',
        [expires, user.ActiveTenantId]
      );
    }
  } else {
    await downgrade(userId);
  }
}

async function getAdminUserList() {
  return db.query(
    `SELECT u.Id AS UserId, u.Email, u.UserName, u.Plan, u.PlanExpiresAt, u.ActiveTenantId,
            t.Name AS TenantName
     FROM Users u
     LEFT JOIN FinanceTenants t ON t.Id = u.ActiveTenantId
     ORDER BY u.Email ASC`
  );
}

async function linkSpousesByEmail(primaryEmail, spouseEmail) {
  const primary = await authService.getUserByEmail(primaryEmail);
  const spouse = await authService.getUserByEmail(spouseEmail);
  if (!primary || !spouse) throw new Error('Um dos e-mails não corresponde a um usuário.');

  let tenantId = primary.ActiveTenantId;
  if (!tenantId) {
    tenantId = await db.transaction(async (conn) => {
      const tid = uid();
      await conn.query(
        `INSERT INTO FinanceTenants (Id, OwnerUserId, Name, ControlMode, CreatedAt, Plan, PlanExpiresAt)
         VALUES (?, ?, ?, 0, UTC_TIMESTAMP(), 0, NULL)`,
        [tid, primary.Id, 'Minhas Finanças']
      );
      await conn.query(
        `INSERT INTO FinanceTenantMembers (Id, TenantId, UserId, Name, Email, Role, JoinedAt)
         VALUES (?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())`,
        [uid(), tid, primary.Id, primary.UserName, primary.Email]
      );
      await conn.query('INSERT INTO DataVersions (TenantId, Version) VALUES (?, 0)', [tid]);
      await tenantService.seedDefaults(tid, conn);
      return tid;
    });
  }

  const spouseMember = await db.queryOne(
    'SELECT * FROM FinanceTenantMembers WHERE TenantId = ? AND UserId = ?',
    [tenantId, spouse.Id]
  );
  if (!spouseMember) {
    await db.query(
      `INSERT INTO FinanceTenantMembers (Id, TenantId, UserId, Name, Email, Role, JoinedAt)
       VALUES (?, ?, ?, ?, ?, 1, UTC_TIMESTAMP())`,
      [uid(), tenantId, spouse.Id, spouse.UserName, spouse.Email]
    );
  }

  await db.query('UPDATE Users SET ActiveTenantId = ? WHERE Id IN (?, ?)', [
    tenantId,
    primary.Id,
    spouse.Id,
  ]);

  const tenant = await getTenant(tenantId);
  const primaryPro =
    primary.Plan === Plan.Pro && !isExpired(primary.PlanExpiresAt);
  const spousePro = spouse.Plan === Plan.Pro && !isExpired(spouse.PlanExpiresAt);
  if (primaryPro || spousePro) {
    const expires =
      primaryPro && !isExpired(primary.PlanExpiresAt)
        ? new Date(primary.PlanExpiresAt)
        : new Date(spouse.PlanExpiresAt);
    await db.query(
      'UPDATE FinanceTenants SET Plan = 1, PlanExpiresAt = ? WHERE Id = ?',
      [expires, tenantId]
    );
    await db.query('UPDATE Users SET Plan = 1, PlanExpiresAt = ? WHERE Id IN (?, ?)', [
      expires,
      primary.Id,
      spouse.Id,
    ]);
  }

  return tenantId;
}

module.exports = {
  Plan,
  maxWallets,
  maxSplitGroups,
  maxRecurring,
  getPlan,
  isPro,
  upgradeToPro,
  downgrade,
  toggleProStatus,
  getAdminUserList,
  linkSpousesByEmail,
  getTenant,
};