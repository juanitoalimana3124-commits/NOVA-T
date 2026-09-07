const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [1, 'Monto inválido']
  },
  bank: {
    type: String,
    required: true,
    enum: ['popular', 'reservas', 'bhd', 'scotiabank', 'paypal', 'otra'],
    default: 'otra'
  },
  // Datos PayPal (ID de transacción o email del pagador)
  paypalTransactionId: { type: String },
  vipPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VipPlan',
    default: null
  },
  voucherUrl:      { type: String, required: [true, 'El comprobante es requerido'] },
  voucherPublicId: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:   { type: Date },
  rejectReason: { type: String },
  notes:        { type: String },
  ip:           { type: String }
}, { timestamps: true });

DepositSchema.index({ status: 1, createdAt: -1 });
DepositSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Deposit', DepositSchema);
