/**
 * Modelo de Usuario
 * Incluye hash de contraseña, JWT, verificación y roles
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'Nombre máximo 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [8, 'Mínimo 8 caracteres'],
    select: false // No devolver password en queries
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  // Estado de la cuenta
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String },
  isEmailVerified: { type: Boolean, default: false },

  // VIP
  vipLevel: { type: Number, default: 0, min: 0, max: 9 },
  vipExpiresAt: { type: Date },
  vipActivatedAt: { type: Date },

  // Balance
  balance: { type: Number, default: 0, min: 0 },
  totalEarned: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  totalDeposited: { type: Number, default: 0 },

  // Tickets para ruleta
  tickets: { type: Number, default: 0, min: 0 },

  // Referidos
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },

  // Tareas diarias
  lastTaskReset: { type: Date, default: Date.now },
  tasksCompletedToday: { type: Number, default: 0 },

  // Verificación de email
  emailVerificationToken: String,
  emailVerificationExpire: Date,

  // Reset de contraseña
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // Refresh token
  refreshToken: { type: String, select: false },

  // Crypto
  usdBalance: { type: Number, default: 0, min: 0 },
  cryptoHoldings: { type: mongoose.Schema.Types.Mixed, default: {} },
  totalTradeVolume: { type: Number, default: 0 },
  totalTrades: { type: Number, default: 0 },

  // Bot Nakamura
  botEnabled:     { type: Boolean, default: false },
  botActivatedAt: { type: Date },
  botCycleEndsAt: { type: Date },   // cuando el bot termina el ciclo (2-4h desde activación)
  botLastRun:     { type: Date },
  botTotalEarned: { type: Number, default: 0 },

  // Push Notifications (FCM tokens por dispositivo)
  fcmTokens: { type: [String], default: [] },

  // Metadata
  lastLogin: { type: Date },
  lastIp: { type: String },
  profileImage: { type: String, default: '' },
  phone: { type: String },

}, { timestamps: true });

// ---- ÍNDICES ----
UserSchema.index({ role: 1 });
UserSchema.index({ vipLevel: 1 });

// ---- HOOKS ----

// Hash contraseña antes de guardar
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Generar código de referido único con entropía suficiente para evitar colisiones
UserSchema.pre('save', function() {
  if (!this.referralCode) {
    const prefix  = this.name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const entropy = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.referralCode = prefix + entropy;
  }
});

// Resetear tareas diarias si es un nuevo día
UserSchema.pre('save', function() {
  const now = new Date();
  const lastReset = new Date(this.lastTaskReset);
  if (now.toDateString() !== lastReset.toDateString()) {
    this.tasksCompletedToday = 0;
    this.lastTaskReset = now;
  }
});

// ---- MÉTODOS ----

// Comparar contraseña
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generar Access Token (JWT corto)
UserSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

// Generar Refresh Token (JWT largo)
UserSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '30d' }
  );
};

// Generar código OTP de 6 dígitos para verificación de email
UserSchema.methods.generateEmailVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // Guardamos el hash SHA-256 del código, nunca el código en texto plano
  this.emailVerificationToken = require('crypto').createHash('sha256').update(code).digest('hex');
  this.emailVerificationExpire = Date.now() + 15 * 60 * 1000; // 15 minutos
  return code; // devolvemos el código original para enviarlo por email
};

// Generar token de reset de contraseña
UserSchema.methods.generateResetPasswordToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1h
  return token;
};

// Devolver datos públicos seguros
UserSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    vipLevel: this.vipLevel,
    vipExpiresAt: this.vipExpiresAt,
    balance: this.balance,
    tickets: this.tickets,
    referralCode: this.referralCode,
    referralCount: this.referralCount,
    referralEarnings: this.referralEarnings,
    tasksCompletedToday: this.tasksCompletedToday,
    isEmailVerified: this.isEmailVerified,
    isActive: this.isActive,
    totalEarned: this.totalEarned,
    totalWithdrawn: this.totalWithdrawn,
    totalDeposited: this.totalDeposited,
    profileImage: this.profileImage,
    createdAt: this.createdAt,
    usdBalance: this.usdBalance,
    cryptoHoldings: this.cryptoHoldings,
    totalTradeVolume: this.totalTradeVolume,
    totalTrades: this.totalTrades
  };
};

module.exports = mongoose.model('User', UserSchema);
