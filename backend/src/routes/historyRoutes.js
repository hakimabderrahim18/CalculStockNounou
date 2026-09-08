const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

router.get('/export', historyController.exportHistory);
router.get('/', historyController.getHistory);

module.exports = router;
