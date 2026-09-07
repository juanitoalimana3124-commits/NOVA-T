/**
 * VIP Controller
 * Planes VIP, activación, estado
 */
const VipPlan = require('../models/VipPlan');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Obtener todos los planes VIP
// @route   GET /api/vip/plans
// @access  Público
exports.getPlans = async (req, res, next) => {
  try {
    const plans = await VipPlan.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener plan por ID
// @route   GET /api/vip/plans/:id
// @access  Público
exports.getPlanById = async (req, res, next) => {
  try {
    const plan = await VipPlan.findById(req.params.id);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
    }
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Estado VIP del usuario actual
// @route   GET /api/vip/status
// @access  Privado
exports.getMyVipStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const now = new Date();

    let currentPlan = null;
    if (user.vipLevel > 0) {
      currentPlan = await VipPlan.findOne({ level: user.vipLevel });
    }

    const isActive = user.vipLevel > 0 && user.vipExpiresAt && user.vipExpiresAt > now;
    const daysLeft = isActive
      ? Math.ceil((user.vipExpiresAt - now) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      success: true,
      data: {
        vipLevel: user.vipLevel,
        isActive,
        expiresAt: user.vipExpiresAt,
        daysLeft,
        currentPlan,
        usdBalance: user.usdBalance,
        tickets: user.tickets
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    CRUD Planes VIP (Admin)
// @route   POST /api/vip/plans
// @access  Superadmin
exports.createPlan = async (req, res, next) => {
  try {
    const { level, name, price, usdBonus, botDailyEarning, description, color, sortOrder } = req.body;
    const plan = await VipPlan.create({ level, name, price, usdBonus, botDailyEarning, description, color, sortOrder });
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar plan VIP
// @route   PUT /api/vip/plans/:id
// @access  Superadmin
exports.updatePlan = async (req, res, next) => {
  try {
    const { name, price, usdBonus, botDailyEarning, description, color, sortOrder } = req.body;
    const allowed = { name, price, usdBonus, botDailyEarning, description, color, sortOrder };
    Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);
    const plan = await VipPlan.findByIdAndUpdate(req.params.id, allowed, {
      new: true,
      runValidators: true
    });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
    }
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/desactivar plan
// @route   PUT /api/vip/plans/:id/toggle
// @access  Superadmin
exports.togglePlan = async (req, res, next) => {
  try {
    const plan = await VipPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
    }
    plan.isActive = !plan.isActive;
    await plan.save();
    res.json({
      success: true,
      message: `Plan ${plan.isActive ? 'activado' : 'desactivado'}.`,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};
