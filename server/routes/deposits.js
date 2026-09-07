const express = require('express');
const router = express.Router();
const depositController = require('../controllers/depositController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateMagicBytes } = require('../middleware/upload');

// POST /api/deposits  — crear depósito (usuario)
router.post('/', protect, upload.single('voucher'), validateMagicBytes, depositController.createDeposit);

// GET /api/deposits/my — mis depósitos
router.get('/my', protect, depositController.getMyDeposits);

// --- Admin ---
// GET /api/deposits
router.get('/', protect, adminOnly, depositController.getAllDeposits);

// PUT /api/deposits/:id/approve
router.put('/:id/approve', protect, adminOnly, depositController.approveDeposit);

// PUT /api/deposits/:id/reject
router.put('/:id/reject', protect, adminOnly, depositController.rejectDeposit);

module.exports = router;
