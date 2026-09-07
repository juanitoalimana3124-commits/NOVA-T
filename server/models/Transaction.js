const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'task_reward', 'vip_purchase',
           'roulette_win', 'referral_commission', 'admin_credit', 'admin_debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceBefore: { type: Number, required: true },
  balanceAfter:  { type: Number, required: true },
  description:   { type: String, required: true },
  reference:     { type: String }, // ID del depósito/retiro relacionado
  metadata:      { type: mongoose.Schema.Types.Mixed, default: {} },
  ip:            { type: String }
}, { timestamps: true });

TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
