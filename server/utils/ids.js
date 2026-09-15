const crypto = require('crypto');

function uid() {
  return crypto.randomUUID();
}

function token64(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

module.exports = { uid, token64, sha256 };