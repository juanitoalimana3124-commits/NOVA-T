/**
 * Script: configurar ganancias del bot por plan VIP
 * Ejecutar: node server/scripts/setBotEarnings.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const VipPlan  = require('../models/VipPlan');

const EARNINGS = [
  { level: 1, botDailyEarning: 0.50  }, // $15/mes
  { level: 2, botDailyEarning: 1.00  }, // $30/mes
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  for (const { level, botDailyEarning } of EARNINGS) {
    const plan = await VipPlan.findOneAndUpdate(
      { level },
      { $set: { botDailyEarning } },
      { new: true }
    );
    if (plan) {
      console.log(`✓ ${plan.name}: $${botDailyEarning}/día (~$${(botDailyEarning * 30).toFixed(0)}/mes)`);
    } else {
      console.log(`✗ Plan nivel ${level} no encontrado`);
    }
  }

  await mongoose.disconnect();
  console.log('Listo.');
  process.exit(0);
})();
