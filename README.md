# BDD Soluções Financeiras — Reescrita Node.js + React + MySQL

Reescrita completa do app **BDD Soluções Financeiras** (originalmente
Blazor Server + PostgreSQL/Docker) em **Node.js + Express + React + MySQL**,
sem Docker, pensada para hospedagem compartilhada barata (Hostinger Single).

## Estrutura

```
bdd-node/
├── server/                  # Backend Node.js (Express)
│   ├── index.js             # Entrada do servidor (API + frontend estático)
│   ├── schema.sql           # Schema MySQL (aplicado automaticamente no boot)
│   ├── db.js                # Pool MySQL + initSchema
│   ├── config.js            # Configuração via variáveis de ambiente
│   ├── middleware/          # Auth JWT, admin, resolução de tenant
│   ├── routes/              # Endpoints da API
│   └── services/            # Regras de negócio (balance, split, recorrência...)
├── client/                  # Frontend React (Vite)
│   └── src/
│       ├── pages/           # Todas as telas
│       └── components/      # Charts, Layout, modais, etc.
├── .env.example             # Modelo de configuração
└── HOSTINGER.md             # Passo a passo de deploy na Hostinger
```

## Funcionalidades (paridade com o original)

- Autenticação (email/senha + JWT) e conta Admin
- Multi-tenant (casal) com convites por e-mail e modos Split/Conjunto
- **Layout idêntico ao original**: app-viewport mobile (moldura 440px), sidebar desktop,
  bottom-nav com 4 abas + FAB central, fonte DM Sans + ícones Phosphor, paleta #130F24
- Dashboard: gauge "A acertar" SVG (arcos roxo/ciano), card do casal com percentuais,
  card de gasto mensal com progress bar, faturas do mês, contas com Pago/Pendente
- Movimentos: HeaderMes (mês + toggle lista/calendário), filtros Tudo/Despesas/Rendas +
  método/status com popover, lista agrupada por dia, calendário mensal, formulário
  full-screen com teclado numérico customizado, "Quem pagou?", categoria, método, parcela
- Divisões ("quem deve a quem") com acerto automático
- Categorias com limites mensais, carteiras agrupadas por tipo, cartões de crédito
  (carteira estilo banco), taxas de câmbio
- Plano Pro/Free com limites e PIX (QR code + copia-e-cola)
- Configurações em 7 seções (Conta e Casal, Limites e Categorias, Dados e Backup,
  Preferências, Informações e Suporte, Legal, Conta e Sessão)
- Relatórios: CSV, backup JSON, relatório HTML imprimível (PDF)
- PWA: manifest, service worker, notificações push (VAPID)
- Sync entre dispositivos (recarrega ao detectar mudança)

## Assets replicados do original
- `client/public/images/icon.svg`, `logo.svg`, `logo.png` — logo oficial
- `client/public/fonts/` — DM Sans + Phosphor
- `client/public/images/banks/` — 254 logos de bancos

## Segurança

- **JWT em cookie HttpOnly + SameSite=Strict** (não fica no localStorage → imune a roubo via XSS)
- **CSRF double-submit**: cookie `bdd.csrf` + header `X-CSRF-Token` validados no servidor em toda mutação
- **Headers de segurança**: CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS (produção)
- **Rate limiting**: 20 tentativas/15min em login, registro e reset (anti brute-force)
- **Senhas/PIN**: hash bcrypt, nunca expostos nas respostas
- **Tokens de reset/confirmação**: persistidos em `UserTokens` com expiração, nunca no client
- **Privacidade**: `/forgot-password` não revela se o e-mail existe
- Segredos (DB, JWT, SMTP, VAPID privado, Google) só no `.env` do servidor

## Rodar localmente

Requisitos: Node 18+, MySQL 8+.

```bash
npm install
cd client && npm install && npm run build && cd ..
cp .env.example .env    # preencha as credenciais do MySQL
npm start               # http://localhost:8080
```

O schema do banco é criado automaticamente na primeira execução.

## Deploy

Veja [HOSTINGER.md](HOSTINGER.md) para o passo a passo no plano Single da
Hostinger (Node.js + MySQL, sem VPS e sem Docker).