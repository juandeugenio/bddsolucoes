const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { uid } = require('../utils/ids');

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.Id,
      email: user.Email,
      name: user.UserName,
      role: user.Role || null,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function normalizeEmail(email) {
  return String(email || '').trim().toUpperCase();
}

async function getUserById(id) {
  return db.queryOne(
    `SELECT u.*, r.Name AS Role
     FROM Users u
     LEFT JOIN UserRoles ur ON ur.UserId = u.Id
     LEFT JOIN Roles r ON r.Id = ur.RoleId
     WHERE u.Id = ?`,
    [id]
  );
}

async function getUserByEmail(email) {
  return db.queryOne(
    `SELECT u.*, r.Name AS Role
     FROM Users u
     LEFT JOIN UserRoles ur ON ur.UserId = u.Id
     LEFT JOIN Roles r ON r.Id = ur.RoleId
     WHERE u.NormalizedEmail = ?`,
    [normalizeEmail(email)]
  );
}

async function getUserByUserName(userName) {
  return db.queryOne('SELECT * FROM Users WHERE NormalizedUserName = ?', [
    String(userName).toUpperCase(),
  ]);
}

async function createUser({ userName, email, password, defaultCurrency = 'R$' }) {
  const id = uid();
  const user = {
    Id: id,
    UserName: userName,
    NormalizedUserName: String(userName).toUpperCase(),
    Email: email,
    NormalizedEmail: normalizeEmail(email),
    EmailConfirmed: 1,
    PasswordHash: hashPassword(password),
    ConcurrencyStamp: uid(),
    DefaultCurrency: defaultCurrency,
    Timezone: 'America/Sao_Paulo',
    NotificationsEnabled: 1,
    Plan: 0,
  };
  await db.query(
    `INSERT INTO Users (Id, UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed,
      PasswordHash, ConcurrencyStamp, DefaultCurrency, Timezone, NotificationsEnabled, Plan)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1, 0)`,
    [
      user.Id,
      user.UserName,
      user.NormalizedUserName,
      user.Email,
      user.NormalizedEmail,
      user.PasswordHash,
      user.ConcurrencyStamp,
      user.DefaultCurrency,
      user.Timezone,
    ]
  );
  return getUserById(id);
}

async function ensureRole(name) {
  const role = await db.queryOne('SELECT * FROM Roles WHERE NormalizedName = ?', [
    name.toUpperCase(),
  ]);
  if (role) return role;
  const id = uid();
  await db.query(
    'INSERT INTO Roles (Id, Name, NormalizedName) VALUES (?, ?, ?)',
    [id, name, name.toUpperCase()]
  );
  return { Id: id, Name: name };
}

async function assignRole(userId, roleName) {
  const role = await ensureRole(roleName);
  const exists = await db.queryOne(
    'SELECT * FROM UserRoles WHERE UserId = ? AND RoleId = ?',
    [userId, role.Id]
  );
  if (!exists) {
    await db.query('INSERT INTO UserRoles (UserId, RoleId) VALUES (?, ?)', [
      userId,
      role.Id,
    ]);
  }
}

async function isInRole(userId, roleName) {
  const row = await db.queryOne(
    `SELECT 1 AS found FROM UserRoles ur
     JOIN Roles r ON r.Id = ur.RoleId
     WHERE ur.UserId = ? AND r.NormalizedName = ?`,
    [userId, roleName.toUpperCase()]
  );
  return !!row;
}

function generatePasswordResetToken() {
  return uid() + uid();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  getUserById,
  getUserByEmail,
  getUserByUserName,
  createUser,
  ensureRole,
  assignRole,
  isInRole,
  normalizeEmail,
  generatePasswordResetToken,
};