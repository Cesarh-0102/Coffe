/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Firebase Cloud Functions - Sistema Automatizado de Retención de Clientes (7 Días sin Compras)
 * Taju Coffee House · Specialty Coffee Bogotá
 *
 * ============================================================================
 * GUÍA COMPLETA DE CONFIGURACIÓN Y DESPLIEGUE DE LA CLOUD FUNCTION PROGRAMADA:
 * ============================================================================
 *
 * 1. REQUISITOS PREVIOS EN GOOGLE CLOUD / FIREBASE:
 *    - Las funciones programadas (Cron Jobs con Cloud Scheduler y Pub/Sub) requieren
 *      que el proyecto de Firebase esté en el plan "Blaze" (Pago por uso, con capa gratuita amplia).
 *    - En Google Cloud Console, se habilitan automáticamente las APIs:
 *      * Cloud Functions API
 *      * Cloud Scheduler API
 *      * Cloud Pub/Sub API
 *      * Firebase Cloud Messaging API
 *
 * 2. INSTALACIÓN DE HERRAMIENTAS CLI:
 *    Ejecuta en tu terminal local:
 *    ```bash
 *    npm install -g firebase-tools
 *    firebase login
 *    firebase use dappled-volt-jggh3
 *    ```
 *
 * 3. INSTALAR DEPENDENCIAS Y COMPILAR LA FUNCIÓN:
 *    ```bash
 *    cd functions
 *    npm install
 *    npm run build
 *    ```
 *
 * 4. DESPLEGAR LA CLOUD FUNCTION A PRODUCCIÓN:
 *    Desde la raíz del proyecto (asegurando que `firebase.json` apunte a `functions`):
 *    ```bash
 *    firebase deploy --only functions:sendSevenDayRetentionNotifications
 *    ```
 *
 * 5. VERIFICACIÓN EN GOOGLE CLOUD SCHEDULER:
 *    - Una vez desplegada, dirígete a:
 *      https://console.cloud.google.com/cloudscheduler
 *    - Verás el trabajo programado ` firebase-schedule-sendSevenDayRetentionNotifications-us-central1`
 *      configurado con la expresión Cron `0 10 * * *` (Todos los días a las 10:00 AM, hora de Bogotá).
 *    - Puedes hacer clic en "FORZAR EJECUCIÓN" (Force Run) desde la consola para probarlo en cualquier momento.
 */

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';

// Inicialización del SDK Administrativo de Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}

// Conexión a la base de datos Firestore del proyecto
const db = admin.firestore();

/**
 * Calcula la ventana de tiempo exacta de hace 7 días (desde las 00:00:00.000 hasta las 23:59:59.999)
 * para identificar a los clientes cuya última compra (`lastPurchaseDate`) fue hace exactamente 7 días.
 */
function getSevenDaysAgoDateRange(referenceDate: Date = new Date()): {
  startIso: string;
  endIso: string;
  targetDateLabel: string;
} {
  const targetDay = new Date(referenceDate);
  targetDay.setDate(targetDay.getDate() - 7);

  const startOfDay = new Date(targetDay);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDay);
  endOfDay.setUTCHours(23, 59, 59, 999);

  return {
    startIso: startOfDay.toISOString(),
    endIso: endOfDay.toISOString(),
    targetDateLabel: startOfDay.toISOString().split('T')[0],
  };
}

/**
 * CLOUD FUNCTION PROGRAMADA (CRON JOB): `sendSevenDayRetentionNotifications`
 *
 * - Programación: Todos los días a las 10:00 AM (`0 10 * * *`), zona horaria `America/Bogota`.
 * - Consulta la colección `users` en Firestore buscando clientes cuyo `lastPurchaseDate`
 *   esté dentro del rango de hace exactamente 7 días.
 * - Para cada cliente encontrado que posea `fcmToken`, envía una notificación push
 *   automática en segundo plano mediante Firebase Cloud Messaging (FCM).
 */
