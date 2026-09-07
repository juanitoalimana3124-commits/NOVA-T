const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Todas las rutas requieren auth
router.use(protect);

// GET  /api/users/profile
router.get('/profile', userController.getProfile);

// PUT  /api/users/profile
router.put('/profile', userController.updateProfile);

// PUT  /api/users/change-password
router.put('/change-password', userController.changePassword);

// PUT  /api/users/avatar
router.put('/avatar', upload.single('avatar'), userController.updateAvatar);

// GET  /api/users/transactions
router.get('/transactions', userController.getMyTransactions);

module.exports = router;
