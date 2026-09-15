const express = require('express');
const db = require('../db');
const { uid } = require('../utils/ids');
const balanceService = require('../services/balanceService');
const recurrenceService = require('../services/recurrenceService');
const tenantService = require('../services/tenantService');
const pushService = require('../services/pushService');
const syncService = require('../services/syncService');
const csvService = require('../services/csvService');
const { authenticate, resolveTenant } = require('../middleware/auth');
const { tryParseAmount } = require('../utils/money');
const { daysInMonth, toUtc } = require('../utils/dates');
const { validateRefs } = require('../utils/refs');

const router = express.Router();
router.use(authenticate, resolveTenant);

async function findOrCreateWallet(tenantId, name, kind) {
  const wallet = await db.queryOne(
    'SELECT * FROM Wallets WHERE TenantId = ? AND Name = ? AND IsArchived = 0',
    [tenantId, name]
  );
  if (wallet) return wallet;
  const id = uid();
  const icons = { 0: '💳', 1: '💵', 2: '🏦', 4: '📱' };
  await db.query(
    `INSERT INTO Wallets (Id, TenantId, Name, Icon, Color, InitialBalance, Currency, Kind, IsArchived, CreatedAt)
     VALUES (?, ?, ?, ?, '#5B8DEF', 0, 'R$', ?, 0, UTC_TIMESTAMP())`,
    [id, tenantId, name, icons[kind] || '💼', kind]
  );
  return { Id: id };
}

async function findOrCreateCard(tenantId, name) {
  const card = await db.queryOne(
    'SELECT * FROM CreditCards WHERE TenantId = ? AND Name = ? AND IsArchived = 0',
    [tenantId, name]
  );
  if (card) return card;
  const id = uid();
  await db.query(
    `INSERT INTO CreditCards (Id, TenantId, Name, Icon, Color, ClosingDay, DueDay, Limit, IsArchived, CreatedAt)
     VALUES (?, ?, ?, 'credit-card', '#9675FF', 1, 5, NULL, 0, UTC_TIMESTAMP())`,
    [id, tenantId, name]
  );
  return { Id: id };
}

