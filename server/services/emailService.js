const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function isConfigured() {
  return Boolean(config.smtp.host || config.brevoApiKey);
}

function getTransporter() {
  if (!transporter && config.smtp.host) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
  }
  return transporter;
}

// Envio pela API HTTP do Brevo (HTTPS 443, nunca bloqueado em hospedagens).
// Usa BREVO_API_KEY (formato xkeysib-...). Mais confiável que SMTP no Render.
async function sendViaBrevoApi(to, subject, html) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: config.smtp.from || config.smtp.user || 'no-reply@bdd.com' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function send(to, subject, html) {
  if (config.brevoApiKey) {
    try {
      await sendViaBrevoApi(to, subject, html);
      console.log(`[email] enviado (API Brevo) para ${to} | assunto: ${subject}`);
    } catch (err) {
      console.error(`[email] ERRO (API Brevo) para ${to}: ${err.message}`);
      throw err;
    }
    return;
  }

  const tr = getTransporter();
  if (!tr) {
    console.warn(`[email] SMTP não configurado (sem host nem BREVO_API_KEY) — envio ignorado para ${to}`);
    return;
  }
  try {
    await tr.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
    });
    console.log(`[email] enviado (SMTP) para ${to} | assunto: ${subject}`);
  } catch (err) {
    console.error(`[email] ERRO (SMTP) para ${to}: ${err.message}`);
    throw err;
  }
}

async function sendInviteEmail(to, inviteUrl) {
  await send(
    to,
    'Convite para BDD Soluções Financeiras',
    `<p>Você foi convidado para participar de um espaço compartilhado de finanças.</p>
     <p><a href="${inviteUrl}">Aceitar convite</a></p>`
  );
}

module.exports = { isConfigured, send, sendInviteEmail };