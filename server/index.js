require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('./config');
const db = require('./db');
const pushService = require('./services/pushService');
const seeder = require('./services/seeder');

async function main() {
  if (!config.jwt.secret || config.jwt.secret.length < 16) {
    console.error('[startup] JWT_SECRET ausente ou muito curto. Defina uma chave forte.');
    process.exit(1);
  }

  await db.initSchema();
  pushService.init();
  await seeder.seedAdmin();

  const app = express();
  app.set('trust proxy', 1); // atrás de proxy (Hostinger/Render)
  app.use(express.json({ limit: '20mb' }));
  app.use(require('./middleware/security').securityHeaders);

  // ===== Rotas da API =====
  app.use('/api/auth', require('./routes/auth.routes'));

  // CSRF: protege todas as mutações das rotas autenticadas (login/registro definem o cookie antes)
  app.use('/api', require('./middleware/security').csrfProtection);
  app.use('/api/tenants', require('./routes/tenants.routes'));
  app.use('/api/dashboard', require('./routes/dashboard.routes'));
  app.use('/api/transactions', require('./routes/transactions.routes'));
  app.use('/api/wallets', require('./routes/wallets.routes'));
  app.use('/api/payment-methods', require('./routes/paymentmethods.routes'));
  app.use('/api/categories', require('./routes/categories.routes'));
  app.use('/api/cards', require('./routes/cards.routes'));
  app.use('/api/split', require('./routes/split.routes'));
  app.use('/api/recurring', require('./routes/recurring.routes'));
  app.use('/api/settings', require('./routes/settings.routes'));
  app.use('/api/analytics', require('./routes/analytics.routes'));
  app.use('/api/admin', require('./routes/admin.routes'));
  app.use('/api/reports', require('./routes/reports.routes'));
  app.use('/api/push', require('./routes/push.routes'));
  app.use('/api/attachments', require('./routes/attachments.routes'));
  app.use('/api/exchange', require('./routes/exchange.routes'));
  app.use('/api/sync', require('./routes/sync.routes'));

  app.get('/api/push/public-key', (req, res) => {
    res.json({ publicKey: pushService.getPublicKeyForJs() });
  });

  // ===== Frontend estático (React) =====
  const clientDist = path.resolve(__dirname, config.clientDist);
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api|reports|attachments|hubs).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => {
      res.send(
        'BDD Soluções Financeiras - API rodando. Frontend não compilado. Execute: cd client && npm run build'
      );
    });
  }

  // ===== Erros =====
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  app.listen(config.port, () => {
    console.log(`[startup] BDD Soluções Financeiras rodando em :${config.port}`);
  });
}

main().catch((err) => {
  console.error('[startup] Falha ao iniciar:', err);
  process.exit(1);
});