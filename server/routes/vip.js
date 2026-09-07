const express = require('express');
const router = express.Router();
const vipController = require('../controllers/vipController');
const { protect, superAdminOnly } = require('../middleware/auth');

// GET /api/vip/plans — público
router.get('/plans', vipController.getPlans);

// GET /api/vip/plans/:id — público
router.get('/plans/:id', vipController.getPlanById);

// GET /api/vip/status — privado
router.get('/status', protect, vipController.getMyVipStatus);

// --- Superadmin ---
// POST /api/vip/plans
router.post('/plans', protect, superAdminOnly, vipController.createPlan);

// PUT /api/vip/plans/:id
router.put('/plans/:id', protect, superAdminOnly, vipController.updatePlan);

// PUT /api/vip/plans/:id/toggle
router.put('/plans/:id/toggle', protect, superAdminOnly, vipController.togglePlan);

module.exports = router;
