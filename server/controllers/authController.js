/**
 * Auth Controller
 * Registro, Login, Logout, Refresh Token, Verificación, Reset Password
 */
const crypto = require('crypto');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/email');
const logger = require('../utils/logger');

// ---- Helpers ----
const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Guardar refresh token hasheado en DB (nunca en texto plano)
  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await user.save({ validateBeforeSave: false });

  const cookieOptions = {
    expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  };

  res
    .status(statusCode)
    .cookie('accessToken', accessToken, { ...cookieOptions, expires: new Date(Date.now() + 15 * 60 * 1000) })
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json({
      success: true,
      accessToken,
      user: user.toPublicJSON()
    });
};

// @desc    Registrar usuario
// @route   POST /api/auth/register
// @access  Público
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, referralCode } = req.body;

    // Verificar si ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Este email ya está registrado.' });
    }

    // Validar contraseña fuerte
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.'
      });
    }

    // Buscar referido
    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findOne({ referralCode: referralCode.toUpperCase() });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      referredBy: referredByUser?._id,
      lastIp: req.ip,
      usdBalance: 0,
      isEmailVerified: false,
    });

    // Generar código OTP de 6 dígitos
    const verificationCode = user.generateEmailVerificationCode();
    await user.save({ validateBeforeSave: false });

    // Enviar email con código
    try {
      await sendEmail({
        to: user.email,
        subject: 'Tu código de verificación - Nova Trade',
        template: 'emailVerificationCode',
        data: { name: user.name, code: verificationCode }
      });
    } catch (emailError) {
      logger.warn(`No se pudo enviar código de verificación a ${user.email}: ${emailError.message}`);
    }

    // Notificación de bienvenida
    await Notification.create({
      user: user._id,
      type: 'system',
      title: '¡Bienvenido a Nova Trade!',
      message: `¡Bienvenido a Nova Trade! Tu cuenta ha sido creada exitosamente. Ya puedes comenzar a operar.`,
    });

    // Si fue referido, incrementar contador
    if (referredByUser) {
      referredByUser.referralCount += 1;
      await referredByUser.save({ validateBeforeSave: false });
    }

    logger.info(`Nuevo usuario registrado: ${user.email}`);
    sendTokenResponse(user, 201, res);

  } catch (error) {
    next(error);
  }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Público
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos.' });
    }

    // Buscar usuario con contraseña
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta ha sido suspendida. Contacta al soporte para más información.'
      });
    }

    // Verificación de email desactivada temporalmente

    // Actualizar último login
    user.lastLogin = new Date();
    user.lastIp = req.ip;
    await user.save({ validateBeforeSave: false });

    logger.info(`Login exitoso: ${user.email} [${user.role}]`);
    sendTokenResponse(user, 200, res);

  } catch (error) {
    next(error);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Privado
exports.logout = async (req, res, next) => {
  try {
    // Limpiar refresh token en DB
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

    const cookieOptions = {
      expires: new Date(Date.now() + 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    };

    res
      .cookie('accessToken', '', cookieOptions)
      .cookie('refreshToken', '', cookieOptions)
      .json({ success: true, message: 'Sesión cerrada correctamente.' });

  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Público (con refresh token)
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No hay refresh token.' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.id).select('+refreshToken');

    const hashedIncoming = crypto.createHash('sha256').update(token).digest('hex');
    if (!user || user.refreshToken !== hashedIncoming) {
      return res.status(401).json({ success: false, message: 'Refresh token inválido.' });
    }

    const newAccessToken = user.generateAccessToken();

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(Date.now() + 15 * 60 * 1000)
    });

    res.json({ success: true, accessToken: newAccessToken });

  } catch (error) {
    return res.status(401).json({ success: false, message: 'Refresh token expirado o inválido.' });
  }
};

// @desc    Verificar email con código OTP
// @route   POST /api/auth/verify-email-code
// @access  Público
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email y código requeridos.' });
    }

    const hashedCode = require('crypto').createHash('sha256').update(code.trim()).digest('hex');
    const user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationToken: hashedCode,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Código incorrecto o expirado. Solicita uno nuevo.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    logger.info(`Email verificado: ${user.email}`);
    sendTokenResponse(user, 200, res);

  } catch (error) {
    next(error);
  }
};

// @desc    Reenviar código de verificación
// @route   POST /api/auth/resend-verification
// @access  Público
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user || user.isEmailVerified) {
      return res.json({ success: true, message: 'Si el email existe y no está verificado, recibirás un código.' });
    }

    const code = user.generateEmailVerificationCode();
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      to: user.email,
      subject: 'Tu nuevo código de verificación - Nova Trade',
      template: 'emailVerificationCode',
      data: { name: user.name, code }
    });

    res.json({ success: true, message: 'Código reenviado. Revisa tu correo.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Olvidé mi contraseña
// @route   POST /api/auth/forgot-password
// @access  Público
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });

    // Siempre devolver 200 para no revelar si el email existe
    if (!user) {
      return res.json({ success: true, message: 'Si el email existe, recibirás un enlace de recuperación.' });
    }

    const resetToken = user.generateResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/nueva-contrasena?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Recuperar contraseña - BC 64',
        template: 'resetPassword',
        data: { name: user.name, resetUrl }
      });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return next(err);
    }

    res.json({ success: true, message: 'Si el email existe, recibirás un enlace de recuperación.' });

  } catch (error) {
    next(error);
  }
};

// @desc    Restablecer contraseña
// @route   POST /api/auth/reset-password/:token
// @access  Público
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token inválido o expirado.' });
    }

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(req.body.password)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.'
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Privado
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
};
