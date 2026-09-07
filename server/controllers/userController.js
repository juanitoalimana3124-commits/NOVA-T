/**
 * User Controller
 * Perfil, cambio de contraseña, avatar
 */
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

// @desc    Obtener perfil completo
// @route   GET /api/users/profile
// @access  Privado
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('referredBy', 'name referralCode');

    res.json({ success: true, data: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar perfil (nombre)
// @route   PUT /api/users/profile
// @access  Privado
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name'];
    const updates = {};

    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.name) {
      updates.name = updates.name.trim();
      if (updates.name.length < 2 || updates.name.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El nombre debe tener entre 2 y 50 caracteres.'
        });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    res.json({ success: true, data: user.toPublicJSON(), message: 'Perfil actualizado.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Cambiar contraseña
// @route   PUT /api/users/change-password
// @access  Privado
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Contraseña actual y nueva son requeridas.' });
    }

    // Validar nueva contraseña
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta.' });
    }

    user.password = newPassword;
    user.refreshToken = null; // Invalidar sesiones existentes
    await user.save();

    logger.info(`Contraseña cambiada: ${user.email}`);

    res.json({ success: true, message: 'Contraseña actualizada. Por favor inicia sesión nuevamente.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Subir avatar
// @route   PUT /api/users/avatar
// @access  Privado
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió imagen.' });
    }

    let avatarUrl = `/uploads/vouchers/${req.file.filename}`;

    // Intentar subir a Cloudinary si está configurado
    try {
      const cloudinary = require('cloudinary').v2;
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'bc64/avatars',
          transformation: [{ width: 200, height: 200, crop: 'fill' }]
        });
        avatarUrl = result.secure_url;
        const fs = require('fs');
        fs.unlink(req.file.path, () => {});
      }
    } catch (e) {
      logger.warn(`Cloudinary avatar upload failed: ${e.message}`);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: avatarUrl },
      { new: true }
    );

    res.json({ success: true, data: { avatar: user.profileImage }, message: 'Avatar actualizado.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Resumen de transacciones del usuario
// @route   GET /api/users/transactions
// @access  Privado
exports.getMyTransactions = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const type  = req.query.type;
    const skip  = (page - 1) * limit;

    const query = { user: req.user._id };
    if (type) query.type = type;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};
