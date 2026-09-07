const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');
const Setting = require('../models/Setting');

// GET /api/admin/market-status — público
router.get('/market-status', async (req, res) => {
  try {
    const [market, buy, sell] = await Promise.all([
      Setting.findOne({ key: 'marketOpen' }),
      Setting.findOne({ key: 'buyOpen' }),
      Setting.findOne({ key: 'sellOpen' }),
    ]);
    res.json({
      success: true,
      marketOpen: market ? market.value : true,
      buyOpen:    buy    ? buy.value    : true,
      sellOpen:   sell   ? sell.value   : true,
    });
  } catch {
    res.json({ success: true, marketOpen: true, buyOpen: true, sellOpen: true });
  }
});

router.use(protect, adminOnly);

// GET /api/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// GET /api/admin/stats
router.get('/stats', adminController.getStats);

// GET /api/admin/transactions
router.get('/transactions', adminController.getAllTransactions);

// --- Users ---
// GET /api/admin/users
router.get('/users', adminController.getUsers);

// GET /api/admin/users/:id
router.get('/users/:id', adminController.getUserById);

// PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', adminController.banUser);

// POST /api/admin/users/:id/balance — Solo superadmin
router.post('/users/:id/balance', superAdminOnly, adminController.adjustBalance);

// POST /api/admin/users/:id/activate-vip — Solo superadmin
router.post('/users/:id/activate-vip', superAdminOnly, adminController.activateVipForUser);

// PUT /api/admin/market-status — toggle mercado completo, compra o venta
router.put('/market-status', async (req, res) => {
  try {
    const { key, open } = req.body; // key: 'marketOpen' | 'buyOpen' | 'sellOpen'
    const validKeys = ['marketOpen', 'buyOpen', 'sellOpen'];
    if (!validKeys.includes(key)) {
      return res.status(400).json({ success: false, message: 'Clave inválida' });
    }
    await Setting.findOneAndUpdate({ key }, { value: !!open }, { upsert: true, new: true });
    res.json({ success: true, key, value: !!open });
  } catch {
    res.status(500).json({ success: false, message: 'Error al actualizar estado' });
  }
});

module.exports = router;
