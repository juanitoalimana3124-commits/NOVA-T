const mongoose = require('mongoose');

const VipPlanSchema = new mongoose.Schema({
  level:            { type: Number, required: true, unique: true, min: 1, max: 9 },
  name:             { type: String, required: true },
  price:            { type: Number, required: true },
  usdBonus:         { type: Number, required: true, default: 0 },
  botDailyEarning:  { type: Number, default: 0 }, // Ganancia fija diaria del bot Nakamura
  description:      { type: String, default: '' },
  color:            { type: String, default: '#F97316' },
  isActive:         { type: Boolean, default: true },
  sortOrder:        { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('VipPlan', VipPlanSchema);
