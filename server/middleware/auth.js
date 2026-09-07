/**
 * Middleware de autenticación JWT
 * Verifica access token en header o cookie
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Buscar token en header Authorization
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. O en cookie HTTPOnly
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Inicia sesión para continuar.'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario en DB (no cachear - siempre fresco)
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta ha sido suspendida. Contacta al soporte para más información.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Cuenta desactivada.' });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado.', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token inválido.' });
    }
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }
};

// Middleware: solo admins
const adminOnly = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

// Middleware: solo superadmin
const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de superadmin.'
    });
  }
  next();
};

module.exports = { protect, adminOnly, superAdminOnly };
