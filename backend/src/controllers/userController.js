const User = require('../models/user');
const path = require('path');
const fs = require('fs');

// Load constants from config
let ADMIN_RFID_UID = 'ABCD1234'; // Default fallback
try {
  const configPath = path.join(__dirname, '..', '..', '..', 'config', 'constants.json');
  if (fs.existsSync(configPath)) {
    const constants = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    ADMIN_RFID_UID = constants.rfid?.adminTag || ADMIN_RFID_UID;
  }
} catch (err) {
  console.warn('Could not load admin RFID from config, using default:', ADMIN_RFID_UID);
}

/**
 * Create or update user (upsert by rfid_uid)
 * POST /api/users
 * Body: { rfid_uid, phone, name, car_number }
 */
async function createOrUpdateUser(req, res) {
  try {
    const { rfid_uid, phone, name, car_number } = req.body;
    
    // Validation
    if (!rfid_uid || typeof rfid_uid !== 'string' || rfid_uid.trim() === '') {
      return res.status(400).json({ error: 'Valid rfid_uid is required' });
    }

    const update = {};
    if (phone !== undefined) update.phone = phone;
    if (name !== undefined) update.name = name;
    if (car_number !== undefined) update.car_number = car_number;

    // Check if user exists
    const existingUser = await User.findOne({ rfid_uid });

    // Upsert: create if not exists, else update fields provided
    const user = await User.findOneAndUpdate(
      { rfid_uid },
      { 
        $set: update, 
        $setOnInsert: { 
          balance: 0,
          total_dispenses: 0,
          total_topups: 0
        } 
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(existingUser ? 200 : 201).json({
      message: existingUser ? 'User updated successfully' : 'User created successfully',
      user
    });
  } catch (err) {
    console.error('Error in createOrUpdateUser:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'User with this RFID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get user by RFID
 * GET /api/users/by-rfid/:uid
 * Special handling for admin RFID (configured in constants.json)
 */
async function getUserByRFID(req, res) {
  try {
    const uid = req.params.uid;
    
    if (!uid || uid.trim() === '') {
      return res.status(400).json({ error: 'Valid RFID UID is required' });
    }

    // Check if admin RFID
    if (uid.toUpperCase() === ADMIN_RFID_UID) {
      return res.json({
        isAdmin: true,
        rfid_uid: ADMIN_RFID_UID,
        name: 'Administrator',
        balance: 0,
        message: 'Admin access granted'
      });
    }

    const user = await User.findOne({ rfid_uid: uid }).lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user object directly for ESP32 compatibility
    res.json(user);
  } catch (err) {
    console.error('Error in getUserByRFID:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get all users with pagination and filtering
 * GET /api/users?page=1&limit=10&search=term
 */
async function getAllUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build search query
    let query = {};
    if (search) {
      query.$or = [
        { rfid_uid: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { car_number: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Delete user by RFID
 * DELETE /api/users/by-rfid/:uid
 */
async function deleteUser(req, res) {
  try {
    const uid = req.params.uid;
    
    if (!uid || uid.trim() === '') {
      return res.status(400).json({ error: 'Valid RFID UID is required' });
    }

    const user = await User.findOneAndDelete({ rfid_uid: uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'User deleted successfully',
      user 
    });
  } catch (err) {
    console.error('Error in deleteUser:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Update user balance (admin function)
 * PATCH /api/users/by-rfid/:uid/balance
 * Body: { balance }
 */
async function updateUserBalance(req, res) {
  try {
    const uid = req.params.uid;
    const { balance } = req.body;
    
    if (!uid || uid.trim() === '') {
      return res.status(400).json({ error: 'Valid RFID UID is required' });
    }

    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({ error: 'Valid balance (non-negative number) is required' });
    }

    const user = await User.findOneAndUpdate(
      { rfid_uid: uid },
      { $set: { balance } },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Balance updated successfully',
      user 
    });
  } catch (err) {
    console.error('Error in updateUserBalance:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createOrUpdateUser,
  getUserByRFID,
  getAllUsers,
  deleteUser,
  updateUserBalance
};
