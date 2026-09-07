import { useEffect, useRef } from 'react'; // eslint-disable-line
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import toast from 'react-hot-toast';
import api from '../api/axios';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messagingInstance = null;

const getMessagingInstance = () => {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') return null;
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    if (!messagingInstance) messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
};

/**
 * Hook que solicita permiso de notificaciones push al usuario,
 * registra el token FCM en el servidor y muestra toasts para
 * notificaciones recibidas mientras la app está abierta.
 *
 * Solo se activa si el usuario está autenticado.
 */
export default function usePushNotifications(isAuthenticated) {
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    const setup = async () => {
      try {
        // Pedir permiso al usuario
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const messaging = getMessagingInstance();
        if (!messaging) return;

        // Registrar el service worker de Firebase
        const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        // Obtener token FCM del dispositivo
        const token = await getToken(messaging, {
          vapidKey:          VAPID_KEY,
          serviceWorkerRegistration: sw,
        });

        if (!token) return;

        // Guardar token en el servidor
        await api.post('/push/register', { token });
        registered.current = true;

        // Escuchar notificaciones mientras la app está abierta (foreground)
        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {};
          if (title) {
            toast(`🔔 ${title}${body ? `\n${body}` : ''}`, { duration: 6000 });
          }
        });

      } catch {
        // Silencioso — el usuario puede haber denegado el permiso
      }
    };

    setup();
  }, [isAuthenticated]);
}
