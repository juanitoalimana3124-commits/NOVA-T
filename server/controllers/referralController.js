/**
 * Referral Controller
 * Estadísticas de referidos, comisiones
 */
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const REFERRAL_COMMISSION_RATE = parseFloat(process.env.REFERRAL_COMMISSION_RATE || '0.05'); // 5%

// @desc    Obtener info de referidos del usuario
// @route   GET /api/referrals/my
// @access  Privado
exports.getMyReferrals = async (req, res, next) => {
  try {
    const user = req.user;

    // Obtener usuarios referidos
    const referrals = await User.find({ referredBy: user._id })
      .select('name email vipLevel createdAt isActive')
      .sort({ createdAt: -1 });

    // Comisiones ganadas
    const commissions = await Transaction.find({
      user: user._id,
      type: 'referral_commission'
    }).sort({ createdAt: -1 }).limit(50);

    const totalCommissions = commissions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink: `${process.env.CLIENT_URL}/registro?ref=${user.referralCode}`,
        totalReferrals: referrals.length,
        activeReferrals: referrals.filter(r => r.isActive && r.vipLevel > 0).length,
        totalCommissionsEarned: totalCommissions,
        commissionRate: REFERRAL_COMMISSION_RATE * 100,
        referrals: referrals.map(r => ({
          name: r.name,
          email: r.email.replace(/(.{2}).*@/, '$1***@'), // Enmascarar email
          vipLevel: r.vipLevel,
          joinedAt: r.createdAt,
          isActive: r.isActive
        })),
        recentCommissions: commissions.slice(0, 10)
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Pagar comisión de referido (llamado internamente al aprobar depósito)
// @param   {ObjectId} referredUserId - El usuario que hizo el depósito
// @param   {number}   depositAmount  - Monto del depósito
exports.payReferralCommission = async (referredUserId, depositAmount) => {
  try {
    const referredUser = await User.findById(referredUserId);
    if (!referredUser?.referredBy) return;

    const referrer = await User.findById(referredUser.referredBy);
    if (!referrer) return;

    const commission = parseFloat((depositAmount * REFERRAL_COMMISSION_RATE).toFixed(2));
    if (commission <= 0) return;

    const balanceBefore = referrer.usdBalance || 0;
    const updatedReferrer = await User.findByIdAndUpdate(
      referrer._id,
      { $inc: { usdBalance: commission } },
      { new: true }
    );

    await Transaction.create({
      user: referrer._id,
      type: 'referral_commission',
      amount: commission,
      balanceBefore,
      balanceAfter: updatedReferrer.usdBalance,
      description: `Comisión de referido (${REFERRAL_COMMISSION_RATE * 100}% de $${depositAmount.toFixed(2)} USD)`,
      status: 'completed'
    });

    await Notification.create({
      user: referrer._id,
      type: 'referral',
      title: '🤝 Comisión de referido',
      message: `Ganaste $${commission.toFixed(2)} USD por el depósito de tu referido.`,
      metadata: { commission, referredUser: referredUserId }
    });

    logger.info(`Comisión de referido: ${referrer.email} recibió $${commission} USD por referido ${referredUser.email}`);

  } catch (error) {
    logger.error(`Error pagando comisión de referido: ${error.message}`);
  }
};

// @desc    Validar código de referido
// @route   GET /api/referrals/validate/:code
// @access  Público
exports.validateReferralCode = async (req, res, next) => {
  try {
    const code = req.params.code?.toUpperCase();
    if (!code) {
      return res.status(400).json({ success: false, message: 'Código requerido.' });
    }

    const user = await User.findOne({ referralCode: code }).select('name');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Código de referido inválido.' });
    }

    res.json({
      success: true,
      data: { valid: true, referrerName: user.name }
    });

  } catch (error) {
    next(error);
  }
};
