const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

// POST /api/push/register — guardar token FCM del dispositivo actual
router.post('/register', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token requerido.' });

    // Agrega el token si no existe ya (máximo 5 dispositivos por usuario)
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { fcmTokens: token }
    });

    // Si tiene más de 5, quita los más viejos
    const user = await User.findById(req.user._id);
    if (user.fcmTokens.length > 5) {
      user.fcmTokens = user.fcmTokens.slice(-5);
      await user.save({ validateBeforeSave: false });
    }

    res.json({ success: true, message: 'Dispositivo registrado para notificaciones.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al registrar dispositivo.' });
  }
});

// DELETE /api/push/unregister — quitar token FCM (logout / desactivar notificaciones)
router.delete('/unregister', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token requerido.' });

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { fcmTokens: token }
    });

    res.json({ success: true, message: 'Dispositivo eliminado de notificaciones.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al eliminar dispositivo.' });
  }
});

module.exports = router;
