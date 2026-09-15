const express = require('express');
const db = require('../db');
const { authenticate, resolveTenant } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/:id', async (req, res) => {
  try {
    const attachment = await db.queryOne(
      'SELECT * FROM Attachments WHERE Id = ? AND TenantId = ?',
      [req.params.id, req.tenantId]
    );
    if (!attachment) return res.status(404).json({ error: 'Anexo não encontrado.' });
    res.setHeader('Content-Type', attachment.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${attachment.FileName || 'arquivo'}"`);
    res.send(Buffer.from(attachment.Data || []));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;