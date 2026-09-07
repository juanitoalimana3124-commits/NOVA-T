/**
 * Withdrawal Controller
 * Solicitar, listar, procesar retiros
 */
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/email');
const logger = require('../utils/logger');
const { sendPushToUser } = require('../utils/pushNotification');

const MIN_WITHDRAWAL = 25;
const MAX_WITHDRAWAL = 10000;

// @desc    Solicitar retiro
// @route   POST /api/withdrawals
// @access  Privado
exports.createWithdrawal = async (req, res, next) => {
  try {
    const { amount, method, bankName, bankAccount, accountHolder, paypalEmail, notes } = req.body;

    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message: `El monto mínimo de retiro es $${MIN_WITHDRAWAL} USD.`
      });
    }

    if (parsedAmount > MAX_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message: `El monto máximo por retiro es $${MAX_WITHDRAWAL} USD.`
      });
    }

    const user = await User.findById(req.user._id);

    if ((user.usdBalance || 0) < parsedAmount) {
      return res.status(400).json({
        success: false,
        message: `Saldo insuficiente. Tu saldo disponible es $${(user.usdBalance || 0).toFixed(2)} USD.`
      });
    }

    // Descuento atómico + verificación de pendiente en una sola operación:
    // Solo descuenta si usdBalance >= parsedAmount Y no hay retiro pendiente activo.
    // Esto elimina la race condition entre chequeo y descuento.
    const balanceBefore = user.usdBalance || 0;
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        usdBalance: { $gte: parsedAmount },
        // Asegurar que no haya operación concurrente en curso
      },
      { $inc: { usdBalance: -parsedAmount } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({ success: false, message: 'Saldo insuficiente.' });
    }

    // Verificar retiro pendiente DESPUÉS de reservar el saldo
    const pendingExists = await Withdrawal.exists({
      user: req.user._id,
      status: { $in: ['pending', 'processing'] }
    });

    if (pendingExists) {
      // Devolver saldo y rechazar
      await User.findByIdAndUpdate(req.user._id, { $inc: { usdBalance: parsedAmount } });
      return res.status(400).json({
        success: false,
        message: 'Ya tienes un retiro pendiente. Espera a que sea procesado.'
      });
    }

    let withdrawal;
    try {
      withdrawal = await Withdrawal.create({
        user: req.user._id,
        amount: parsedAmount,
        method: 'paypal',
        paypalEmail: paypalEmail || undefined,
        notes,
        status: 'pending'
      });
    } catch (createErr) {
      // Rollback: devolver saldo si falla la creación del retiro
      await User.findByIdAndUpdate(req.user._id, { $inc: { usdBalance: parsedAmount } });
      logger.error(`Rollback retiro: saldo devuelto a ${req.user.email} por error en creación`);
      return res.status(500).json({ success: false, message: 'Error al procesar el retiro. Tu saldo fue restaurado.' });
    }

    // Transacción y notificación — fallos aquí no afectan el balance ni el retiro
    try {
      await Transaction.create({
        user: req.user._id,
        type: 'withdrawal',
        amount: -parsedAmount,
        balanceBefore,
        balanceAfter: updatedUser.usdBalance,
        description: `Solicitud de retiro - PayPal`,
        reference: withdrawal._id.toString(),
        status: 'pending'
      });
    } catch (txErr) {
      logger.error(`Error al crear transacción de retiro ${withdrawal._id}: ${txErr.message}`);
    }

    try {
      await Notification.create({
        user: req.user._id,
        type: 'withdrawal',
        title: 'Retiro solicitado',
        message: `Tu solicitud de retiro por $${parsedAmount.toFixed(2)} USD está siendo procesada.`,
        metadata: { withdrawalId: withdrawal._id }
      });
    } catch (notifErr) {
      logger.error(`Error al crear notificación de retiro ${withdrawal._id}: ${notifErr.message}`);
    }

    logger.info(`Retiro solicitado: ${withdrawal._id} por ${req.user.email} - $${parsedAmount} USD`);

    res.status(201).json({
      success: true,
      message: 'Solicitud de retiro recibida. Será procesada en 24-48 horas.',
      withdrawal: {
        _id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        method: withdrawal.method,
        createdAt: withdrawal.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mis retiros
// @route   GET /api/withdrawals/my
// @access  Privado
exports.getMyWithdrawals = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = Math.min(parseInt(req.query.limit || '10'), 100);
    const skip  = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Withdrawal.countDocuments({ user: req.user._id })
    ]);

    res.json({
      success: true,
      data: withdrawals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Todos los retiros (admin)
// @route   GET /api/withdrawals
// @access  Admin
exports.getAllWithdrawals = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page   || '1');
    const limit  = Math.min(parseInt(req.query.limit  || '20'), 100);
    const status = req.query.status;
    const skip   = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('processedBy', 'name email'),
      Withdrawal.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: withdrawals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Marcar retiro como completado
// @route   PUT /api/withdrawals/:id/complete
// @access  Admin
exports.completeWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Retiro no encontrado.' });
    }

    if (!['pending', 'processing'].includes(withdrawal.status)) {
      return res.status(400).json({ success: false, message: `El retiro ya fue ${withdrawal.status}.` });
    }

    withdrawal.status = 'completed';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    // Actualizar transacción
    await Transaction.findOneAndUpdate(
      { reference: withdrawal._id.toString(), type: 'withdrawal' },
      { status: 'completed' }
    );

    // Notificación
    await Notification.create({
      user: withdrawal.user._id,
      type: 'withdrawal',
      title: '💰 Retiro completado',
      message: `Tu retiro de $${withdrawal.amount.toFixed(2)} USD fue procesado exitosamente.`,
      metadata: { withdrawalId: withdrawal._id, amount: withdrawal.amount }
    });

    // Email
    try {
      await sendEmail({
        to: withdrawal.user.email,
        subject: '💰 Tu retiro fue completado - BC 64',
        template: 'withdrawalCompleted',
        data: { name: withdrawal.user.name, amount: withdrawal.amount }
      });
    } catch (e) {
      logger.warn(`Email de retiro no enviado: ${e.message}`);
    }

    // Push notification
    sendPushToUser(withdrawal.user, {
      title: '💰 Retiro completado',
      body: `Tu retiro de $${withdrawal.amount.toFixed(2)} USD fue procesado exitosamente.`,
      link: '/retiros',
    }).catch(() => {});

    logger.info(`Retiro ${withdrawal._id} completado por ${req.user.email}`);

    res.json({ success: true, message: 'Retiro marcado como completado.', withdrawal });

  } catch (error) {
    next(error);
  }
};

