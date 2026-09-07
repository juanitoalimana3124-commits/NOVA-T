const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');

// POST /api/withdrawals
router.post('/', protect, withdrawalController.createWithdrawal);

// GET /api/withdrawals/my
router.get('/my', protect, withdrawalController.getMyWithdrawals);

// --- Admin ---
// GET /api/withdrawals
router.get('/', protect, adminOnly, withdrawalController.getAllWithdrawals);

// PUT /api/withdrawals/:id/complete
router.put('/:id/complete', protect, adminOnly, withdrawalController.completeWithdrawal);

// PUT /api/withdrawals/:id/reject
router.put('/:id/reject', protect, adminOnly, withdrawalController.rejectWithdrawal);

// PUT /api/withdrawals/:id/reverse  (solo superadmin)
router.put('/:id/reverse', protect, superAdminOnly, withdrawalController.reverseWithdrawal);

module.exports = router;
