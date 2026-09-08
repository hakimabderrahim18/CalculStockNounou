const express = require('express');
const router = express.Router();
const {
  getObservations,
  getObservationStats,
  getObservationById,
  createObservation,
  updateObservation,
  deleteObservation
} = require('../controllers/observationController');

router.get('/stats', getObservationStats);
router.get('/', getObservations);
router.get('/:id', getObservationById);
router.post('/', createObservation);
router.put('/:id', updateObservation);
router.delete('/:id', deleteObservation);

module.exports = router;
