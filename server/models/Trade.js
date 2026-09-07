const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  coinId: { type: String, required: true },
  coinSymbol: { type: String, required: true },
  usdAmount: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  usdBalanceBefore: { type: Number },
  usdBalanceAfter: { type: Number },
}, { timestamps: true });

TradeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Trade', TradeSchema);
