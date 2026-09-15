const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
      timezone: 'Z',
      dateStrings: false,
      decimalNumbers: true,
      supportBigNumbers: true,
    });
  }
  return pool;
}

async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function transaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function initSchema() {
  const conn = await getPool().getConnection();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    // Remove linhas de comentário e divide por ponto-e-vírgula
    const noComments = schema
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    const statements = noComments
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await conn.query(stmt);
    }

    // Migrações incrementais idempotentes (CREATE TABLE IF NOT EXISTS não altera colunas novas)
    // MySQL 8 não suporta ADD COLUMN IF NOT EXISTS; verifica por information_schema.
    const colCheck = await conn.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExchangeRates' AND COLUMN_NAME = 'CreatedByUserId'`
    );
    if (colCheck[0][0].c === 0) {
      await conn.query(
        "ALTER TABLE `ExchangeRates` ADD COLUMN `CreatedByUserId` VARCHAR(128) NULL AFTER `Source`"
      );
    }

    const pmCheck = await conn.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Transactions' AND COLUMN_NAME = 'PaymentMethodName'`
    );
    if (pmCheck[0][0].c === 0) {
      await conn.query(
        "ALTER TABLE `Transactions` ADD COLUMN `PaymentMethodName` VARCHAR(60) NULL AFTER `Obs`"
      );
    }

    console.log('[db] Schema MySQL aplicado com sucesso.');
  } catch (err) {
    console.error('[db] Erro ao aplicar schema:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { getPool, query, queryOne, transaction, initSchema };