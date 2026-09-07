/**
 * Logger con Winston
 * Niveles: error, warn, info, http, debug
 */
const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Formato para consola
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Formato para archivos
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// Determinar nivel según entorno
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'warn';
};

const logger = winston.createLogger({
  level: level(),
  format: fileFormat,
  defaultMeta: { service: 'bc64-api' },
  transports: [
    // Archivo de errores
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5
    }),
    // Archivo de todos los logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10
    })
  ]
});

// En desarrollo también mostrar en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'HH:mm:ss' }),
      errors({ stack: true }),
      consoleFormat
    )
  }));
}

// Morgan stream para HTTP logs
logger.stream = {
  write: (message) => logger.http(message.trim())
};

module.exports = logger;
