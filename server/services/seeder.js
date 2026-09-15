const db = require('../db');
const authService = require('./authService');
const tenantService = require('./tenantService');
const config = require('../config');

async function seedAdmin() {
  if (!config.admin.email || !config.admin.password) {
    return;
  }
  const email = config.admin.email.trim();
  let admin = await authService.getUserByEmail(email);
  if (!admin) {
    admin = await authService.createUser({
      userName: email,
      email,
      password: config.admin.password,
    });
    await db.query('UPDATE Users SET EmailConfirmed = 1 WHERE Id = ?', [admin.Id]);
  }
  await authService.assignRole(admin.Id, 'Admin');

  // Garante tenant de suporte para o admin
  const tenants = await db.query(
    'SELECT * FROM FinanceTenantMembers WHERE UserId = ?',
    [admin.Id]
  );
  if (tenants.length === 0) {
    await tenantService.createTenant(admin.Id, 'Finanças Admin Suporte');
  }
}

module.exports = { seedAdmin };