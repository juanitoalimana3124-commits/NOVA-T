const express    = require('express');
const router     = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User       = require('../models/User');
const VipPlan    = require('../models/VipPlan');
const Setting    = require('../models/Setting');
const { runNakamuraBot } = require('../utils/nakamuraBot');
const logger     = require('../utils/logger');

// POST /api/bot/toggle — usuario activa/desactiva su bot
router.post('/toggle', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.vipLevel || user.vipLevel === 0) {
      return res.status(403).json({ success: false, message: 'Necesitas un plan VIP activo para usar Nakamura Bot.' });
    }

    // No permitir desactivar manualmente — solo el bot lo desactiva al completar
    if (user.botEnabled) {
      return res.status(400).json({
        success: false,
        message: '🤖 Nakamura está operando. No puedes desactivarlo hasta que complete tus ganancias del día.'
      });
    }

    // Si intenta activar, verificar que ya pasaron 24h desde el último run
    if (!user.botEnabled && user.botLastRun) {
      const hoursSince = (Date.now() - new Date(user.botLastRun)) / (1000 * 60 * 60);
      if (hoursSince < 23) {
        const horasRestantes = Math.ceil(23 - hoursSince);
        return res.status(400).json({
          success: false,
          message: `El bot ya operó hoy. Podrás reactivarlo en ${horasRestantes} hora(s).`
        });
      }
    }

    // Ciclo aleatorio entre 2 y 4 horas
    const cycleHours = 2 + Math.random() * 2; // 2.0 a 4.0 horas
    const now        = new Date();
    const cycleEndsAt = new Date(now.getTime() + cycleHours * 60 * 60 * 1000);

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: { botEnabled: true, botActivatedAt: now, botCycleEndsAt: cycleEndsAt } },
      { new: true }
    );

    logger.info(`Nakamura Bot ${updated.botEnabled ? 'activado' : 'desactivado'} por ${user.email}`);

    res.json({
      success: true,
      botEnabled: updated.botEnabled,
      message: '🤖 Nakamura Bot activado. Operará y se completará automáticamente.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado del bot.' });
  }
});

// GET /api/bot/status — estado actual del bot del usuario
router.get('/status', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  let planDailyEarning = 0;
  if (user.vipLevel > 0) {
    const plan = await VipPlan.findOne({ level: user.vipLevel, isActive: true });
    planDailyEarning = plan ? (plan.botDailyEarning || 0) : 0;
  }
  // Calcular si puede volver a activar (ya pasaron 24h desde el último run)
  const now = new Date();
  const canReactivate = !user.botLastRun || (now - new Date(user.botLastRun)) >= 23 * 60 * 60 * 1000;
  res.json({
    success: true,
    data: {
      botEnabled:       user.botEnabled,
      botActivatedAt:   user.botActivatedAt,
      botCycleEndsAt:   user.botCycleEndsAt,
      botLastRun:       user.botLastRun,
      botTotalEarned:   user.botTotalEarned || 0,
      planDailyEarning,
      canReactivate,
      canUseBot:        user.vipLevel > 0
    }
  });
});

// POST /api/bot/admin/toggle — admin activa/desactiva bot globalmente
router.post('/admin/toggle', protect, adminOnly, async (req, res) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { key: 'nakamuraBotEnabled' },
      { $set: { value: req.body.enabled } },
      { upsert: true, new: true }
    );
    res.json({ success: true, enabled: setting.value });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
});

// PUT /api/bot/admin/plan-earning — setear ganancia diaria del bot por nivel de plan
router.put('/admin/plan-earning', protect, adminOnly, async (req, res) => {
  try {
    const { level, botDailyEarning } = req.body;
    if (!level || botDailyEarning === undefined) {
      return res.status(400).json({ success: false, message: 'Se requieren level y botDailyEarning.' });
    }
    const plan = await VipPlan.findOneAndUpdate(
      { level: parseInt(level) },
      { $set: { botDailyEarning: parseFloat(botDailyEarning) } },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
    res.json({ success: true, message: `Plan ${plan.name}: ganancia bot = $${botDailyEarning} USD`, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
});

// GET /api/bot/admin/plans — obtener planes con botDailyEarning
router.get('/admin/plans', protect, adminOnly, async (req, res) => {
  try {
    const plans = await VipPlan.find({ isActive: true }).sort({ level: 1 });
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
});

// POST /api/bot/admin/run — forzar ciclo del bot (testing)
router.post('/admin/run', protect, adminOnly, async (req, res) => {
  try {
    runNakamuraBot();
    res.json({ success: true, message: 'Ciclo del bot iniciado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
});

module.exports = router;
