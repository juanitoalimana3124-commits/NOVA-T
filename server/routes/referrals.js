const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { protect } = require('../middleware/auth');

// GET /api/referrals/validate/:code — público
router.get('/validate/:code', referralController.validateReferralCode);

// GET /api/referrals/my — privado
router.get('/my', protect, referralController.getMyReferrals);

module.exports = router;
