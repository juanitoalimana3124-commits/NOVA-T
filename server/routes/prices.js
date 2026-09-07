const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ManualPrice = require('../models/ManualPrice');

// GET /api/prices — público, devuelve todos los precios manuales activos
router.get('/', async (req, res) => {
  try {
    const prices = await ManualPrice.find({ enabled: true });
    // Devuelve mapa { coinId: price }
    const map = {};
    prices.forEach(p => { map[p.coinId] = p.price; });
    res.json({ success: true, data: map });
  } catch {
    res.json({ success: true, data: {} });
  }
});

// GET /api/prices/all — admin: todos los registros
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const prices = await ManualPrice.find().sort({ coinId: 1 });
    res.json({ success: true, data: prices });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener precios' });
  }
});

// PUT /api/prices/:coinId — admin: crear o actualizar precio manual
router.put('/:coinId', protect, adminOnly, async (req, res) => {
  try {
    const { price, enabled, symbol, name } = req.body;
    const record = await ManualPrice.findOneAndUpdate(
      { coinId: req.params.coinId },
      { price: parseFloat(price), enabled: !!enabled, symbol, name },
      { upsert: true, new: true }
    );

    // Emitir via WebSocket al global io
    const io = req.app.get('io');
    if (io) {
      io.emit('price_update', {
        coinId:  record.coinId,
        price:   record.price,
        enabled: record.enabled,
      });
    }

    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al actualizar precio' });
  }
});

// DELETE /api/prices/:coinId — admin: desactivar precio manual
router.delete('/:coinId', protect, adminOnly, async (req, res) => {
  try {
    await ManualPrice.findOneAndUpdate({ coinId: req.params.coinId }, { enabled: false });
    const io = req.app.get('io');
    if (io) io.emit('price_update', { coinId: req.params.coinId, enabled: false });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

module.exports = router;
