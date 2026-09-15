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
    });
  }
  return transporter;
}

async function send(to, subject, html) {
  const tr = getTransporter();
  if (!tr) return;
  await tr.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
  });
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