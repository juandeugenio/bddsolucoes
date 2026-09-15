# 🚀 Checklist de Deploy — BDD Soluções Financeiras (Node + React + MySQL)

> Pré-requisito: hospedagem com Node.js (Hostinger hPanel, plano Single) + MySQL.
> Guia completo de subida: `HOSTINGER.md`. Este é o checklist objetivo, na ordem.

---

## 1. Antes de subir (local)

- [ ] `cd client && npm install && npm run build` — o `client/dist/` deve estar gerado (é o frontend servido).
- [ ] Rodar o smoke test rápido em banco limpo (MySQL local com senha forte):
  ```bash
  npm install
  cd client && npm install && npm run build && cd ..
  cp .env.example .env   # preencha com dados REAIS (não os de teste)
  npm start
  # abrir http://localhost:8080 → registrar usuário → dashboard carrega com categorias padrão
  # criar uma transação, um cartão (Pro), uma recorrência e conferir Limites
  ```
- [ ] Confirmar que o servidor sobe com o schema aplicado automaticamente (`initSchema()`).

---

## 2. Arquivo `.env` de PRODUÇÃO (no servidor — NUNCA commitar)

Copie `.env.example` → `.env` e preencha:

| Variável | Valor obrigatório | Observação |
|---|---|---|
| `PORT` | porta do host (ex: `8080`) | hPanel pode indicar outra |
| `NODE_ENV` | `production` | **NÃO** `development` |
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `3306` | |
| `DB_USER` | usuário criado no hPanel | ex: `u123456789_bdd_user` |
| `DB_PASSWORD` | **senha forte** | nunca `bdd123` |
| `DB_NAME` | banco criado no hPanel | ex: `u123456789_bdd` |
| `JWT_SECRET` | **aleatório 32+ chars** | gere: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRES_IN` | `7d` | |
| `ADMIN_EMAIL` | seu e-mail | sem isso o seeder **não cria** admin |
| `ADMIN_PASSWORD` | senha forte do admin | criada só na 1ª subida |
| `DISABLE_HTTPS_REDIRECT` | `false` | senão cookies sem `secure` + sem HSTS |

> ⚠️ O admin **não** é recriado se já existir; a senha só vale no primeiro boot.
> Senha fraca `postgres`/`bdd123` em produção: validação do servidor rejeita conexão? Não — **rejeita apenas** a connection string do Blazor; no Node, use senha forte por segurança.

---

## 3. Segurança (obrigatório antes do Go-Live)

- [ ] `JWT_SECRET` forte (não usar o valor de teste).
- [ ] `DB_PASSWORD` forte.
- [ ] `NODE_ENV=production` + `DISABLE_HTTPS_REDIRECT=false`.
- [ ] SSL/HTTPS ativo no domínio (Let's Encrypt no hPanel).
- [ ] `.env` **fora** do git (`bdd-node/.gitignore` já ignora `.env`).
- [ ] Confirme que `.env` não tem chaves de teste (VAPID/PIX/SMTP de dev).

---

## 4. Banco de dados (hPanel)

- [ ] Criar banco + usuário MySQL no hPanel.
- [ ] Anotar Host/Porta/User/Senha/DB e colocar no `.env`.
- [ ] NÃO precisa rodar migração manual — `initSchema()` aplica na 1ª subida.
- [ ] (Opcional) Fazer backup do schema: `mysqldump` do banco vazio após subir.

---

## 5. Subida no Hostinger

- [ ] Subir TODO o `bdd-node/` (com `client/dist`) para a raiz da aplicação.
- [ ] hPanel → Websites → **Node.js**:
  - Root directory: pasta do `package.json`
  - Node version: **18+** (ideal 20+)
  - Entry file: `server/index.js`
- [ ] Criar `.env` no servidor (seção 2).
- [ ] **Restart** da aplicação Node.
- [ ] Acessar o domínio → deve aparecer o app.

---

## 6. Pós-deploy (smoke test no ambiente de produção)

- [ ] Login do admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- [ ] Registrar um usuário novo → tenant com **9 categorias padrão + 1 carteira** (corrigido).
- [ ] Painel admin: toggle Pro de um usuário.
- [ ] Criar transação (despesa e renda), categoria, carteira, cartão (Pro), recorrência.
- [ ] **Limites**: abrir `/settings/limits` → todas as categorias visíveis (corrigido).
- [ ] **Movimentos**: lista, calendário, filtros, detalhar fatura.
- [ ] **Gráficos**: Diários, Categorias, Métodos, Usuários, Tendência.
- [ ] **Rachado/Split**: criar grupo, membros, despesa, "Acertar contas".
- [ ] **Configurações**: moeda, fuso, PIN, editar membros, exportes (CSV/JSON/PDF).
- [ ] **Renda por membro**: lançar 2 salários com "Quem pagou?" diferente → dashboard mostra separado e soma na renda geral.
- [ ] Recorrência: **não duplica** ao navegar entre meses (bug corrigido).
- [ ] Logout/Login, sessão expirada.

---

## 7. Funcionalidades opcionais (testar se for usar)

- [ ] **Push notifications**: gerar VAPID
  ```bash
  npx web-push generate-vapid-keys
  ```
  → preencher `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` → testar disparo ao cônjuge.
- [ ] **E-mail (Brevo)**: `SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` (igual ao `SMTP_USER`) → testar recuperação de senha e convite chegando no e-mail (no momento só confirmei que o endpoint responde `ok`).
- [ ] **PIX Pro**: `PIX_EMAIL` e `PIX_COPIA_E_COLA` (QR do PremiumGate).
- [ ] **Google Login**: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no console do Google.

---

## 8. Checklist final (sim/não)

- [ ] Segredos trocados (JWT/DB/admin) — **senão NÃO subir**
- [ ] `NODE_ENV=production` + HTTPS ativo
- [ ] Smoke test em banco limpo passou
- [ ] Push/e-mail testados (ou decidido não usar)
- [ ] Backup do banco funcionando
- [ ] `.env` fora do git

> Se algo da seção 8 ficar **não**, segure o Go-Live até resolver.