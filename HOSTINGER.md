# =============================================================
# BDD Soluções Financeiras — Deploy no Hostinger (plano Single)
# Node.js + React + MySQL — SEM Docker, SEM VPS
# =============================================================

## Requisitos do plano Hostinger Single
- Hospedagem compartilhada com suporte a **Node.js** (o plano Single suporta
  Node.js e MySQL via hPanel).
- O MySQL é criado no hPanel → `Bases de dados` → criar banco + usuário.

---

## 1) Configurar o MySQL no hPanel
1. hPanel → **Databases** → **Create Database**:
   - Nome: `u<numero>_bdd` (ex: u123456789_bdd)
   - Usuário: `u<numero>_bdd_user`
   - Senha: uma senha forte
2. Anote Host (geralmente `localhost`), porta (`3306`), usuário, senha e banco.

---

## 2) Build do frontend (local)
```bash
cd client
npm install
npm run build        # gera client/dist (arquivos estáticos)
cd ..
```

---

## 3) Preparar os arquivos para upload
Suba TODO o conteúdo da pasta `bdd-node/` (com `client/dist` já gerado)
para a pasta raiz da hospedagem (public_html ou a pasta da aplicação Node).
Estrutura esperada no servidor:

```
public_html/
├── server/          (código Node)
├── client/
│   └── dist/        (frontend compilado)
├── package.json
├── .env             (credenciais — NUNCA commitar)
└── start.sh         (opcional)
```

---

## 4) Criar o arquivo .env no servidor
Copie `.env.example` para `.env` e preencha com os dados do MySQL do hPanel:
```
PORT=8080
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_bdd_user
DB_PASSWORD=SUA_SENHA_FORTE
DB_NAME=u123456789_bdd

JWT_SECRET=UM_SEGREDO_LONGO_ALEATORIO_DE_PELO_MENOS_32_CARACTERES

ADMIN_EMAIL=seu@email.com
ADMIN_PASSWORD=senha_forte_admin
```
> O schema do banco é **aplicado automaticamente** na primeira inicialização
> (o servidor roda `initSchema()` ao subir). Não precisa rodar migração manual.

---

## 5) Configurar o Node.js no hPanel
1. hPanel → **Websites** → seu site → **Node.js** (seção de aplicações).
2. Crie/configure a aplicação Node:
   - Root directory: a pasta onde está o `package.json`
   - Node version: selecione **18 ou superior** (ideal: 20+)
   - Entry file: `server/index.js` (ou `npm start`)
3. Clique em **Restart** na aplicação.
4. O Hostinger roteia o domínio para a porta da aplicação automaticamente.

> IMPORTANTE: se o hPanel não permitir definir a porta, ajuste `PORT` no `.env`
> para a porta que o Hostinger indicar (ex: 8080 ou 3000).

---

## 6) HTTPS / domínio
- Ative o **SSL grátis** no hPanel (Let's Encrypt) para o domínio.
- O app já respeita `DISABLE_HTTPS_REDIRECT` (deixe `false` em produção).

---

## 7) Atualizações
Para atualizar:
1. Rebuild local: `cd client && npm run build`
2. Suba os arquivos alterados (server/ e client/dist/).
3. hPanel → **Restart** na aplicação Node.

---

## Variáveis opcionais
| Variável | Função |
|---|---|
| `SMTP_HOST/PORT/USER/PASS` | Envio de e-mails (convites/reset). Sem isso, o convite é gerado mas não enviado por e-mail. |
| `VAPID_PUBLIC_KEY/PRIVATE_KEY` | Push notifications (gere com `npx web-push generate-vapid-keys`). |
| `PIX_EMAIL/COPIA_E_COLA` | Chave PIX do plano Pro (exibida no PremiumGate). |
| `GOOGLE_CLIENT_ID/SECRET` | Login com Google. |

---

## SMTP — Brevo (envio de e-mail: recuperação de senha, confirmação de cadastro e convites)

O app usa **nodemailer** e dispara e-mail para: recuperação de senha (`/api/auth/forgot-password`), confirmação de cadastro e convite de espaço. Para funcionar em produção, preencha as variáveis `SMTP_*` no `.env` do servidor.

### Configuração com o Brevo (testada e funcionando)
No painel do Brevo (https://app.brevo.com) → **SMTP & API**, anote:

| Dado | Onde pegar no Brevo | Exemplo |
|---|---|---|
| `SMTP_HOST` | Servidor SMTP | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Porta | `587` |
| `SMTP_USER` | Campo "Fazer login" (é um login gerado, **NÃO** é o e-mail da conta) | `b91adf001@smtp-brevo.com` |
| `SMTP_PASS` | Uma chave SMTP criada em "Suas chaves SMTP" (formato `xsmtpsib-...`) | `xsmtpsib-...` |
| `SMTP_FROM` | **Use o mesmo `SMTP_USER`** (`...@smtp-brevo.com`) — é um sender sempre aceito | `b91adf001@smtp-brevo.com` |
| `SMTP_SECURE` | Deixe `false` (porta 587 usa STARTTLS) | `false` |

### Passo a passo no painel do Brevo
1. Faça login em https://app.brevo.com.
2. Menu → **SMTP & API**.
3. Copie o valor de **"Fazer login"** (ex: `b91adf001@smtp-brevo.com`) → `SMTP_USER`.
4. Em **"Suas chaves SMTP"** → **"Gerar uma nova chave SMTP"** (ou use uma existente) → copie o valor `xsmtpsib-...` → `SMTP_PASS`.
5. Configure `SMTP_FROM` **igual ao `SMTP_USER`** (o Brevo rejeita remetente não verificado; usar o login SMTP evita o erro `535 5.7.8 Authentication failed` / sender não autorizado).

### Exemplo de bloco `.env`
```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<seu-login@smtp-brevo.com>
SMTP_PASS=<sua-chave-xsmtpsib-...>
SMTP_FROM=<seu-login@smtp-brevo.com>
SMTP_SECURE=false
```

### Erros comuns
- `535 5.7.8 Authentication failed` → `SMTP_USER` ou `SMTP_PASS` errados (o login NÃO é o e-mail da conta, é o `...@smtp-brevo.com`).
- Envio aceito mas e-mail não chega / remetente estranho → `SMTP_FROM` precisa ser o login SMTP (ou um sender verificado em **Sender Identity**).
- Chave expirada → gere uma nova chave SMTP no painel.

### Teste rápido (local)
```bash
# reinicie o servidor para ler o novo .env
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
node server/index.js &

# dispara e-mail de recuperação para o usuário
curl -s -X POST http://localhost:8080/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@bdd.com"}'
# esperado: {"ok":true}
```

---

## Teste rápido
```bash
# local (com MySQL rodando)
npm install
cd client && npm install && npm run build && cd ..
cp .env.example .env   # preencha
npm start              # http://localhost:8080
```