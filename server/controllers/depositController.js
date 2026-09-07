/**
 * Deposit Controller
 * Crear, listar, aprobar/rechazar depósitos
 */
const Deposit = require('../models/Deposit');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const VipPlan = require('../models/VipPlan');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/email');
const logger = require('../utils/logger');
const { payReferralCommission } = require('./referralController');
const { sendPushToUser } = require('../utils/pushNotification');

// Cloudinary opcional
let cloudinary;
try {
  cloudinary = require('cloudinary').v2;
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  } else {
    cloudinary = null;
  }
} catch {
  cloudinary = null;
}

// @desc    Crear depósito (subir voucher)
// @route   POST /api/deposits
// @access  Privado
exports.createDeposit = async (req, res, next) => {
  try {
    const { amount, bank, vipPlanId, notes, paypalTransactionId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Debes subir el comprobante de pago.' });
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Monto inválido.' });
    }
    if (parsedAmount > 50000) {
      return res.status(400).json({ success: false, message: 'El monto máximo por depósito es $50,000 USD.' });
    }

    // Validar plan VIP si se especifica
    let vipPlan = null;
    if (vipPlanId) {
      vipPlan = await VipPlan.findById(vipPlanId);
      if (!vipPlan) {
        return res.status(404).json({ success: false, message: 'Plan VIP no encontrado.' });
      }
    }

    // Subir a Cloudinary o usar path local
    let voucherUrl = '';
    let voucherPublicId = '';

    if (cloudinary && req.file.path) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'bc64/vouchers',
          resource_type: 'image'
        });
        voucherUrl = result.secure_url;
        voucherPublicId = result.public_id;
        // Eliminar archivo local después de subir
        const fs = require('fs');
        fs.unlink(req.file.path, () => {});
      } catch (uploadErr) {
        logger.warn(`Cloudinary upload failed, usando local: ${uploadErr.message}`);
        voucherUrl = `/uploads/vouchers/${req.file.filename}`;
      }
    } else {
      voucherUrl = `/uploads/vouchers/${req.file.filename}`;
    }

    const deposit = await Deposit.create({
      user: req.user._id,
      amount: parsedAmount,
      bank: bank || 'otra',
      vipPlan: vipPlanId || null,
      voucherUrl,
      voucherPublicId,
      notes,
      paypalTransactionId: bank === 'paypal' ? (paypalTransactionId || '') : undefined,
      status: 'pending'
    });

    // Notificación al usuario
    const amountLabel = vipPlan
      ? `$${parsedAmount.toFixed(2)} USD (${vipPlan.name})`
      : `$${parsedAmount.toFixed(2)} USD`;
    await Notification.create({
      user: req.user._id,
      type: 'deposit',
      title: 'Pago recibido',
      message: `Tu pago de ${amountLabel} está siendo revisado. Te notificaremos pronto.`,
      metadata: { depositId: deposit._id }
    });

    logger.info(`Depósito creado: ${deposit._id} por usuario ${req.user.email} - $${parsedAmount} USD`);

    res.status(201).json({
      success: true,
      message: 'Depósito enviado. Será revisado en las próximas horas.',
      deposit: {
        _id: deposit._id,
        amount: deposit.amount,
        bank: deposit.bank,
        status: deposit.status,
        voucherUrl: deposit.voucherUrl,
        createdAt: deposit.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mis depósitos
// @route   GET /api/deposits/my
// @access  Privado
exports.getMyDeposits = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = Math.min(parseInt(req.query.limit || '10'), 100);
    const skip  = (page - 1) * limit;

    const [deposits, total] = await Promise.all([
      Deposit.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('vipPlan', 'name level'),
      Deposit.countDocuments({ user: req.user._id })
    ]);

    res.json({
      success: true,
      data: deposits,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener todos los depósitos (admin)
// @route   GET /api/deposits
// @access  Admin
exports.getAllDeposits = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page   || '1');
    const limit  = Math.min(parseInt(req.query.limit  || '20'), 100);
    const status = req.query.status;
    const skip   = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const [deposits, total] = await Promise.all([
      Deposit.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email vipLevel')
        .populate('vipPlan', 'name level')
        .populate('reviewedBy', 'name email'),
      Deposit.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: deposits,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Aprobar depósito
// @route   PUT /api/deposits/:id/approve
// @access  Admin
exports.approveDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findById(req.params.id).populate('user').populate('vipPlan');

    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Depósito no encontrado.' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ success: false, message: `El depósito ya fue ${deposit.status}.` });
    }

    const user = await User.findById(deposit.user._id);

    if (deposit.vipPlan) {
      // Compra de plan VIP: acreditar bono USD, activar membresía permanente
      const plan = deposit.vipPlan;
      const usdBonus = plan.usdBonus || 0;
      user.vipLevel = plan.level;
      user.vipExpiresAt = new Date('2099-12-31'); // membresía permanente
      user.usdBalance = parseFloat(((user.usdBalance || 0) + usdBonus).toFixed(2));

      await Notification.create({
        user: user._id,
        type: 'vip',
        title: `¡${plan.name} activado! 🎉`,
        message: `Tu membresía ${plan.name} fue activada. Recibiste $${usdBonus} USD para operar en el mercado.`,
        metadata: { planId: plan._id, level: plan.level }
      });
    } else {
      // Depósito regular: acreditar directamente en USD
      user.usdBalance = parseFloat(((user.usdBalance || 0) + deposit.amount).toFixed(2));
    }

    await user.save({ validateBeforeSave: false });

    // Actualizar depósito
    deposit.status = 'approved';
    deposit.reviewedBy = req.user._id;
    deposit.reviewedAt = new Date();
    await deposit.save();

    // Crear transacción
    const credited = deposit.vipPlan ? (deposit.vipPlan.usdBonus || 0) : deposit.amount;
    await Transaction.create({
      user: user._id,
      type: deposit.vipPlan ? 'vip_purchase' : 'deposit',
      amount: credited,
      balanceBefore: parseFloat(((user.usdBalance || 0) - credited).toFixed(2)),
      balanceAfter: user.usdBalance,
      description: deposit.vipPlan
        ? `Membresía ${deposit.vipPlan.name} activada`
        : `Depósito aprobado - ${deposit.bank}`,
      reference: deposit._id.toString(),
      status: 'completed'
    });

    // Notificación al usuario
    await Notification.create({
      user: user._id,
      type: 'deposit',
      title: '✅ Depósito aprobado',
      message: `Tu depósito de $${deposit.amount.toFixed(2)} USD fue aprobado y acreditado.`,
      metadata: { depositId: deposit._id, amount: deposit.amount }
    });

    // Email
    try {
      await sendEmail({
        to: user.email,
        subject: '✅ Tu depósito fue aprobado - BC 64',
        template: 'depositApproved',
        data: {
          name: user.name,
          amount: deposit.amount,
          planName: deposit.vipPlan?.name || 'General'
        }
      });
    } catch (e) {
      logger.warn(`Email de aprobación no enviado: ${e.message}`);
    }

    // Push notification
    const freshUser = await require('../models/User').findById(user._id);
    sendPushToUser(freshUser, {
      title: '✅ Depósito aprobado',
      body: `Tu depósito de $${deposit.amount.toFixed(2)} USD fue aprobado y acreditado en tu cuenta.`,
      link: '/depositos',
    }).catch(() => {});

    // Pagar comisión de referido en USD — amount ya está en USD, no dividir
    const usdDeposited = deposit.vipPlan
      ? (deposit.vipPlan.usdBonus || 0)
      : deposit.amount;
    if (usdDeposited > 0) {
      payReferralCommission(deposit.user._id, usdDeposited).catch(() => {});
    }

    logger.info(`Depósito ${deposit._id} aprobado por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Depósito aprobado y balance acreditado.',
      deposit
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Rechazar depósito
// @route   PUT /api/deposits/:id/reject
// @access  Admin
exports.rejectDeposit = async (req, res, next) => {
  try {
    const { rejectReason } = req.body;

    const deposit = await Deposit.findById(req.params.id).populate('user');

    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Depósito no encontrado.' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ success: false, message: `El depósito ya fue ${deposit.status}.` });
    }

    deposit.status = 'rejected';
    deposit.rejectReason = rejectReason || 'Voucher inválido o ilegible.';
    deposit.reviewedBy = req.user._id;
    deposit.reviewedAt = new Date();
    await deposit.save();

    // Notificación
    await Notification.create({
      user: deposit.user._id,
      type: 'deposit',
      title: '❌ Depósito rechazado',
      message: `Tu depósito de $${deposit.amount.toFixed(2)} USD fue rechazado. Motivo: ${deposit.rejectReason}`,
      metadata: { depositId: deposit._id }
    });

    // Email
    try {
      await sendEmail({
        to: deposit.user.email,
        subject: '❌ Tu depósito fue rechazado - BC 64',
        template: 'depositRejected',
        data: { name: deposit.user.name, rejectReason: deposit.rejectReason }
      });
    } catch (e) {
      logger.warn(`Email de rechazo no enviado: ${e.message}`);
    }

    logger.info(`Depósito ${deposit._id} rechazado por ${req.user.email}`);

    res.json({ success: true, message: 'Depósito rechazado.', deposit });

  } catch (error) {
    next(error);
  }
};
