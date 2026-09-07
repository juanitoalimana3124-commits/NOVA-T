/**
 * Conexión a MongoDB con Mongoose
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4
    });

    logger.info(`✅ MongoDB conectado: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB desconectado. Reconectando...');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`Error MongoDB: ${err.message}`);
    });

  } catch (error) {
    logger.error(`Error conectando a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
