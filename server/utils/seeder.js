/**
 * Seeder: Inicializa la DB con admin + planes VIP
 * Uso: node utils/seeder.js
 *      node utils/seeder.js --destroy (borra todo)
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const VipPlan = require('../models/VipPlan');

// Planes VIP
const vipPlans = [
  {
    level: 1, name: 'VIP 1',
    price: 10, usdBonus: 15,
    description: 'Ideal para comenzar a operar en el mercado crypto.',
    color: '#F97316', isActive: true, sortOrder: 1
  },
  {
    level: 2, name: 'VIP 2',
    price: 25, usdBonus: 40,
    description: 'Mayor capital para multiplicar tus operaciones.',
    color: '#F97316', isActive: true, sortOrder: 2
  },
  {
    level: 3, name: 'VIP 3',
    price: 50, usdBonus: 85,
    description: 'Capital premium para traders serios.',
    color: '#D97706', isActive: true, sortOrder: 3
  },
  {
    level: 4, name: 'VIP 4',
    price: 100, usdBonus: 175,
    description: 'El máximo capital disponible para operar.',
    color: '#D97706', isActive: true, sortOrder: 4
  },
];

const seedDB = async () => {
  await connectDB();

  if (process.argv[2] === '--destroy') {
    console.log('🗑️  Eliminando datos...');
    await User.deleteMany({});
    await VipPlan.deleteMany({});
    console.log('✅ Datos eliminados');
    process.exit(0);
  }

  console.log('🌱 Iniciando seeder...');

  // --- VIP Plans ---
  await VipPlan.deleteMany({});
  await VipPlan.insertMany(vipPlans);
  console.log(`✅ ${vipPlans.length} planes VIP creados`);

  // --- Admin user ---
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bc64.com';
  const adminPass  = process.env.ADMIN_PASSWORD || 'Admin2024BC!';

  // Siempre recrear el admin para garantizar contraseña correcta
  await User.deleteOne({ email: adminEmail });
  await User.create({
    name: 'Super Admin',
    email: adminEmail,
    password: adminPass,  // el hook pre-save hashea la contraseña automáticamente
    role: 'superadmin',
    isEmailVerified: true,
    isActive: true,
    balance: 0,
    referralCode: 'ADMIN001'
  });
  console.log(`✅ Admin creado: ${adminEmail}`);

  console.log('\n🎉 Seeder completado exitosamente\n');
  process.exit(0);
};

seedDB().catch((err) => {
  console.error('❌ Error en seeder:', err);
  process.exit(1);
});
