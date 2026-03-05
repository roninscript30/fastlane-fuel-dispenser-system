const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  rfid_uid: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  name: { type: String, default: '' },
  car_number: { type: String, default: '' },
  balance: { type: Number, default: 0 },

  // last dispense info (flat)
  last_dispense: { type: Date, default: null },
  last_dispense_volume: { type: Number, default: 0 },
  last_dispense_amount: { type: Number, default: 0 },
  last_dispense_status: { type: String, default: '' },

  // last topup info (flat)
  last_topup: { type: Date, default: null },
  last_topup_amount: { type: Number, default: 0 },

  // counters
  total_dispenses: { type: Number, default: 0 },
  total_topups: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
