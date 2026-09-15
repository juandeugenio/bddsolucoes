const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function isConfigured() {
  return Boolean(config.smtp.host);
}

function getTransporter() {
  if (!transporter && isConfigured()) {
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

async function send(to, subject, html) {
  const tr = getTransporter();
  if (!tr) {
    console.warn(`[email] SMTP não configurado (host vazio) — envio ignorado para ${to}`);
    return;
  }
  try {
    await tr.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
    });
    console.log(`[email] enviado para ${to} | assunto: ${subject}`);
  } catch (err) {
    console.error(`[email] ERRO ao enviar para ${to}: ${err.message}`);
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