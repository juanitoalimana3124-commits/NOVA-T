const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Trade = require('../models/Trade');
const Setting = require('../models/Setting');
const ManualPrice = require('../models/ManualPrice');

// POST /api/crypto/trade
router.post('/trade', protect, async (req, res) => {
  try {
    const marketSetting = await Setting.findOne({ key: 'marketOpen' });
    if (marketSetting && marketSetting.value === false) {
      return res.status(403).json({ success: false, message: 'El mercado está cerrado temporalmente. Intenta más tarde.' });
    }

    const { coinId, coinSymbol, type, usdAmount, pricePerUnit: priceClient } = req.body;

    if (!coinId || !type || !usdAmount || usdAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Datos inválidos' });
    }

    const manualEntry = await ManualPrice.findOne({ coinId, enabled: true });

    if (!manualEntry && (!priceClient || priceClient <= 0)) {
      return res.status(400).json({ success: false, message: 'Precio inválido. Intenta de nuevo.' });
    }

    // Si no hay precio manual, validar que el precio del cliente sea razonable
    // Rechaza precios menores a $0.000001 o mayores a $10,000,000
    if (!manualEntry && (priceClient < 0.000001 || priceClient > 10_000_000)) {
      return res.status(400).json({ success: false, message: 'Precio fuera de rango permitido.' });
    }

    const pricePerUnit = manualEntry ? manualEntry.price : priceClient;

    const cryptoAmount = parseFloat((usdAmount / pricePerUnit).toFixed(8));

    if (type === 'buy') {
      const buySetting = await Setting.findOne({ key: 'buyOpen' });
      if (buySetting && buySetting.value === false) {
        return res.status(403).json({ success: false, message: 'Las compras están desactivadas temporalmente.' });
      }

      const user = await User.findOneAndUpdate(
        { _id: req.user.id, usdBalance: { $gte: usdAmount } },
        { $inc: { usdBalance: -usdAmount, totalTrades: 1, totalTradeVolume: usdAmount } },
        { new: true }
      );

      if (!user) {
        return res.status(400).json({ success: false, message: 'Saldo USD insuficiente' });
      }

      const holdings = { ...(user.cryptoHoldings || {}) };
      holdings[coinId] = parseFloat(((holdings[coinId] || 0) + cryptoAmount).toFixed(8));
      user.cryptoHoldings = holdings;
      user.markModified('cryptoHoldings');
      await user.save({ validateBeforeSave: false });

      await Trade.create({
        user: user._id, type: 'buy', coinId, coinSymbol,
        usdAmount, cryptoAmount, pricePerUnit,
        usdBalanceBefore: parseFloat((user.usdBalance + usdAmount).toFixed(2)),
        usdBalanceAfter:  user.usdBalance,
      });

      return res.json({ success: true, message: 'Operación exitosa', data: user.toPublicJSON() });

    } else if (type === 'sell') {
      const sellSetting = await Setting.findOne({ key: 'sellOpen' });
      if (sellSetting && sellSetting.value === false) {
        return res.status(403).json({ success: false, message: 'Las ventas están desactivadas temporalmente.' });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

      const holdings = { ...(user.cryptoHoldings || {}) };
      const held = holdings[coinId] || 0;
      if (held < cryptoAmount) {
        return res.status(400).json({ success: false, message: 'No tienes suficiente ' + coinSymbol });
      }

      holdings[coinId] = parseFloat((held - cryptoAmount).toFixed(8));
      if (holdings[coinId] <= 0.000001) delete holdings[coinId];

      const updated = await User.findByIdAndUpdate(
        req.user.id,
        {
          $inc: { usdBalance: usdAmount, totalTrades: 1, totalTradeVolume: usdAmount },
          $set: { cryptoHoldings: holdings },
        },
        { new: true }
      );

      await Trade.create({
        user: updated._id, type: 'sell', coinId, coinSymbol,
        usdAmount, cryptoAmount, pricePerUnit,
        usdBalanceBefore: parseFloat((updated.usdBalance - usdAmount).toFixed(2)),
        usdBalanceAfter:  updated.usdBalance,
      });

      return res.json({ success: true, message: 'Operación exitosa', data: updated.toPublicJSON() });

    } else {
      return res.status(400).json({ success: false, message: 'Tipo de operación inválido' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/crypto/history
router.get('/history', protect, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: trades });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener historial' });
  }
});

module.exports = router;
