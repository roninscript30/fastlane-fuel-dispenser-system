const mongoose = require('mongoose');

const dispenseSchema = new mongoose.Schema({
  rfid_uid: { type: String, required: true, index: true },
  volume_litre: { type: Number, required: true },
  amount: { type: Number, required: true },
  fuel_type: { type: String, default: 'PETROL' },
  status: { type: String, default: 'SUCCESS' },
  time: { type: Date, default: () => new Date() }
});

module.exports = mongoose.model('DispenseHistory', dispenseSchema);
