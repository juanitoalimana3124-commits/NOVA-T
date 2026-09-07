const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/notifications
router.get('/', notificationController.getNotifications);

// PUT /api/notifications/read-all
router.put('/read-all', notificationController.markAllAsRead);

// PUT /api/notifications/:id/read
router.put('/:id/read', notificationController.markAsRead);

// DELETE /api/notifications/:id
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
