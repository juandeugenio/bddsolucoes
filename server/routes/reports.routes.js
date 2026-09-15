const express = require('express');
const balanceService = require('../services/balanceService');
const backupService = require('../services/backupService');
const csvService = require('../services/csvService');
const recurrenceService = require('../services/recurrenceService');
const tenantService = require('../services/tenantService');
const db = require('../db');
const { authenticate, resolveTenant } = require('../middleware/auth');
const { daysInMonth } = require('../utils/dates');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/transactions.csv', async (req, res) => {
  try {
    const transactions = await balanceService.getRecentTransactions(req.tenantId, 100000);
    const csv = csvService.buildTransactionsCsv(transactions);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transacoes.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/backup.json', async (req, res) => {
  try {
    const user = await tenantService.getActiveTenantIdForDisplay(req.user.Id);
    const currency = await db.queryOne('SELECT DefaultCurrency FROM Users WHERE Id = ?', [
      req.user.Id,
    ]);
    const backup = await backupService.buildBackup(req.tenantId, currency?.DefaultCurrency || 'R$');
    const json = backupService.serialize(backup);
    const fileName = `bdd-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions.pdf', async (req, res) => {
  try {
    const query = req.query;
    const isAll = String(query.all || '') === 'true';
    const year = parseInt(query.year, 10) || null;
    const month = parseInt(query.month, 10) || null;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;

    await recurrenceService.generateDue(req.tenantId, new Date(Date.UTC(targetYear, targetMonth - 1, daysInMonth(targetYear, targetMonth))));

    let transactions;
    if (year && month) {
      transactions = await balanceService.getMonthTransactions(req.tenantId, year, month);
    } else {
      transactions = await balanceService.getRecentTransactions(req.tenantId, 100000);
    }

    const wallets = await db.query(
      'SELECT * FROM Wallets WHERE TenantId = ? AND IsArchived = 0 ORDER BY Name ASC',
      [req.tenantId]
    );
    const walletBalances = await balanceService.getWalletBalances(req.tenantId);

    const totalIncome = transactions.filter((t) => t.Kind === 0).reduce((s, t) => s + Number(t.Amount), 0);
    const totalExpense = transactions.filter((t) => t.Kind === 1).reduce((s, t) => s + Number(t.Amount), 0);
    const netPeriod = totalIncome - totalExpense;
    const accumulatedBalance = await balanceService.getAccumulatedBalanceUpTo(req.tenantId, targetYear, targetMonth);

    const catMap = new Map();
    for (const t of transactions) {
      if (t.Kind !== 1 || !t.CategoryId) continue;
      const key = t.CategoryId;
      const cur = catMap.get(key) || { name: t.CategoryName || 'Sem categoria', color: t.CategoryColor || '#9675FF', count: 0, total: 0 };
      cur.count++;
      cur.total += Number(t.Amount);
      catMap.set(key, cur);
    }
    const categoryBreakdown = [...catMap.values()]
      .map((c) => ({ ...c, percent: totalExpense > 0 ? (c.total / totalExpense) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);

    const periodLabel =
      year && month
        ? new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
        : 'TODOS OS TEMPOS';

    const rowsHtml = transactions
      .map((t) => {
        const kindBadge =
          t.Kind === 0
            ? '<span style="color:#16a34a">Receita</span>'
            : t.Kind === 2
              ? '<span style="color:#0369a1">Transferência</span>'
              : '<span style="color:#dc2626">Despesa</span>';
        const statusBadge = t.CardId
          ? 'Fatura Cartão'
          : t.IsPaid
            ? '<span style="color:#166534">Pago</span>'
            : '<span style="color:#92400e">Pendente</span>';
        const desc = t.Note || t.Obs || 'Sem descrição';
        const date = new Date(t.Date).toLocaleDateString('pt-BR');
        return `<tr>
          <td>${date}</td>
          <td>${escapeHtml(desc)}</td>
          <td>${escapeHtml(t.CategoryName || '-')}</td>
          <td>${escapeHtml(t.WalletName || '-')}</td>
          <td>${escapeHtml(t.PayerName || '-')}</td>
          <td>${statusBadge}</td>
          <td>${kindBadge}</td>
          <td>${Number(t.Amount).toFixed(2)}</td>
        </tr>`;
      })
      .join('');

    const catRows = categoryBreakdown
      .map(
        (c) => `<tr>
          <td><span style="color:${safeColor(c.color)}">●</span> ${escapeHtml(c.name)}</td>
          <td>${c.count}</td>
          <td>${Number(c.total).toFixed(2)}</td>
          <td>${c.percent.toFixed(1)}%</td>
        </tr>`
      )
      .join('');

    const walletRows = wallets
      .map((w) => {
        const bal = walletBalances[w.Id] || 0;
        return `<tr><td>${escapeHtml(w.Name)}</td><td>${Number(bal).toFixed(2)}</td></tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório Financeiro - BDD</title>
<style>
  body { font-family: sans-serif; color: #1e293b; font-size: 12px; }
  .header { background: #0f172a; color: white; padding: 18px 22px; border-radius: 10px; margin-bottom: 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
  .kpi-card .value { font-size: 16px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  .green { color: #16a34a; } .red { color: #dc2626; } .purple { color: #7c3aed; }
  .section-title { font-size: 13px; font-weight: 700; margin: 20px 0 10px 0; border-bottom: 2px solid #cbd5e1; }
  .no-print { margin-bottom: 12px; }
</style></head>
<body>
<div class="no-print"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<div class="header"><h1>BDD SOLUÇÕES FINANCEIRAS</h1><p>Período: ${periodLabel}</p></div>
<div class="kpi-grid">
  <div class="kpi-card"><div>Receita Total</div><div class="value green">+ ${totalIncome.toFixed(2)}</div></div>
  <div class="kpi-card"><div>Despesa Total</div><div class="value red">- ${totalExpense.toFixed(2)}</div></div>
  <div class="kpi-card"><div>Saldo do Período</div><div class="value ${netPeriod >= 0 ? 'green' : 'red'}">${netPeriod.toFixed(2)}</div></div>
  <div class="kpi-card"><div>Saldo Acumulado</div><div class="value purple">${accumulatedBalance.toFixed(2)}</div></div>
</div>
<div class="section-title">Demonstrativo por Categoria</div>
<table><thead><tr><th>Categoria</th><th>Qtd</th><th>Valor</th><th>%</th></tr></thead><tbody>${catRows || '<tr><td colspan="4">Sem dados</td></tr>'}</tbody></table>
<div class="section-title">Saldos por Carteira</div>
<table><thead><tr><th>Carteira</th><th>Saldo</th></tr></thead><tbody>${walletRows || '<tr><td colspan="2">Sem dados</td></tr>'}</tbody></table>
<div class="section-title">Extrato Analítico (${transactions.length} registros)</div>
<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Carteira</th><th>Membro</th><th>Status</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${rowsHtml}</tbody></table>
<script>setTimeout(() => window.print(), 600);</script>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Auditoria F7: cores entram em atributo style; valida formato hex antes de inserir.
function safeColor(c) {
  const s = String(c || '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : '#9675FF';
}

module.exports = router;