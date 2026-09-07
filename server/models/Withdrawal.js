const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: [25, 'El monto mínimo de retiro es $25 USD']
  },
  method: {
    type: String,
    enum: ['bank_transfer', 'paypal'],
    default: 'bank_transfer'
  },
  // Datos bancarios
  bankName:      { type: String },
  bankAccount:   { type: String },
  accountHolder: { type: String },
  // Datos PayPal
  paypalEmail:   { type: String },

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected', 'reversed'],
    default: 'pending',
    index: true
  },
  processedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt:  { type: Date },
  rejectReason: { type: String },
  notes:        { type: String },
  ip:           { type: String }
}, { timestamps: true });

WithdrawalSchema.index({ status: 1, createdAt: -1 });
WithdrawalSchema.index({ user: 1, status: 1 });

// Índice único parcial: solo un retiro pending/processing por usuario a la vez
// Esto bloquea a nivel de DB la race condition de doble retiro
WithdrawalSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'processing'] } }, name: 'one_pending_per_user' }
);

module.exports = mongoose.model('Withdrawal', WithdrawalSchema);
