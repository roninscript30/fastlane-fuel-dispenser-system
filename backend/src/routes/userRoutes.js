const express = require('express');
const router = express.Router();
const {
  createOrUpdateUser,
  getUserByRFID,
  getAllUsers,
  deleteUser,
  updateUserBalance
} = require('../controllers/userController');
const { topup } = require('../controllers/financeController');

// User management routes
router.post('/', createOrUpdateUser);              // POST /api/users - Create or update user
router.get('/', getAllUsers);                      // GET /api/users - Get all users
router.get('/by-rfid/:uid', getUserByRFID);        // GET /api/users/by-rfid/:uid - Get user by RFID
router.delete('/by-rfid/:uid', deleteUser);        // DELETE /api/users/by-rfid/:uid - Delete user
router.patch('/by-rfid/:uid/balance', updateUserBalance); // PATCH /api/users/by-rfid/:uid/balance - Update balance

// Financial routes
router.post('/topup', topup);                      // POST /api/users/topup - Top up user balance

module.exports = router;
