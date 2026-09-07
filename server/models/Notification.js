const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:    { type: String, enum: ['deposit', 'withdrawal', 'vip', 'task', 'roulette', 'referral', 'system', 'ban'], required: true },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  isRead:  { type: Boolean, default: false },
  link:    { type: String },
  metadata:{ type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
