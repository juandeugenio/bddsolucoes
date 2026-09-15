const db = require('../db');

async function bump(tenantId, conn) {
  const exec = conn || db;
  await exec.query(
    `INSERT INTO DataVersions (TenantId, Version) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE Version = Version + 1`,
    [tenantId]
  );
}

async function getVersion(tenantId) {
  const row = await db.queryOne(
    'SELECT Version FROM DataVersions WHERE TenantId = ?',
    [tenantId]
  );
  return row ? Number(row.Version) : 0;
}

module.exports = { bump, getVersion };