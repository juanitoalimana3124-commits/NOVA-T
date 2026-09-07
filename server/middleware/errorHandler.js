const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error
  logger.error(`${err.name}: ${err.message} | URL: ${req.originalUrl} | IP: ${req.ip}`);

  // Error de Mongoose: ID inválido
  if (err.name === 'CastError') {
    error.message = 'Recurso no encontrado.';
    return res.status(404).json({ success: false, message: error.message });
  }

  // Error de Mongoose: campo duplicado
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `El ${field} ya está registrado.`;
    return res.status(400).json({ success: false, message: error.message });
  }

  // Error de validación Mongoose
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(e => e.message).join('. ');
    return res.status(400).json({ success: false, message: error.message });
  }

  // Error JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token inválido.' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