export const sendSevenDayRetentionNotifications = onSchedule(
  {
    schedule: '0 10 * * *', // Todos los días a las 10:00 AM
    timeZone: 'America/Bogota',
    region: 'us-central1',
    memory: '256MiB',
    retryCount: 1,
  },
  async (event) => {
    const executionTime = event.scheduleTime ? new Date(event.scheduleTime) : new Date();
    const { startIso, endIso, targetDateLabel } = getSevenDaysAgoDateRange(executionTime);

    logger.info(
      `[Retención 7 Días] Iniciando barrido diario para compras del día ${targetDateLabel}`,
      { startIso, endIso }
    );

    try {
      // 1. Consultar la colección `users` buscando clientes con `lastPurchaseDate` hace exactamente 7 días
      const usersSnapshot = await db
        .collection('users')
        .where('lastPurchaseDate', '>=', startIso)
        .where('lastPurchaseDate', '<=', endIso)
        .get();

      if (usersSnapshot.empty) {
        logger.info(
          `[Retención 7 Días] No se encontraron clientes con última compra el ${targetDateLabel}.`
        );
        return;
      }

      let notificationsSent = 0;
      let skippedNoToken = 0;
      let failedDeliveries = 0;

      // 2. Procesar cada cliente que cumple la condición de 7 días sin compras
      const sendPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const fcmToken: string | undefined = userData.fcmToken;
        const customerName: string = (userData.displayName || 'Cliente Taju').split(' ')[0];

        if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim() === '') {
          skippedNoToken++;
          logger.debug(
            `[Retención 7 Días] Usuario ${userId} omitido: no tiene fcmToken registrado.`
          );
          return;
        }

        // 3. Construir el payload de la Notificación Push FCM
        const message: admin.messaging.Message = {
          token: fcmToken,
          notification: {
            title: `¡Te extrañamos, ${customerName}! ☕`,
            body: '¡Te extrañamos! Vuelve hoy para seguir sumando sellos y ganar tu premio.',
          },
          webpush: {
            notification: {
              title: `¡Te extrañamos, ${customerName}! ☕`,
              body: '¡Te extrañamos! Vuelve hoy para seguir sumando sellos y ganar tu premio.',
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              vibrate: [200, 100, 200],
              requireInteraction: true,
            },
            fcmOptions: {
              link: '/',
            },
          },
          data: {
            campaign: 'retention_7_days',
            customerId: userId,
            lastPurchaseDate: String(userData.lastPurchaseDate || ''),
            url: '/',
          },
        };

        try {
          const messageId = await admin.messaging().send(message);
          notificationsSent++;

          // Registrar fecha de envío del recordatorio en el perfil del usuario
          await userDoc.ref.set(
            {
              lastRetentionNotificationAt: new Date().toISOString(),
              lastRetentionMessageId: messageId,
            },
            { merge: true }
          );

          logger.info(
            `[Retención 7 Días] Notificación enviada a ${userId} (${userData.email}). ID: ${messageId}`
          );
        } catch (sendError: any) {
          failedDeliveries++;
          const errorCode = sendError?.code || '';

          logger.error(
            `[Retención 7 Días] Error enviando push a ${userId}:`,
            errorCode,
            sendError?.message
          );

          // Si el token expiró o el usuario desinstaló la PWA, limpiar el token inválido en Firestore
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            await userDoc.ref.set(
              {
                fcmToken: admin.firestore.FieldValue.delete(),
                notificationsEnabled: false,
              },
              { merge: true }
            );
          }
        }
      });

      await Promise.all(sendPromises);

      logger.info('[Retención 7 Días] Ejecución diaria completada con éxito.', {
        targetDateLabel,
        matchedUsers: usersSnapshot.size,
        notificationsSent,
        skippedNoToken,
        failedDeliveries,
      });
    } catch (error) {
      logger.error('[Retención 7 Días] Error crítico durante la consulta a Firestore:', error);
      throw error;
    }
  }
);
