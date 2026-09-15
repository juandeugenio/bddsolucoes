require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
  isDev: (process.env.NODE_ENV || 'production') === 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'bdd',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bdd',
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
  },

  vapid: {
    subject: process.env.VAPID_SUBJECT || 'mailto:contato@bdd.wellcode.it',
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'no-reply@bdd.com',
    secure: process.env.SMTP_SECURE === 'true',
  },

  pix: {
    email: process.env.PIX_EMAIL || '',
    copiaECola: process.env.PIX_COPIA_E_COLA || '',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  clientDist: process.env.CLIENT_DIST || '../client/dist',
  disableHttpsRedirect: process.env.DISABLE_HTTPS_REDIRECT === 'true',
};

module.exports = config;