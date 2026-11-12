/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service Worker de Firebase Cloud Messaging (public/firebase-messaging-sw.js)
 * Taju Coffee House - Notificaciones Push en Segundo Plano (Background Push)
 *
 * ============================================================================
 * GUÍA DE CONFIGURACIÓN DE FIREBASE CLOUD MESSAGING (FCM):
 * ============================================================================
 * 1. Este archivo DEBE ubicarse en la raíz pública (`/public/firebase-messaging-sw.js`)
 *    para que sea accesible en `https://<tu-dominio>/firebase-messaging-sw.js`.
 * 2. En Firebase Console -> Configuración del Proyecto -> Cloud Messaging:
 *    - En la sección "Configuración web" -> "Certificados de notificaciones push web",
 *      haz clic en "Generar par de claves" (VAPID Key).
 *    - Copia la clave pública VAPID y agrégala en tu archivo `.env` como:
 *      `VITE_FIREBASE_VAPID_KEY="TU_CLAVE_PUBLICA_VAPID"`
 * 3. Cuando la aplicación está cerrada o en segundo plano en el teléfono del cliente,
 *    este Service Worker intercepta el evento `onBackgroundMessage` enviado desde
 *    la Cloud Function de Retención Automática (7 días sin compras) y despliega
 *    la notificación nativa del sistema operativo.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Configuración del proyecto Firebase sincronizada con firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyC3NqiQ7E_tshBNRQWV4KRT7tVVAzhVxPo",
  authDomain: "prueba-70136.firebaseapp.com",
  projectId: "prueba-70136",
  storageBucket: "prueba-70136.firebasestorage.app",
  messagingSenderId: "66491560585",
  appId: "1:66491560585:web:9d7cf86beed221fbe58c58",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

/**
 * Listener de Mensajes Push en Segundo Plano (Background Message Handler)
 * Se dispara automáticamente cuando el usuario tiene la PWA cerrada o en segundo plano.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación push recibida en segundo plano:', payload);

  const notificationTitle =
    payload.notification?.title ||
    payload.data?.title ||
    '¡Te extrañamos en Taju Coffee House! ☕';

  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      '¡Te extrañamos! Vuelve hoy para seguir sumando sellos y ganar tu premio.',
    icon: payload.notification?.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || 'taju-retention-notification',
    renotify: true,
    data: {
      url: payload.data?.url || '/',
      customerId: payload.data?.customerId || '',
      campaign: payload.data?.campaign || 'retention_7_days',
    },
    actions: [
      {
        action: 'open_card',
        title: 'Ver mi tarjeta ☕',
      },
    ],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Listener de Clic en la Notificación Push
 * Al tocar la notificación en el teléfono, abre o enfoca la ventana de Taju Coffee House.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una pestaña/ventana abierta de la app, enfocarla
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si la app estaba cerrada, abrir una nueva ventana con la tarjeta del cliente
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});
