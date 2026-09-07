/**
 * Push Notifications con Firebase Cloud Messaging (FCM)
 * Envía notificaciones a dispositivos registrados del usuario
 */
const admin = require('firebase-admin');
const logger = require('./logger');

let initialized = false;

const initFirebase = () => {
  if (initialized) return true;

  const projectId   = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey  = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn('Push Notifications: variables FCM no configuradas — notificaciones push desactivadas.');
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });
    initialized = true;
    logger.info('Push Notifications: Firebase inicializado correctamente.');
    return true;
  } catch (err) {
    logger.error(`Push Notifications: error al inicializar Firebase — ${err.message}`);
    return false;
  }
};

/**
 * Envía una notificación push a uno o varios tokens FCM
 * @param {string|string[]} tokens  - Token(s) del dispositivo
 * @param {object} payload          - { title, body, icon?, data? }
 * @returns {object}                - { sent, failed }
 */
const sendPush = async (tokens, payload) => {
  if (!initFirebase()) return { sent: 0, failed: 0 };

  const tokenList = Array.isArray(tokens) ? tokens : [tokens];
  if (tokenList.length === 0) return { sent: 0, failed: 0 };

  const message = {
    notification: {
      title: payload.title,
      body:  payload.body,
    },
    webpush: {
      notification: {
        icon:  payload.icon  || '/logo192.png',
        badge: payload.badge || '/logo192.png',
        requireInteraction: false,
      },
      fcmOptions: { link: payload.link || '/' }
    },
    data: payload.data ? Object.fromEntries(
      Object.entries(payload.data).map(([k, v]) => [k, String(v)])
    ) : {},
    tokens: tokenList,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    const sent   = response.successCount;
    const failed = response.failureCount;

    if (failed > 0) {
      response.responses.forEach((r, i) => {
        if (!r.success) {
          logger.warn(`Push token inválido [${tokenList[i]?.slice(0, 20)}...]: ${r.error?.message}`);
        }
      });
    }

    logger.info(`Push enviado: ${sent} ok, ${failed} fallidos.`);
    return { sent, failed };
  } catch (err) {
    logger.error(`Push error: ${err.message}`);
    return { sent: 0, failed: tokenList.length };
  }
};

/**
 * Envía push a todos los tokens registrados de un usuario
 * @param {object} user     - Documento User con fcmTokens[]
 * @param {object} payload  - { title, body, icon?, link?, data? }
 */
const sendPushToUser = async (user, payload) => {
  if (!user?.fcmTokens?.length) return;
  await sendPush(user.fcmTokens, payload);
};

module.exports = { sendPush, sendPushToUser, initFirebase };
