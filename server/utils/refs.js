const db = require('../db');

// Valida que um objeto pertence ao tenant antes de gravar referências.
// Retorna null se for válido; retorna uma mensagem de erro se não pertencer.
async function validateRefs(tenantId, refs = {}) {
  const { categoryId, walletId, cardId, payerMemberId, counterWalletId } = refs;

  if (categoryId) {
    const ok = await db.queryOne(
      'SELECT 1 AS x FROM Categories WHERE Id = ? AND TenantId = ?',
      [categoryId, tenantId]
    );
    if (!ok) return 'Categoria inválida.';
  }
  if (walletId) {
    const ok = await db.queryOne(
      'SELECT 1 AS x FROM Wallets WHERE Id = ? AND TenantId = ?',
      [walletId, tenantId]
    );
    if (!ok) return 'Carteira inválida.';
  }
  if (cardId) {
    const ok = await db.queryOne(
      'SELECT 1 AS x FROM CreditCards WHERE Id = ? AND TenantId = ?',
      [cardId, tenantId]
    );
    if (!ok) return 'Cartão inválido.';
  }
  if (counterWalletId) {
    const ok = await db.queryOne(
      'SELECT 1 AS x FROM Wallets WHERE Id = ? AND TenantId = ?',
      [counterWalletId, tenantId]
    );
    if (!ok) return 'Carteira de destino inválida.';
  }
  if (payerMemberId) {
    const ok = await db.queryOne(
      'SELECT 1 AS x FROM FinanceTenantMembers WHERE Id = ? AND TenantId = ?',
      [payerMemberId, tenantId]
    );
    if (!ok) return 'Membro pagador inválido.';
  }
  return null;
}

module.exports = { validateRefs };