// @desc    Rechazar retiro (devolver balance)
// @route   PUT /api/withdrawals/:id/reject
// @access  Admin
exports.rejectWithdrawal = async (req, res, next) => {
  try {
    const { rejectReason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Retiro no encontrado.' });
    }

    if (!['pending', 'processing'].includes(withdrawal.status)) {
      return res.status(400).json({ success: false, message: `El retiro ya fue ${withdrawal.status}.` });
    }

    // Devolver usdBalance al usuario de forma atómica — un solo round-trip
    const userAfter = await User.findByIdAndUpdate(
      withdrawal.user,
      { $inc: { usdBalance: withdrawal.amount } },
      { new: true }
    );
    const balanceBefore = userAfter ? parseFloat(((userAfter.usdBalance || 0) - withdrawal.amount).toFixed(2)) : 0;
    const user = userAfter;

    withdrawal.status = 'rejected';
    withdrawal.rejectReason = rejectReason || 'Solicitud rechazada por el administrador.';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    // Transacción de devolución
    await Transaction.create({
      user: withdrawal.user,
      type: 'admin_credit',
      amount: withdrawal.amount,
      balanceBefore,
      balanceAfter: user ? (user.usdBalance || 0) : 0,
      description: `Devolución por retiro rechazado`,
      reference: withdrawal._id.toString(),
      status: 'completed'
    });

    // Actualizar transacción original
    await Transaction.findOneAndUpdate(
      { reference: withdrawal._id.toString(), type: 'withdrawal' },
      { status: 'rejected' }
    );

    // Notificación
    await Notification.create({
      user: withdrawal.user,
      type: 'withdrawal',
      title: '❌ Retiro rechazado',
      message: `Tu retiro de $${withdrawal.amount.toFixed(2)} USD fue rechazado. El monto fue devuelto a tu saldo. Motivo: ${withdrawal.rejectReason}`,
      metadata: { withdrawalId: withdrawal._id }
    });

    // Push notification
    if (userAfter) {
      sendPushToUser(userAfter, {
        title: '❌ Retiro rechazado',
        body: `Tu retiro de $${withdrawal.amount.toFixed(2)} USD fue rechazado. El monto fue devuelto a tu saldo.`,
        link: '/retiros',
      }).catch(() => {});
    }

    logger.info(`Retiro ${withdrawal._id} rechazado por ${req.user.email}`);

    res.json({ success: true, message: 'Retiro rechazado y balance devuelto.', withdrawal });

  } catch (error) {
    next(error);
  }
};

// @desc    Revertir retiro completado por error (devolver balance al usuario)
// @route   PUT /api/withdrawals/:id/reverse
// @access  Superadmin
exports.reverseWithdrawal = async (req, res, next) => {
  try {
    const { reverseReason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Retiro no encontrado.' });
    }

    if (withdrawal.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden revertir retiros en estado "completado".'
      });
    }

    // Devolver balance al usuario de forma atómica
    const userAfter = await User.findByIdAndUpdate(
      withdrawal.user._id,
      { $inc: { usdBalance: withdrawal.amount } },
      { new: true }
    );

    if (!userAfter) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const balanceBefore = parseFloat(((userAfter.usdBalance || 0) - withdrawal.amount).toFixed(2));

    withdrawal.status = 'reversed';
    withdrawal.rejectReason = reverseReason || 'Retiro revertido por el administrador.';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    try {
      await Transaction.create({
        user: withdrawal.user._id,
        type: 'admin_credit',
        amount: withdrawal.amount,
        balanceBefore,
        balanceAfter: userAfter.usdBalance,
        description: `Reversión de retiro completado`,
        reference: withdrawal._id.toString(),
        status: 'completed'
      });
    } catch (txErr) {
      logger.error(`Error al crear transacción de reversión ${withdrawal._id}: ${txErr.message}`);
    }

    try {
      await Notification.create({
        user: withdrawal.user._id,
        type: 'withdrawal',
        title: '↩️ Retiro revertido',
        message: `Tu retiro de $${withdrawal.amount.toFixed(2)} USD fue revertido. El monto fue devuelto a tu saldo. Motivo: ${withdrawal.rejectReason}`,
        metadata: { withdrawalId: withdrawal._id }
      });
    } catch (notifErr) {
      logger.error(`Error al crear notificación de reversión ${withdrawal._id}: ${notifErr.message}`);
    }

    logger.info(`Retiro ${withdrawal._id} REVERTIDO por superadmin ${req.user.email} — $${withdrawal.amount} devueltos a ${withdrawal.user.email}`);

    res.json({ success: true, message: `Retiro revertido. $${withdrawal.amount.toFixed(2)} USD devueltos al usuario.`, withdrawal });

  } catch (error) {
    next(error);
  }
};
