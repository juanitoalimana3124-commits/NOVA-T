// Service Worker para Firebase Cloud Messaging
// Este archivo DEBE estar en /public para que el navegador lo encuentre en la raíz

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Configuración de Firebase — se reemplaza con los valores reales en producción
// Estos valores son públicos (van en el frontend), NO son secretos
firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || '__FIREBASE_API_KEY__',
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || '__FIREBASE_AUTH_DOMAIN__',
  projectId:         self.FIREBASE_PROJECT_ID         || '__FIREBASE_PROJECT_ID__',
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || '__FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID|| '__FIREBASE_MESSAGING_SENDER_ID__',
  appId:             self.FIREBASE_APP_ID             || '__FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

// Maneja notificaciones cuando la app está en BACKGROUND o cerrada
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Nova Trade', {
    body:  body  || '',
    icon:  icon  || '/logo192.png',
    badge: '/logo192.png',
    data:  payload.data || {},
  });
});

// Click en la notificación — abre la app o la pestaña correspondiente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return clients.openWindow(link);
    })
  );
});
