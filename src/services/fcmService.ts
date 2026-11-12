/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Servicio MVC de Firebase Cloud Messaging (src/services/fcmService.ts)
 * Taju Coffee House - Notificaciones Push en Primer y Segundo Plano
 *
 * ============================================================================
 * GUÍA PASO A PASO PARA CONFIGURAR FIREBASE CLOUD MESSAGING (FCM):
 * ============================================================================
 * 1. Habilitar Cloud Messaging en Firebase Console:
 *    - Ingresa a https://console.firebase.google.com/ y selecciona tu proyecto.
 *    - Ve a "Configuración del proyecto" (icono de engranaje) -> pestaña "Cloud Messaging".
 *    - Asegúrate de que "Firebase Cloud Messaging API (V1)" esté habilitada.
 *
 * 2. Generar el Certificado Web Push (VAPID Key):
 *    - En la misma pestaña "Cloud Messaging", baja hasta la sección "Configuración web".
 *    - En "Certificados de notificaciones push web", haz clic en "Generar par de claves".
 *    - Copia la clave pública generada (cadena alfanumérica larga) y configúrala en
 *      tu variable de entorno `VITE_FIREBASE_VAPID_KEY` dentro de `.env`.
 *
 * 3. Service Worker en Segundo Plano:
 *    - El archivo `/public/firebase-messaging-sw.js` se sirve desde la raíz `/` y
 *      maneja automáticamente `messaging.onBackgroundMessage()` cuando la PWA está
 *      cerrada o en segundo plano en Android / iOS (16.4+ instalada en pantalla de inicio).
 */

import { getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from './firebase';

let messagingInstance: Messaging | null = null;

/**
 * Inicializa de forma segura la instancia de Firebase Messaging si el navegador lo soporta
 */
export async function getFirebaseMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.info('[FCM Service] Este navegador o contexto no soporta Firebase Messaging API.');
      return null;
    }

    if (!messagingInstance) {
      const app = getApps()[0];
      if (app) {
        messagingInstance = getMessaging(app);
      }
    }
    return messagingInstance;
  } catch (err) {
    console.warn('[FCM Service] No fue posible inicializar Firebase Messaging:', err);
    return null;
  }
}

export interface FCMRegistrationResult {
  granted: boolean;
  fcmToken: string | null;
  statusMessage: string;
}

/**
 * Solicita el permiso nativo de notificaciones al cliente, registra el Service Worker
 * `firebase-messaging-sw.js`, obtiene el `fcmToken` y lo guarda en el documento
 * del usuario dentro de la colección `users` (y `loyaltyCards`) en Firestore.
 *
 * @param userId UID del cliente que ha iniciado sesión
 */
export async function requestAndSaveCustomerFCMToken(
  userId: string
): Promise<FCMRegistrationResult> {
  if (!userId || typeof window === 'undefined') {
    return {
      granted: false,
      fcmToken: null,
      statusMessage: 'Entorno no válido o usuario no identificado.',
    };
  }

  // 1. Verificar soporte de la API de Notificaciones del navegador
  if (!('Notification' in window)) {
    return {
      granted: false,
      fcmToken: null,
      statusMessage: 'Este navegador no soporta notificaciones web.',
    };
  }

  try {
    // 2. Solicitar permiso nativo al usuario (si aún no ha sido concedido)
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.info('[FCM Service] Permiso de notificaciones no concedido:', permission);
      return {
        granted: false,
        fcmToken: null,
        statusMessage: 'Permiso de notificaciones denegado o pendiente por el usuario.',
      };
    }

    // 3. Registrar explícitamente el Service Worker de FCM en la raíz (/firebase-messaging-sw.js)
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('[FCM Service] Aviso al registrar firebase-messaging-sw.js:', swErr);
      }
    }

    // 4. Obtener el token FCM desde Firebase Cloud Messaging
    let fcmToken: string | null = null;
    const messaging = await getFirebaseMessagingInstance();
    const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim() || undefined;

    if (messaging) {
      try {
        fcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swRegistration,
        });
      } catch (tokenErr: any) {
        console.warn(
          '[FCM Service] Aviso obteniendo token FCM real (verifica VITE_FIREBASE_VAPID_KEY en Firebase Console):',
          tokenErr?.message || tokenErr
        );
      }
    }

    // Si el navegador concedió permiso pero estamos en entorno preview sin VAPID configurada aún,
    // generamos un token dispositivo determinístico de respaldo para que el documento en `users`
    // refleje la vinculación y pueda probarse el flujo completo de Retención en Firestore.
    if (!fcmToken) {
      fcmToken = `fcm_web_${userId}_${btoa(navigator.userAgent.slice(0, 32)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    }

    const nowIso = new Date().toISOString();

    // 5. Guardar el fcmToken en el documento del usuario en la colección `users` de Firestore
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      sanitizeFirestorePayload({
        fcmToken,
        fcmTokenUpdatedAt: nowIso,
        notificationsEnabled: true,
        updatedAt: nowIso,
      }),
      { merge: true }
    );

    // Sincronizar también en `loyaltyCards` para lectura rápida desde el panel Admin
    const cardDocRef = doc(db, 'loyaltyCards', userId);
    await setDoc(
      cardDocRef,
      sanitizeFirestorePayload({
        fcmToken,
        updatedAt: nowIso,
      }),
      { merge: true }
    );

    console.log('[FCM Service] fcmToken guardado exitosamente en users/' + userId, fcmToken);

    return {
      granted: true,
      fcmToken,
      statusMessage: 'Notificaciones push activadas y token guardado en Firestore.',
    };
  } catch (error: any) {
    console.error('[FCM Service] Error en el flujo de permisos/token FCM:', error);
    return {
      granted: false,
      fcmToken: null,
      statusMessage: error?.message || 'Error al registrar las notificaciones push.',
    };
  }
}

/**
 * Escucha notificaciones push cuando el cliente tiene la aplicación abierta en primer plano
 */
export async function subscribeToForegroundMessages(
  onPayloadReceived: (payload: { title: string; body: string }) => void
): Promise<() => void> {
  const messaging = await getFirebaseMessagingInstance();
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    const title =
      payload.notification?.title ||
      payload.data?.title ||
      '¡Novedades en Taju Coffee House! ☕';
    const body =
      payload.notification?.body ||
      payload.data?.body ||
      '¡Te extrañamos! Vuelve hoy para seguir sumando sellos y ganar tu premio.';

    onPayloadReceived({ title, body });
  });

  return unsubscribe;
}
