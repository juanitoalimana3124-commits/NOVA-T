/**
 * Servicio de Email con Nodemailer
 * Soporte para templates HTML personalizados
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');

// Crear transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Producción: usar SMTP real
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Desarrollo: usar Ethereal (catch-all)
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER || 'ethereal_user',
        pass: process.env.EMAIL_PASS || 'ethereal_pass'
      }
    });
  }
};

// Templates HTML
const templates = {
  emailVerificationCode: ({ name, code }) => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Código de verificación - Nova Trade</title></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0d1f3c;border-radius:20px;overflow:hidden;border:1px solid rgba(249,115,22,0.3);">
        <tr>
          <td style="background:linear-gradient(135deg,#F97316,#EA580C);padding:36px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900;letter-spacing:2px;">NOVA <span style="color:#fff0;">TRADE</span></h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;letter-spacing:1px;">VERIFICACIÓN DE CORREO</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 36px;">
            <h2 style="color:#fff;margin:0 0 12px;font-size:22px;">¡Hola, ${name}! 👋</h2>
            <p style="color:#94a3b8;line-height:1.7;margin:0 0 32px;font-size:15px;">
              Usa el siguiente código para verificar tu cuenta en <strong style="color:#F97316;">Nova Trade</strong>. El código expira en <strong style="color:#fff;">15 minutos</strong>.
            </p>
            <div style="text-align:center;margin:0 0 32px;">
              <div style="display:inline-block;background:rgba(249,115,22,0.12);border:2px solid rgba(249,115,22,0.4);border-radius:16px;padding:24px 40px;">
                <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;letter-spacing:2px;text-transform:uppercase;">Tu código</p>
                <p style="color:#F97316;font-size:42px;font-weight:900;margin:0;letter-spacing:10px;font-family:monospace;">${code}</p>
              </div>
            </div>
            <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:16px;text-align:center;">
              <p style="color:#64748b;font-size:12px;margin:0;">⚠️ Si no creaste esta cuenta, puedes ignorar este correo.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:rgba(0,0,0,0.3);padding:20px;text-align:center;border-top:1px solid rgba(249,115,22,0.1);">
            <p style="color:#334155;font-size:11px;margin:0;">© 2025 Nova Trade. Todos los derechos reservados.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,

  emailVerification: ({ name, verifyUrl }) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu correo - BC 64</title>
</head>
<body style="margin:0;padding:0;background:#0A0A1C;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A1C;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#13132A;border-radius:16px;overflow:hidden;border:1px solid #7C3AED33;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:40px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:32px;font-weight:800;letter-spacing:-1px;">BC 64</h1>
              <p style="color:#C4B5FD;margin:8px 0 0;font-size:14px;">Plataforma de ganancias</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#fff;margin:0 0 16px;font-size:24px;">¡Hola, ${name}! 👋</h2>
              <p style="color:#A0A0C0;line-height:1.6;margin:0 0 24px;">
                Gracias por registrarte en BC 64. Para completar tu registro y empezar a ganar, verifica tu correo electrónico haciendo clic en el botón de abajo.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${verifyUrl}" style="background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:16px;display:inline-block;">
                  ✅ Verificar mi correo
                </a>
              </div>
              <p style="color:#666680;font-size:12px;text-align:center;margin:0;">
                Este enlace expira en 24 horas. Si no creaste esta cuenta, ignora este correo.
              </p>
              <hr style="border:none;border-top:1px solid #7C3AED33;margin:32px 0;">
              <p style="color:#666680;font-size:11px;text-align:center;margin:0;">
                O copia este enlace: <br>
                <a href="${verifyUrl}" style="color:#7C3AED;word-break:break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0A0A1C;padding:20px;text-align:center;">
              <p style="color:#444460;font-size:11px;margin:0;">© 2024 BC 64. Todos los derechos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  resetPassword: ({ name, resetUrl }) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar contraseña - BC 64</title>
</head>
<body style="margin:0;padding:0;background:#0A0A1C;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A1C;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#13132A;border-radius:16px;overflow:hidden;border:1px solid #F43F5E33;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#F43F5E,#BE123C);padding:40px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:32px;font-weight:800;letter-spacing:-1px;">BC 64</h1>
              <p style="color:#FECDD3;margin:8px 0 0;font-size:14px;">Recuperación de contraseña</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#fff;margin:0 0 16px;font-size:24px;">Hola, ${name} 🔐</h2>
              <p style="color:#A0A0C0;line-height:1.6;margin:0 0 24px;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}" style="background:linear-gradient(135deg,#F43F5E,#BE123C);color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:16px;display:inline-block;">
                  🔑 Restablecer contraseña
                </a>
              </div>
              <p style="color:#666680;font-size:12px;text-align:center;margin:0;">
                Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0A0A1C;padding:20px;text-align:center;">
              <p style="color:#444460;font-size:11px;margin:0;">© 2024 BC 64. Todos los derechos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  depositApproved: ({ name, amount, planName }) => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Depósito aprobado - BC 64</title></head>
<body style="margin:0;padding:0;background:#0A0A1C;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A1C;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#13132A;border-radius:16px;overflow:hidden;border:1px solid #10B98133;">
        <tr>
          <td style="background:linear-gradient(135deg,#10B981,#059669);padding:40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:32px;font-weight:800;">BC 64</h1>
            <p style="color:#A7F3D0;margin:8px 0 0;font-size:14px;">✅ Depósito aprobado</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;margin:0 0 16px;">¡Felicidades, ${name}! 🎉</h2>
            <p style="color:#A0A0C0;line-height:1.6;margin:0 0 24px;">Tu depósito ha sido verificado y aprobado. Ya puedes empezar a ganar con tu plan ${planName}.</p>
            <div style="background:#0A0A1C;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
              <p style="color:#666680;margin:0 0 8px;font-size:14px;">Monto acreditado</p>
              <p style="color:#10B981;font-size:36px;font-weight:800;margin:0;">RD$ ${Number(amount).toLocaleString('es-DO')}</p>
            </div>
          </td>
        </tr>
        <tr><td style="background:#0A0A1C;padding:20px;text-align:center;"><p style="color:#444460;font-size:11px;margin:0;">© 2024 BC 64.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,

  depositRejected: ({ name, rejectReason }) => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Depósito rechazado - BC 64</title></head>
<body style="margin:0;padding:0;background:#0A0A1C;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A1C;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#13132A;border-radius:16px;overflow:hidden;border:1px solid #F43F5E33;">
        <tr>
          <td style="background:linear-gradient(135deg,#F43F5E,#BE123C);padding:40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:32px;font-weight:800;">BC 64</h1>
            <p style="color:#FECDD3;margin:8px 0 0;font-size:14px;">❌ Depósito rechazado</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;margin:0 0 16px;">Hola, ${name}</h2>
            <p style="color:#A0A0C0;line-height:1.6;margin:0 0 24px;">Lo sentimos, tu depósito no pudo ser verificado.</p>
            ${rejectReason ? `<div style="background:#F43F5E11;border:1px solid #F43F5E33;border-radius:12px;padding:16px;margin:16px 0;">
              <p style="color:#F43F5E;margin:0;font-size:14px;"><strong>Motivo:</strong> ${rejectReason}</p>
            </div>` : ''}
            <p style="color:#A0A0C0;line-height:1.6;">Puedes intentar nuevamente con un voucher válido o contactar soporte.</p>
          </td>
        </tr>
        <tr><td style="background:#0A0A1C;padding:20px;text-align:center;"><p style="color:#444460;font-size:11px;margin:0;">© 2024 BC 64.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,

  withdrawalCompleted: ({ name, amount }) => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Retiro completado - BC 64</title></head>
<body style="margin:0;padding:0;background:#0A0A1C;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A1C;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#13132A;border-radius:16px;overflow:hidden;border:1px solid #F59E0B33;">
        <tr>
          <td style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:32px;font-weight:800;">BC 64</h1>
            <p style="color:#FEF3C7;margin:8px 0 0;font-size:14px;">💰 Retiro completado</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;margin:0 0 16px;">¡Tu retiro fue procesado, ${name}! 🎉</h2>
            <div style="background:#0A0A1C;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
              <p style="color:#666680;margin:0 0 8px;font-size:14px;">Monto transferido</p>
              <p style="color:#F59E0B;font-size:36px;font-weight:800;margin:0;">RD$ ${Number(amount).toLocaleString('es-DO')}</p>
            </div>
            <p style="color:#A0A0C0;line-height:1.6;">El dinero llegará a tu cuenta bancaria en 24-48 horas hábiles.</p>
          </td>
        </tr>
        <tr><td style="background:#0A0A1C;padding:20px;text-align:center;"><p style="color:#444460;font-size:11px;margin:0;">© 2024 BC 64.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
};

/**
 * Enviar email
 * @param {Object} options - { to, subject, template, data, html, text }
 */
const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    const transporter = createTransporter();

    // Usar template si se especifica, sino html directo
    const htmlContent = template && templates[template]
      ? templates[template](data || {})
      : html || '';

    const mailOptions = {
      from: `"BC 64" <${process.env.EMAIL_USER || 'noreply@bc64.com'}>`,
      to,
      subject,
      html: htmlContent,
      text: text || htmlContent.replace(/<[^>]*>/g, '') // strip HTML para text fallback
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl?.(info);
      if (previewUrl) logger.info(`Email preview: ${previewUrl}`);
    }

    logger.info(`Email enviado a ${to}: ${subject}`);
    return info;

  } catch (error) {
    logger.error(`Error enviando email a ${to}: ${error.message}`);
    throw error;
  }
};

module.exports = sendEmail;
