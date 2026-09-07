/**
 * BC 64 - Servidor Principal
 * Entry point de la aplicación Express
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Rutas
const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const depositRoutes     = require('./routes/deposits');
const withdrawalRoutes  = require('./routes/withdrawals');
const vipRoutes         = require('./routes/vip');
const referralRoutes    = require('./routes/referrals');
const adminRoutes       = require('./routes/admin');
const notifRoutes       = require('./routes/notifications');
const cryptoRoutes      = require('./routes/crypto');
const pricesRoutes      = require('./routes/prices');
const marketsRoutes     = require('./routes/markets');
const botRoutes         = require('./routes/bot');
const pushRoutes        = require('./routes/push');

// Iniciar caché de precios al arrancar el servidor
require('./utils/priceCache');

// Inicializar Firebase para Push Notifications
require('./utils/pushNotification').initFirebase();

// Conectar DB
connectDB();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`WebSocket conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`WebSocket desconectado: ${socket.id}`);
  });
});

// ============================================================
// SEGURIDAD & MIDDLEWARE GLOBAL
// ============================================================

// Cabeceras de seguridad HTTP
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' }
}));

// CORS - solo permite el cliente autorizado
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: parseInt(process.env.RATE_LIMIT_MAX || 100),
  message: { success: false, message: 'Demasiadas solicitudes. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', globalLimiter);

// Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { success: false, message: 'Demasiados intentos de login. Intenta en 15 minutos.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Rate limit estricto para OTP — máx 5 intentos por 15 min
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Demasiados intentos. Espera 15 minutos.' }
});
app.use('/api/auth/verify-email-code', otpLimiter);
app.use('/api/auth/resend-verification', otpLimiter);

// Rate limit para uploads de vouchers
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: { success: false, message: 'Demasiados intentos de depósito. Intenta más tarde.' }
});
app.use('/api/deposits', uploadLimiter);

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitización: previene NoSQL injection y XSS
app.use(mongoSanitize());
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query);
  next();
});

// Compresión gzip
app.use(compression());

// Logger HTTP (solo en dev)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Archivos estáticos (comprobantes) — solo admins o el usuario dueño pueden acceder
// Se sirven a través de una ruta protegida en lugar de static público
const { protect, adminOnly } = require('./middleware/auth');
app.get('/uploads/vouchers/:filename', protect, adminOnly, (req, res) => {
  const safeName = path.basename(req.params.filename);
  res.sendFile(path.join(__dirname, 'uploads/vouchers', safeName));
});

// ============================================================
// RUTAS API
// ============================================================
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/deposits',      depositRoutes);
app.use('/api/withdrawals',   withdrawalRoutes);
app.use('/api/vip',           vipRoutes);
app.use('/api/referrals',     referralRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/crypto',        cryptoRoutes);
app.use('/api/prices',        pricesRoutes);
app.use('/api/markets',       marketsRoutes);
app.use('/api/bot',           botRoutes);
app.use('/api/push',          pushRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

// Sirve el build de React en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  });
}

// 404 para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Manejador global de errores
app.use(errorHandler);

// ============================================================
// INICIO DEL SERVIDOR
// ============================================================
const PORT = process.env.PORT || 5000;
const server = httpServer.listen(PORT, () => {
  logger.info(`🚀 BC 64 Server corriendo en puerto ${PORT} [${process.env.NODE_ENV}]`);
  // Iniciar Nakamura Bot en proceso aislado con manejo de errores
  try {
    const { startNakamuraBot } = require('./utils/nakamuraBot');
    startNakamuraBot();
  } catch (botErr) {
    logger.error(`Error al iniciar Nakamura Bot: ${botErr.message}`);
  }
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  logger.error(`Error no manejado: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido. Cerrando servidor...');
  server.close(() => process.exit(0));
});

module.exports = app;