async function createTransaction(tenantId, data) {
  const id = uid();
  await db.query(
    `INSERT INTO Transactions (Id, TenantId, WalletId, CategoryId, CardId, CounterWalletId,
       RecurringSourceId, PayerMemberId, Kind, IsPaid, PaidDate, Obs, PaymentMethodName, Amount, Currency, Note, Date, CreatedAt, UpdatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      id,
      tenantId,
      data.walletId || null,
      data.categoryId || null,
      data.cardId || null,
      data.counterWalletId || null,
      data.recurringSourceId || null,
      data.payerMemberId || null,
      data.kind,
      data.isPaid ? 1 : 0,
      data.paidDate || null,
      data.obs || null,
      data.paymentMethodName || null,
      data.amount,
      data.currency || 'R$',
      data.note || null,
      data.date,
    ]
  );
  return id;
}

router.get('/', async (req, res) => {
  try {
    const { year, month } = parseYearMonth(req.query);
    await recurrenceService.generateDue(req.tenantId, new Date(Date.UTC(year, month - 1, daysInMonth(year, month))));
    const transactions = await balanceService.getMonthTransactions(req.tenantId, year, month);
    const wallets = await db.query(
      'SELECT * FROM Wallets WHERE TenantId = ? AND IsArchived = 0 ORDER BY Name ASC',
      [req.tenantId]
    );
    const categories = await db.query(
      'SELECT * FROM Categories WHERE TenantId = ? AND IsArchived = 0 ORDER BY Name ASC',
      [req.tenantId]
    );
    const cards = await db.query(
      'SELECT * FROM CreditCards WHERE TenantId = ? AND IsArchived = 0 ORDER BY Name ASC',
      [req.tenantId]
    );
    const members = await tenantService.getMembers(req.tenantId);
    res.json({ transactions, wallets, categories, cards, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const amount = tryParseAmount(body.amount);
    if (amount === null || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido.' });
    }
    const kind = body.kind;
    const method = body.method; // nome do método/carteira
    const methodKind = body.methodKind; // WalletKind
    const walletIdBody = body.walletId; // ID direto da carteira
    const cardName = body.cardName;
    const cardIdBody = body.cardId;
    const installments = parseInt(body.installments, 10) || 1;
    const isRecurring = body.isRecurring;
    const frequency = body.frequency;
    const startDate = body.startDate ? toUtc(body.startDate) : new Date();
    const date = body.date ? toUtc(body.date) : new Date();
    const note = body.note || '';
    const categoryId = body.categoryId || null;
    const payerMemberId = body.payerMemberId || null;
    const isPaid = body.isPaid !== false;
    const paidDate = body.paidDate || null;
    const obs = body.obs || null;

    let wallet = null;
    if (walletIdBody) {
      wallet = await db.queryOne(
        'SELECT * FROM Wallets WHERE Id = ? AND TenantId = ?',
        [walletIdBody, req.tenantId]
      );
    } else if (method) {
      wallet = await findOrCreateWallet(req.tenantId, method, methodKind);
    }
    let card = null;
    if (cardIdBody) {
      card = await db.queryOne(
        'SELECT * FROM CreditCards WHERE Id = ? AND TenantId = ?',
        [cardIdBody, req.tenantId]
      );
    } else if (cardName) {
      card = await findOrCreateCard(req.tenantId, cardName);
    }

    // Auditoria F2: valida que todas as referências pertencem ao tenant do chamador.
    const refError = await validateRefs(req.tenantId, {
      categoryId,
      walletId: wallet ? wallet.Id : null,
      cardId: card ? card.Id : null,
      payerMemberId,
      counterWalletId: body.counterWalletId || null,
    });
    if (refError) {
      return res.status(400).json({ error: refError });
    }

    // Instalmentas
    let createdIds = [];
    const n = installments > 1 ? installments : 1;
    for (let i = 0; i < n; i++) {
      const occurrence = i + 1;
      const occurrenceNote =
        n > 1 ? `${note} (${occurrence}/${n})` : note;
      const d = new Date(date);
      d.setMonth(d.getMonth() + i);
      const txAmount =
        n > 1 ? Math.round((amount / n) * 100) / 100 : amount;
      const txId = await createTransaction(req.tenantId, {
        walletId: wallet ? wallet.Id : null,
        cardId: card ? card.Id : null,
        categoryId,
        payerMemberId,
        kind,
        amount: txAmount,
        note: occurrenceNote,
        date: d,
        isPaid,
        paidDate: paidDate && isPaid ? paidDate : null,
        obs: obs && isPaid ? obs : null,
        paymentMethodName: method || null,
        currency: 'R$',
      });
      createdIds.push(txId);
    }

    // Recorrência (somente quando não for "Uma vez")
    if (isRecurring && frequency !== 1) {
      const rid = uid();
      const nextDue = recurrenceService.nextDue(startDate, frequency);
      await db.query(
        `INSERT INTO RecurringTransactions (Id, TenantId, WalletId, CategoryId, Kind, Amount, Currency, Note,
           Frequency, StartDate, EndDate, NextDueDate, LastGeneratedDate, Enabled, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'R$', ?, ?, ?, NULL, ?, NULL, 1, UTC_TIMESTAMP())`,
        [
          rid,
          req.tenantId,
          wallet ? wallet.Id : null,
          categoryId,
          kind,
          amount,
          note,
          frequency,
          startDate.toISOString().slice(0, 10),
          nextDue.toISOString().slice(0, 10),
        ]
      );
    }

    await syncService.bump(req.tenantId);
    await pushService.notifyTenantOtherMembers(
      req.tenantId,
      req.user.Id,
      'Novo lançamento',
      `${kind === 0 ? 'Renda' : kind === 1 ? 'Despesa' : 'Transferência'} de ${amount} ${note}`,
      '/transactions'
    );
    res.json({ ok: true, ids: createdIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/toggle-paid', async (req, res) => {
  try {
    const tx = await db.queryOne(
      'SELECT * FROM Transactions WHERE Id = ? AND TenantId = ?',
      [req.params.id, req.tenantId]
    );
    if (!tx) return res.status(404).json({ error: 'Lançamento não encontrado.' });
    const now = new Date();
    const newPaid = !(tx.IsPaid === 1 || tx.IsPaid === true);
    const day = now.getUTCDate();
    await db.query(
      `UPDATE Transactions SET IsPaid = ?, PaidDate = ?, Obs = ? WHERE Id = ?`,
      [
        newPaid ? 1 : 0,
        newPaid ? now.toISOString().slice(0, 10) : null,
        newPaid ? `Pago em: dia ${day}` : null,
        tx.Id,
      ]
    );
    await syncService.bump(req.tenantId);
    res.json({ ok: true, isPaid: newPaid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const tx = await db.queryOne(
      'SELECT * FROM Transactions WHERE Id = ? AND TenantId = ?',
      [req.params.id, req.tenantId]
    );
    if (!tx) return res.status(404).json({ error: 'Lançamento não encontrado.' });
    const body = req.body || {};
    const amount = body.amount !== undefined ? tryParseAmount(body.amount) : tx.Amount;

    // Auditoria F2: novas referências precisam pertencer ao tenant.
    const refError = await validateRefs(req.tenantId, {
      categoryId: body.categoryId !== undefined ? body.categoryId : tx.CategoryId,
      walletId: body.walletId !== undefined ? body.walletId : tx.WalletId,
      cardId: body.cardId !== undefined ? body.cardId : tx.CardId,
      payerMemberId: body.payerMemberId !== undefined ? body.payerMemberId : tx.PayerMemberId,
      counterWalletId: body.counterWalletId !== undefined ? body.counterWalletId : tx.CounterWalletId,
    });
    if (refError) {
      return res.status(400).json({ error: refError });
    }

    await db.query(
      `UPDATE Transactions SET
         Note = ?, Amount = ?, CategoryId = ?, WalletId = ?, CardId = ?,
         PayerMemberId = ?, Kind = ?, IsPaid = ?, Date = ?, PaymentMethodName = ?, UpdatedAt = UTC_TIMESTAMP()
       WHERE Id = ?`,
      [
        body.note !== undefined ? body.note : tx.Note,
        amount !== null ? amount : tx.Amount,
        body.categoryId !== undefined ? body.categoryId : tx.CategoryId,
        body.walletId !== undefined ? body.walletId : tx.WalletId,
        body.cardId !== undefined ? body.cardId : tx.CardId,
        body.payerMemberId !== undefined ? body.payerMemberId : tx.PayerMemberId,
        body.kind !== undefined ? body.kind : tx.Kind,
        body.isPaid !== undefined ? (body.isPaid ? 1 : 0) : tx.IsPaid,
        body.date ? toUtc(body.date) : tx.Date,
        body.paymentMethodName !== undefined ? body.paymentMethodName : tx.PaymentMethodName,
        req.params.id,
      ]
    );
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tx = await db.queryOne(
      'SELECT * FROM Transactions WHERE Id = ? AND TenantId = ?',
      [req.params.id, req.tenantId]
    );
    if (!tx) return res.status(404).json({ error: 'Lançamento não encontrado.' });
    await db.query('DELETE FROM Attachments WHERE TransactionId = ?', [tx.Id]);
    await db.query('DELETE FROM Transactions WHERE Id = ?', [tx.Id]);
    await syncService.bump(req.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import/preview', async (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ error: 'Conteúdo CSV ausente.' });
    const rows = csvService.previewCsv(content);
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { content, rows: providedRows } = req.body || {};
    let rows;
    if (Array.isArray(providedRows) && providedRows.length > 0) {
      // Já vem do preview como {date, description, category, wallet, type, value, currency}
      rows = providedRows;
    } else if (content) {
      rows = csvService.parseCsv(content);
    } else {
      return res.status(400).json({ error: 'Conteúdo CSV ausente.' });
    }
    const result = await csvService.importCsv(req.tenantId, rows);
    await syncService.bump(req.tenantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseYearMonth(query) {
  const now = new Date();
  const year = parseInt(query.year, 10) || now.getFullYear();
  const month = parseInt(query.month, 10) || now.getMonth() + 1;
  return { year, month };
}

module.exports = router;