const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const {
  compareStock,
  getAudits,
  getAuditById,
  exportAuditExcel,
  applyAudit,
  deleteAudit
} = require('../controllers/lossAnalysisController');

router.post('/compare', upload.single('file'), compareStock);
router.get('/', getAudits);
router.get('/:id', getAuditById);
router.get('/:id/export', exportAuditExcel);
router.post('/:id/apply', applyAudit);
router.delete('/:id', deleteAudit);

module.exports = router;
