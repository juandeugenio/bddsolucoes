const db = require('../db');
const { uid } = require('../utils/ids');

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[";\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildTransactionsCsv(transactions) {
  const header = 'Data;Descrição;Categoria;Conta;Tipo;Valor;Moeda';
  const lines = transactions.map((t) => {
    const date = new Date(t.Date).toLocaleDateString('pt-BR');
    const desc = t.Note || t.Obs || '';
    const category = t.CategoryName || '';
    const wallet = t.WalletName || '';
    const tipo = t.Kind === 0 ? 'Receita' : t.Kind === 2 ? 'Transferência' : 'Despesa';
    const value = String(t.Amount).replace('.', ',');
    return [
      csvEscape(date),
      csvEscape(desc),
      csvEscape(category),
      csvEscape(wallet),
      csvEscape(tipo),
      csvEscape(value),
      csvEscape(t.Currency || 'R$'),
    ].join(';');
  });
  return [header, ...lines].join('\n');
}

function parseCsv(text) {
  const rows = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ';' || ch === ',') {
        fields.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    rows.push(fields);
  }
  return rows;
}

function resolveType(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (['receita', 'income', 'renda', 'r', '+'].includes(v)) return 0;
  if (['transferência', 'transferencia', 'transfer', 't'].includes(v)) return 2;
  return 1;
}

function resolveDate(raw) {
  if (!raw) return new Date();
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Date.UTC(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])));
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function importCsv(tenantId, rows) {
  let created = 0;
  for (const r of rows) {
    try {
      const date = resolveDate(r.date);
      const desc = String(r.description || r.obs || '').trim();
      const type = r.type !== undefined && r.type !== null ? resolveType(r.type) : null;
      let kind = type;
      let amount = parseAmount(r.value);
      if (kind === null) {
        kind = amount < 0 ? 1 : 0;
      }
      if (kind === 1 && amount > 0) amount = -Math.abs(amount);
      else if (kind === 0 && amount < 0) amount = Math.abs(amount);

      let walletId = null;
      if (r.wallet) {
        const walletName = String(r.wallet).trim();
        let wallet = await db.queryOne(
          'SELECT * FROM Wallets WHERE TenantId = ? AND LOWER(Name) = LOWER(?)',
          [tenantId, walletName]
        );
        if (!wallet) {
          walletId = uid();
          await db.query(
            `INSERT INTO Wallets (Id, TenantId, Name, Icon, Color, InitialBalance, Currency, Kind, IsArchived, CreatedAt)
             VALUES (?, ?, ?, '💼', '#5B8DEF', 0, 'R$', 2, 0, UTC_TIMESTAMP())`,
            [walletId, tenantId, walletName]
          );
        } else {
          walletId = wallet.Id;
        }
      }

      let categoryId = null;
      if (r.category && kind !== 2) {
        const catName = String(r.category).trim();
        let cat = await db.queryOne(
          'SELECT * FROM Categories WHERE TenantId = ? AND Name = ?',
          [tenantId, catName]
        );
        if (!cat) {
          categoryId = uid();
          await db.query(
            `INSERT INTO Categories (Id, TenantId, Name, Icon, Color, Type, IsArchived, CreatedAt)
             VALUES (?, ?, ?, '🏷️', '#5B8DEF', ?, 0, UTC_TIMESTAMP())`,
            [categoryId, tenantId, catName, kind === 0 ? 1 : 0]
          );
        } else {
          categoryId = cat.Id;
        }
      }

      await db.query(
        `INSERT INTO Transactions (Id, TenantId, WalletId, CategoryId, CardId, CounterWalletId,
           RecurringSourceId, PayerMemberId, Kind, IsPaid, PaidDate, Obs, Amount, Currency, Note, Date, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, 1, NULL, ?, ?, 'R$', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          uid(),
          tenantId,
          walletId,
          categoryId,
          kind,
          desc || null,
          Math.abs(amount),
          desc || null,
          date,
        ]
      );
      created++;
    } catch (err) {
      // ignora linha com erro
    }
  }
  return { created, skipped: rows.length - created };
}

function parseAmount(raw) {
  if (typeof raw === 'number') return raw;
  const s = String(raw || '').trim();
  if (!s) return 0;
  let n = Number(s.replace(/[R$\s]/g, '').replace(',', '.'));
  if (isNaN(n)) {
    const m = s.match(/-?[\d.,]+/);
    if (m) {
      n = Number(m[0].replace(/\./g, '').replace(',', '.'));
    }
  }
  return isNaN(n) ? 0 : n;
}

// Preview: mapeia as linhas cruas do CSV para o formato exibido na tabela
function previewCsv(text) {
  const parsed = parseCsv(text);
  const rows = [];
  let headerIndex = -1;
  const headerMap = {
    data: 'date', descricao: 'description', categoria: 'category', conta: 'wallet',
    tipo: 'type', valor: 'value', moeda: 'currency', obs: 'description',
    descrição: 'description',
  };

  for (let i = 0; i < parsed.length; i++) {
    const fields = parsed[i];
    const first = String(fields[0] || '').trim().toLowerCase();
    if (headerMap[first] !== undefined && fields.length >= 6) {
      headerIndex = i;
      break;
    }
  }

  const start = headerIndex >= 0 ? headerIndex + 1 : 0;
  const headerFields = headerIndex >= 0 ? parsed[headerIndex] : null;

  for (let i = start; i < parsed.length; i++) {
    const fields = parsed[i];
    const row = {};
    if (headerFields) {
      fields.forEach((val, idx) => {
        const colName = String(headerFields[idx] || '').trim().toLowerCase();
        const key = headerMap[colName];
        if (key) row[key] = val;
      });
    } else {
      row.date = fields[0] || '';
      row.description = fields[1] || '';
      row.category = fields[2] || '';
      row.wallet = fields[3] || '';
      row.type = fields[4] || '';
      row.value = fields[5] || '';
      row.currency = fields[6] || '';
    }
    if (Object.values(row).some((v) => v !== undefined && v !== '')) {
      rows.push(row);
    }
  }
  return rows;
}

module.exports = { buildTransactionsCsv, parseCsv, importCsv, previewCsv };