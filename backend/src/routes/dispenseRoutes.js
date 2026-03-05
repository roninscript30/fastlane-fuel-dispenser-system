const express = require('express');
const router = express.Router();
const {
  dispense,
  getDispenseHistory,
  getDispenseHistoryByRFID,
  getDispenseStats
} = require('../controllers/financeController');

// Dispense routes
router.post('/', dispense);                                    // POST /api/dispense - Record a dispense
router.get('/history', getDispenseHistory);                    // GET /api/dispense/history - Get all dispense history
router.get('/history/:uid', getDispenseHistoryByRFID);         // GET /api/dispense/history/:uid - Get dispense history by RFID
router.get('/stats', getDispenseStats);                        // GET /api/dispense/stats - Get dispense statistics

module.exports = router;
