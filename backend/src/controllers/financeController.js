const User = require('../models/user');
const DispenseHistory = require('../models/dispense_histories');

/**
 * Top-up user balance
 * POST /api/users/topup
 * Body: { rfid_uid, amount, car_number (optional) }
 */
async function topup(req, res) {
  try {
    const { rfid_uid, amount, car_number } = req.body;
    
    // Validation
    if (!rfid_uid || typeof rfid_uid !== 'string' || rfid_uid.trim() === '') {
      return res.status(400).json({ error: 'Valid rfid_uid is required' });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Get user before update
    const before = await User.findOne({ rfid_uid });
    const balanceBefore = before ? before.balance : 0;

    // Atomically increment balance
    const user = await User.findOneAndUpdate(
      { rfid_uid },
      {
        $inc: { balance: amount, total_topups: 1 },
        $set: { 
          last_topup: new Date(), 
          last_topup_amount: amount,
          ...(car_number && { car_number })
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json({ 
      message: 'Top-up successful', 
      balance_before: balanceBefore,
      balance_after: user.balance,
      amount_added: amount,
      user 
    });
  } catch (err) {
    console.error('Error in topup:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Dispense endpoint
 * POST /api/dispense
 * Body: { rfid_uid, volume_litre, amount, fuel_type (optional), car_number (optional) }
 * This will:
 *  - Validate input
 *  - Attempt to atomically decrement balance (fail if insufficient)
 *  - Insert a dispense_history record
 *  - Update user's last_dispense fields and counters
 */
async function dispense(req, res) {
  try {
    const { rfid_uid, volume_litre, amount, fuel_type, car_number } = req.body;
    
    // Validation
    if (!rfid_uid || typeof rfid_uid !== 'string' || rfid_uid.trim() === '') {
      return res.status(400).json({ error: 'Valid rfid_uid is required' });
    }
    
    if (typeof volume_litre !== 'number' || volume_litre <= 0) {
      return res.status(400).json({ error: 'volume_litre must be a positive number' });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    // Get user before update
    const userBefore = await User.findOne({ rfid_uid }).lean();
    
    if (!userBefore) {
      // User doesn't exist, create failed history record
      await DispenseHistory.create({
        rfid_uid,
        volume_litre,
        amount,
        fuel_type: fuel_type || 'PETROL',
        status: 'FAILED',
        time: new Date()
      });
      return res.status(404).json({ error: 'User not found' });
    }

    const balanceBefore = userBefore.balance || 0;

    // Check if sufficient balance
    if (balanceBefore < amount) {
      // Insufficient funds: insert FAILED history and return error
      await DispenseHistory.create({
        rfid_uid,
        volume_litre,
        amount,
        fuel_type: fuel_type || 'PETROL',
        status: 'FAILED',
        time: new Date()
      });
      return res.status(400).json({ 
        error: 'Insufficient balance',
        balance: balanceBefore,
        required: amount,
        shortage: amount - balanceBefore
      });
    }

    // Attempt atomic debit: require balance >= amount
    const timeNow = new Date();
    const updatedUser = await User.findOneAndUpdate(
      { rfid_uid, balance: { $gte: amount } },
      {
        $inc: { balance: -amount, total_dispenses: 1 },
        $set: {
          last_dispense: timeNow,
          last_dispense_volume: volume_litre,
          last_dispense_amount: amount,
          last_dispense_status: 'SUCCESS',
          ...(car_number && { car_number })
        }
      },
      { new: true, runValidators: true }
    );

    // Double check (race condition safety)
    if (!updatedUser) {
      await DispenseHistory.create({
        rfid_uid,
        volume_litre,
        amount,
        fuel_type: fuel_type || 'PETROL',
        status: 'FAILED',
        time: timeNow
      });
      return res.status(400).json({ error: 'Insufficient balance (concurrent transaction)' });
    }

    // Debit succeeded: insert success history
    const history = await DispenseHistory.create({
      rfid_uid,
      volume_litre,
      amount,
      fuel_type: fuel_type || 'PETROL',
      status: 'SUCCESS',
      time: timeNow
    });

    res.json({
      message: 'Dispense recorded successfully',
      balance_before: balanceBefore,
      balance_after: updatedUser.balance,
      amount_deducted: amount,
      volume_dispensed: volume_litre,
      fuel_type: fuel_type || 'PETROL',
      history,
      user: updatedUser
    });

  } catch (err) {
    console.error('Error in dispense:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get all dispense history with pagination and filtering
 * GET /api/dispense/history?page=1&limit=10&status=SUCCESS&fuel_type=PETROL
 */
async function getDispenseHistory(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const fuel_type = req.query.fuel_type;
    const skip = (page - 1) * limit;

    // Build filter query
    let query = {};
    if (status) query.status = status;
    if (fuel_type) query.fuel_type = fuel_type;

    // Get total count
    const total = await DispenseHistory.countDocuments(query);

    // Get history with pagination
    const history = await DispenseHistory.find(query)
      .sort({ time: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      dispenses: history,  // Frontend expects 'dispenses' property
      history,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error in getDispenseHistory:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get dispense history for a specific user
 * GET /api/dispense/history/:uid?page=1&limit=10
 */
async function getDispenseHistoryByRFID(req, res) {
  try {
    const uid = req.params.uid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!uid || uid.trim() === '') {
      return res.status(400).json({ error: 'Valid RFID UID is required' });
    }

    // Get total count
    const total = await DispenseHistory.countDocuments({ rfid_uid: uid });

    // Get history with pagination
    const history = await DispenseHistory.find({ rfid_uid: uid })
      .sort({ time: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      rfid_uid: uid,
      dispenses: history,  // Frontend expects 'dispenses'
      history,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error in getDispenseHistoryByRFID:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get dispense statistics
 * GET /api/dispense/stats?rfid_uid=xxx (optional)
 */
async function getDispenseStats(req, res) {
  try {
    const rfid_uid = req.query.rfid_uid;
    let matchStage = {};
    
    if (rfid_uid) {
      matchStage = { rfid_uid };
    }

    const stats = await DispenseHistory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total_dispenses: { $sum: 1 },
          successful_dispenses: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
          },
          failed_dispenses: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
          },
          total_volume: { $sum: '$volume_litre' },
          total_amount: { $sum: '$amount' },
          avg_volume_per_dispense: { $avg: '$volume_litre' },
          avg_amount_per_dispense: { $avg: '$amount' }
        }
      }
    ]);

    // Get fuel type breakdown
    const fuelTypeStats = await DispenseHistory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$fuel_type',
          count: { $sum: 1 },
          total_volume: { $sum: '$volume_litre' },
          total_amount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      ...(rfid_uid && { rfid_uid }),
      overall: stats[0] || {
        total_dispenses: 0,
        successful_dispenses: 0,
        failed_dispenses: 0,
        total_volume: 0,
        total_amount: 0,
        avg_volume_per_dispense: 0,
        avg_amount_per_dispense: 0
      },
      by_fuel_type: fuelTypeStats
    });
  } catch (err) {
    console.error('Error in getDispenseStats:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  topup,
  dispense,
  getDispenseHistory,
  getDispenseHistoryByRFID,
  getDispenseStats
};
