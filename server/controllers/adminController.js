/**
 * Admin Controller
 * Dashboard, gestión de usuarios, estadísticas, movimientos
 */
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// @desc    Dashboard stats
// @route   GET /api/admin/dashboard
// @access  Admin
exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      pendingDeposits,
      pendingWithdrawals,
      totalDepositsAmount,
      totalWithdrawalsAmount,
      recentTransactions
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true, isBanned: false }),
      User.countDocuments({ role: 'user', createdAt: { $gte: today } }),
      Deposit.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: { $in: ['pending', 'processing'] } }),
      Deposit.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Withdrawal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email')
    ]);

    // Stats por VIP nivel
    const vipStats = await User.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: '$vipLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Ingresos últimos 7 días
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyDeposits = await Deposit.aggregate([
      { $match: { status: 'approved', createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          newUsersToday,
          pendingDeposits,
          pendingWithdrawals,
          totalDeposited: totalDepositsAmount[0]?.total || 0,
          totalWithdrawn: totalWithdrawalsAmount[0]?.total || 0
        },
        vipStats,
        dailyDeposits,
        recentTransactions
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Listar todos los usuarios
// @route   GET /api/admin/users
// @access  Admin
exports.getUsers = async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page    || '1');
    const limit   = Math.min(parseInt(req.query.limit   || '20'), 100);
    const search  = req.query.search;
    const role    = req.query.role;
    const vipLevel = req.query.vipLevel;
    const skip    = (page - 1) * limit;

    const query = {};
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { referralCode: { $regex: safeSearch, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (vipLevel !== undefined) query.vipLevel = parseInt(vipLevel);

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password -refreshToken -emailVerificationToken -resetPasswordToken'),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener usuario específico
// @route   GET /api/admin/users/:id
// @access  Admin
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken')
      .populate('referredBy', 'name email');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    // Stats del usuario
    const [deposits, withdrawals] = await Promise.all([
      Deposit.find({ user: user._id }).sort({ createdAt: -1 }).limit(10),
      Withdrawal.find({ user: user._id }).sort({ createdAt: -1 }).limit(10)
    ]);

    res.json({
      success: true,
      data: { user, deposits, withdrawals }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Banear/desbanear usuario
// @route   PUT /api/admin/users/:id/ban
// @access  Admin
exports.banUser = async (req, res, next) => {
  try {
    const { ban, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (user.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'No puedes banear a un superadmin.' });
    }
    if (user.role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Solo un superadmin puede banear a un administrador.' });
    }

    user.isBanned = ban;
    user.banReason = ban ? (reason || 'Violación de términos.') : undefined;
    await user.save({ validateBeforeSave: false });

    // Notificación
    await Notification.create({
      user: user._id,
      type: 'ban',
      title: ban ? '⚠️ Cuenta suspendida' : '✅ Cuenta reactivada',
      message: ban
        ? `Tu cuenta ha sido suspendida. Motivo: ${user.banReason}`
        : 'Tu cuenta ha sido reactivada. Puedes iniciar sesión normalmente.'
    });

    logger.info(`Usuario ${user.email} ${ban ? 'baneado' : 'desbaneado'} por ${req.user.email}`);

    res.json({
      success: true,
      message: `Usuario ${ban ? 'suspendido' : 'reactivado'} correctamente.`,
      data: { isBanned: user.isBanned, banReason: user.banReason }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Ajustar balance manualmente
// @route   POST /api/admin/users/:id/balance
// @access  Superadmin
exports.adjustBalance = async (req, res, next) => {
  try {
    const { amount, description } = req.body;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount === 0) {
      return res.status(400).json({ success: false, message: 'Monto inválido.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (['admin', 'superadmin'].includes(user.role) && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'No puedes ajustar el balance de un administrador.' });
    }

    const balanceBefore = user.usdBalance || 0;
    const newBalance = parseFloat(Math.max(0, balanceBefore + parsedAmount).toFixed(2));
    user.usdBalance = newBalance;
    await user.save({ validateBeforeSave: false });

    await Transaction.create({
      user: user._id,
      type: parsedAmount > 0 ? 'admin_credit' : 'admin_debit',
      amount: parsedAmount,
      balanceBefore,
      balanceAfter: newBalance,
      description: description || `Ajuste manual por admin: ${req.user.email}`,
      status: 'completed'
    });

    await Notification.create({
      user: user._id,
      type: 'system',
      title: parsedAmount > 0 ? '💰 Balance acreditado' : '💸 Balance deducido',
      message: `${parsedAmount > 0 ? '+' : ''}$${Math.abs(parsedAmount).toFixed(2)} USD ajustado en tu cuenta. ${description || ''}`
    });

    logger.info(`Balance USD ajustado: ${user.email} ${parsedAmount > 0 ? '+' : ''}${parsedAmount} por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Balance ajustado correctamente.',
      data: { newBalance, balanceBefore, adjustment: parsedAmount }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Todos los movimientos (transacciones)
// @route   GET /api/admin/transactions
// @access  Admin
exports.getAllTransactions = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = Math.min(parseInt(req.query.limit || '30'), 100);
    const type  = req.query.type;
    const skip  = (page - 1) * limit;

    const query = {};
    if (type) query.type = type;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email'),
      Transaction.countDocuments(query)
    ]);

    // Totales por tipo
    const totals = await Transaction.aggregate([
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: transactions,
      totals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar plan VIP manualmente a un usuario
// @route   POST /api/admin/users/:id/activate-vip
// @access  Superadmin
exports.activateVipForUser = async (req, res, next) => {
  try {
    const { vipLevel, durationDays } = req.body;
    const VipPlan = require('../models/VipPlan');

    const plan = await VipPlan.findOne({ level: parseInt(vipLevel) });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan VIP no encontrado.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    user.vipLevel = plan.level;
    user.vipExpiresAt = new Date('2099-12-31');
    user.usdBalance = parseFloat(((user.usdBalance || 0) + (plan.usdBonus || 0)).toFixed(2));
    await user.save({ validateBeforeSave: false });

    await Notification.create({
      user: user._id,
      type: 'vip',
      title: `Plan ${plan.name} activado 🎉`,
      message: `Tu plan ${plan.name} ha sido activado manualmente por el administrador.`
    });

    logger.info(`VIP ${plan.name} activado manualmente para ${user.email} por ${req.user.email}`);

    res.json({
      success: true,
      message: `Plan ${plan.name} activado para ${user.email}.`,
      data: { vipLevel: user.vipLevel, vipExpiresAt: user.vipExpiresAt }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas generales del sistema
// @route   GET /api/admin/stats
// @access  Admin
exports.getStats = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      userGrowth,
      depositTrend,
      withdrawalTrend
    ] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, role: 'user' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Deposit.aggregate([
        { $match: { status: 'approved', createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Withdrawal.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: { userGrowth, depositTrend, withdrawalTrend }
    });

  } catch (error) {
    next(error);
  }
};
