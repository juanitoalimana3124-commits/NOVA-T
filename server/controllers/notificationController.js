/**
 * Notification Controller
 */
const Notification = require('../models/Notification');

// @desc    Obtener notificaciones del usuario
// @route   GET /api/notifications
// @access  Privado
exports.getNotifications = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const skip  = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, isRead: false })
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Marcar notificación como leída
// @route   PUT /api/notifications/:id/read
// @access  Privado
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificación no encontrada.' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc    Marcar todas como leídas
// @route   PUT /api/notifications/read-all
// @access  Privado
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar notificación
// @route   DELETE /api/notifications/:id
// @access  Privado
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificación no encontrada.' });
    }

    res.json({ success: true, message: 'Notificación eliminada.' });
  } catch (error) {
    next(error);
  }
};
