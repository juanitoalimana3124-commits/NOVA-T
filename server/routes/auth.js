const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Rate limiters específicos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { success: false, message: 'Demasiados intentos de login. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: { success: false, message: 'Demasiados registros desde esta IP.' }
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Demasiadas solicitudes de recuperación. Intenta en 1 hora.' }
});

// Middleware de validación
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });
  }
  next();
};

// POST /api/auth/register
router.post('/register',
  registerLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres.'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener mínimo 8 caracteres.')
  ],
  validate,
  authController.register
);

// POST /api/auth/login
router.post('/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
    body('password').notEmpty().withMessage('Contraseña requerida.')
  ],
  validate,
  authController.login
);

// POST /api/auth/logout
router.post('/logout', protect, authController.logout);

// POST /api/auth/refresh
router.post('/refresh', authController.refreshToken);

// POST /api/auth/verify-email-code  (código OTP 6 dígitos)
router.post('/verify-email-code', authController.verifyEmail);

// POST /api/auth/resend-verification
router.post('/resend-verification', authController.resendVerification);

// POST /api/auth/forgot-password
router.post('/forgot-password',
  forgotLimiter,
  [body('email').isEmail().withMessage('Email inválido.')],
  validate,
  authController.forgotPassword
);

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token',
  [body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener mínimo 8 caracteres.')],
  validate,
  authController.resetPassword
);

// GET /api/auth/me
router.get('/me', protect, authController.getMe);

module.exports = router;
