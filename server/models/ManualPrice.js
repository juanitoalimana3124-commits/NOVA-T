const mongoose = require('mongoose');

const manualPriceSchema = new mongoose.Schema({
  coinId:  { type: String, required: true, unique: true },
  symbol:  { type: String, required: true },
  name:    { type: String, required: true },
  price:   { type: Number, required: true, min: 0 },
  enabled: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('ManualPrice', manualPriceSchema);
