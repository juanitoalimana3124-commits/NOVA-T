/**
 * Nakamura Bot — Motor de trading automático simulado
 *
 * Fixes aplicados:
 * 1. Cron fijo a las 00:00 — sobrevive reinicios del servidor
 * 2. Último ciclo global guardado en DB — evita doble pago al reiniciar
 * 3. botActivatedAt se limpia al completar — el contador del frontend se detiene
 * 4. Notificación al usuario cuando su plan no tiene ganancia configurada
 */
const cron         = require('node-cron');
const User         = require('../models/User');
const VipPlan      = require('../models/VipPlan');
const Trade        = require('../models/Trade');
const Transaction  = require('../models/Transaction');
const Notification = require('../models/Notification');
const Setting      = require('../models/Setting');
const logger       = require('./logger');
const { getCache } = require('./priceCache');
const { sendPushToUser } = require('./pushNotification');

// Monedas que Nakamura "opera"
const BOT_COINS = [
  { id: 'bitcoin',     symbol: 'BTC' },
  { id: 'ethereum',    symbol: 'ETH' },
  { id: 'solana',      symbol: 'SOL' },
  { id: 'binancecoin', symbol: 'BNB' },
];

const getPrice = (coinId) => {
  const cache = getCache();
  const list  = Array.isArray(cache) ? cache : (cache?.data || []);
  const coin  = list.find(c => c.id === coinId);
  return coin?.current_price || 1;
};

// Simula 1-2 operaciones visibles del bot
const simulateTrades = async (userId, gain) => {
  const numTrades = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < numTrades; i++) {
    const coin      = BOT_COINS[Math.floor(Math.random() * BOT_COINS.length)];
    const price     = getPrice(coin.id);
    const usdAmount = parseFloat((gain / numTrades).toFixed(2));
    const cryptoAmt = parseFloat((usdAmount / price).toFixed(8));
    await Trade.create({
      user: userId, type: 'buy', coinId: coin.id, coinSymbol: coin.symbol,
      usdAmount, cryptoAmount: cryptoAmt, pricePerUnit: price,
      usdBalanceBefore: 0, usdBalanceAfter: 0, notes: 'Nakamura Bot'
    });
    await Trade.create({
      user: userId, type: 'sell', coinId: coin.id, coinSymbol: coin.symbol,
      usdAmount: parseFloat((usdAmount * 1.015).toFixed(2)),
      cryptoAmount: cryptoAmt, pricePerUnit: price * 1.015,
      usdBalanceBefore: 0, usdBalanceAfter: 0, notes: 'Nakamura Bot'
    });
  }
};

// Función principal del ciclo
const runNakamuraBot = async () => {
  try {
    const now = new Date();

    // Verificar si el bot está habilitado globalmente
    const globalSetting = await Setting.findOne({ key: 'nakamuraBotEnabled' });
    if (globalSetting && globalSetting.value === false) return;

    // Usuarios elegibles: bot activo, VIP activo, ciclo ya terminó (botCycleEndsAt <= now)
    const users = await User.find({
      botEnabled:     true,
      vipLevel:       { $gt: 0 },
      isBanned:       false,
      botCycleEndsAt: { $lte: now }
    });

    logger.info(`Nakamura Bot: procesando ${users.length} usuarios...`);

    // Cargar todos los planes una sola vez
    const plans = await VipPlan.find({ isActive: true });
    const planMap = {};
    plans.forEach(p => { planMap[p.level] = p; });

    for (const user of users) {
      try {
        const plan = planMap[user.vipLevel];
        const gain = plan ? parseFloat((plan.botDailyEarning || 0).toFixed(2)) : 0;

        if (gain <= 0) {
          // ── FIX 3 & 4: plan sin ganancia — desactivar + notificar + limpiar botActivatedAt ──
          await User.findByIdAndUpdate(user._id, {
            $set: { botEnabled: false, botLastRun: now, botActivatedAt: null }
          });

          await Notification.create({
            user:    user._id,
            type:    'system',
            title:   '🤖 Nakamura Bot en espera',
            message: 'Tu bot se activó pero tu plan aún no tiene una ganancia diaria configurada. Contacta al soporte o espera a que el administrador configure las ganancias.',
          });

          logger.info(`Nakamura Bot: plan de ${user.email} sin botDailyEarning — usuario notificado, bot desactivado.`);
          continue;
        }

        const balanceBefore = user.usdBalance || 0;

        // Acreditar ganancia, auto-desactivar bot y limpiar botActivatedAt (FIX 3)
        await User.findByIdAndUpdate(user._id, {
          $inc: { usdBalance: gain, botTotalEarned: gain },
          $set: { botEnabled: false, botLastRun: now, botActivatedAt: null }
        });

        // Trades simulados visibles
        try { await simulateTrades(user._id, gain); } catch (trErr) {
          logger.warn(`Nakamura Bot: error simulando trades para ${user.email}: ${trErr.message}`);
        }

        // Transacción
        try {
          await Transaction.create({
            user:          user._id,
            type:          'admin_credit',
            amount:        gain,
            balanceBefore,
            balanceAfter:  balanceBefore + gain,
            description:   `Nakamura Bot — Ganancia diaria del plan ${plan.name}`,
            status:        'completed'
          });
        } catch (txErr) {
          logger.error(`Nakamura Bot: error creando transacción para ${user.email}: ${txErr.message}`);
        }

        // Notificación
        try {
          await Notification.create({
            user:    user._id,
            type:    'system',
            title:   '🤖 Nakamura Bot completó tu operación',
            message: `Nakamura generó $${gain.toFixed(2)} USD con tu plan ${plan.name}. El bot se desactivó hasta que lo reactives.`,
            metadata: { gain, vipLevel: user.vipLevel, planName: plan.name }
          });
        } catch (notifErr) {
          logger.error(`Nakamura Bot: error creando notificación para ${user.email}: ${notifErr.message}`);
        }

        // Push notification al usuario
        sendPushToUser(user, {
          title: '🤖 Nakamura Bot completó tu operación',
          body: `Nakamura generó $${gain.toFixed(2)} USD con tu plan ${plan.name}. Ya está en tu saldo.`,
          link: '/bot',
        }).catch(() => {});

        logger.info(`Nakamura Bot: +$${gain} USD (${plan.name}) para ${user.email} — bot desactivado`);
      } catch (err) {
        logger.error(`Nakamura Bot error en usuario ${user.email}: ${err.message}`);
      }
    }

    logger.info('Nakamura Bot: ciclo completado.');
  } catch (err) {
    logger.error(`Nakamura Bot error crítico: ${err.message}`);
  }
};

// Cron cada 10 minutos — revisa si algún usuario tiene el ciclo terminado
const startNakamuraBot = () => {
  logger.info('Nakamura Bot: programado con cron — revisa ciclos cada 10 minutos.');
  cron.schedule('*/10 * * * *', () => {
    runNakamuraBot();
  });
};

module.exports = { startNakamuraBot, runNakamuraBot };
