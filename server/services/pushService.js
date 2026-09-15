const webpush = require('web-push');
const config = require('../config');
const db = require('../db');
const { uid, sha256 } = require('../utils/ids');

function isConfigured() {
  return Boolean(config.vapid.publicKey && config.vapid.privateKey);
}

function init() {
  if (isConfigured()) {
    webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
  }
}

function getPublicKeyForJs() {
  return config.vapid.publicKey;
}

async function subscribe(userId, endpoint, p256dh, auth) {
  const existing = await db.queryOne(
    'SELECT * FROM PushSubscriptions WHERE EndpointHash = ?',
    [sha256(endpoint)]
  );
  if (existing) {
    await db.query(
      'UPDATE PushSubscriptions SET P256Dh = ?, Auth = ?, UserId = ? WHERE Id = ?',
      [p256dh || '', auth || '', userId, existing.Id]
    );
    return existing.Id;
  }
  const id = uid();
  await db.query(
    `INSERT INTO PushSubscriptions (Id, UserId, Endpoint, EndpointHash, P256Dh, Auth, CreatedAt)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [id, userId, endpoint, sha256(endpoint), p256dh || '', auth || '']
  );
  return id;
}

async function unsubscribe(endpoint) {
  await db.query('DELETE FROM PushSubscriptions WHERE EndpointHash = ?', [
    sha256(endpoint),
  ]);
}

async function sendToUser(userId, title, body, url) {
  if (!isConfigured()) return 0;
  const subs = await db.query(
    'SELECT * FROM PushSubscriptions WHERE UserId = ?',
    [userId]
  );
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.Endpoint,
          keys: { p256dh: sub.P256Dh, auth: sub.Auth },
        },
        JSON.stringify({ title, body, url, icon: '/icon.svg' })
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.query('DELETE FROM PushSubscriptions WHERE Id = ?', [sub.Id]);
      }
    }
  }
  return sent;
}

async function notifyTenantOtherMembers(tenantId, senderUserId, title, body, url) {
  if (!isConfigured()) return 0;
  const members = await db.query(
    `SELECT m.UserId FROM FinanceTenantMembers m
     JOIN Users u ON u.Id = m.UserId
     WHERE m.TenantId = ? AND m.UserId <> ? AND u.NotificationsEnabled = 1`,
    [tenantId, senderUserId]
  );
  let total = 0;
  for (const m of members) {
    total += await sendToUser(m.UserId, title, body, url);
  }
  return total;
}

module.exports = {
  isConfigured,
  init,
  getPublicKeyForJs,
  subscribe,
  unsubscribe,
  sendToUser,
  notifyTenantOtherMembers,
};