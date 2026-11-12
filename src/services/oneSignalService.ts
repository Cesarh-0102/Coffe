/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Servicio de Notificaciones Push con OneSignal Web SDK (v16) - Taju Coffee House
 * 
 * Configuración:
 * 1. Crea una cuenta gratuita en https://onesignal.com
 * 2. Crea una app Web Push y copia tu App ID.
 * 3. Agrégalo en tu archivo .env: VITE_ONESIGNAL_APP_ID="TU_ONESIGNAL_APP_ID"
 * 
 * Retención Automática:
 * - Cada vez que se asigna un sello, se actualiza la etiqueta de usuario:
 *   OneSignal.User.addTag("fecha_ultima_compra", "<fecha_actual>")
 * - En el panel de OneSignal (Messages > Automated / Journeys), crea un mensaje automático
 *   con filtro: User Tag "fecha_ultima_compra" is 7 days ago.
 */

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

// App ID configurado en variables de entorno o fallback informativo
export const ONESIGNAL_APP_ID =
  (import.meta.env.VITE_ONESIGNAL_APP_ID as string) ||
  '9fae8b1d-0000-0000-0000-tajusampleid'; // Reemplazar con el App ID real en producción

let isInitialized = false;

/**
 * Inicializa el SDK Web de OneSignal de manera diferida y segura.
 */
export function initOneSignal(): void {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false, // Usamos los botones integrados en nuestra UI
        },
      });
      isInitialized = true;
      console.log('[OneSignal] Inicializado exitosamente con App ID:', ONESIGNAL_APP_ID);
    } catch (err) {
      console.warn('[OneSignal] Error inicializando OneSignal SDK:', err);
    }
  });
}

/**
 * Solicita permiso nativo para notificaciones push en el navegador y vincula al usuario por su UID.
 * Se llama cuando un cliente inicia sesión.
 */
export async function requestNotificationPermissionAndLogin(
  uid: string,
  userEmail?: string
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        // 1. Vincular identidad del usuario con su UID de Firestore
        console.log(`[OneSignal] Vinculando usuario UID: ${uid}`);
        await OneSignal.login(uid);

        // 2. Asociar correo opcional
        if (userEmail && userEmail.includes('@') && !userEmail.includes('@taju.co')) {
          try {
            await OneSignal.User.addEmail(userEmail);
          } catch (_) {
            // Ignorar si el formato es interno
          }
        }

        // 3. Solicitar permiso nativo de notificaciones push al usuario
        const permission = await OneSignal.Notifications.requestPermission();
        console.log('[OneSignal] Resultado de permiso de notificaciones:', permission);
        resolve(permission === true);
      } catch (err) {
        console.warn('[OneSignal] Error al solicitar permiso o vincular usuario:', err);
        resolve(false);
      }
    });
  });
}

/**
 * Actualiza la etiqueta "fecha_ultima_compra" del usuario en OneSignal.
 * Esta etiqueta es utilizada por las campañas automatizadas de retención a los 7 días.
 */
export function updateOneSignalLastPurchaseTag(
  customerId: string,
  dateString?: string
): void {
  if (typeof window === 'undefined') return;

  const dateValue = dateString || new Date().toISOString().split('T')[0];

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      // Actualizar la etiqueta requerida para la regla de retención
      await OneSignal.User.addTag('fecha_ultima_compra', dateValue);
      await OneSignal.User.addTag('cliente_id', customerId);
      console.log(`[OneSignal] Etiqueta fecha_ultima_compra actualizada a "${dateValue}" para cliente ${customerId}`);
    } catch (err) {
      console.warn('[OneSignal] Error actualizando etiqueta de última compra:', err);
    }
  });
}

/**
 * Desvincula la sesión de OneSignal al cerrar sesión.
 */
export function logoutOneSignal(): void {
  if (typeof window === 'undefined') return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.logout();
      console.log('[OneSignal] Sesión cerrada en OneSignal');
    } catch (err) {
      console.warn('[OneSignal] Error al cerrar sesión en OneSignal:', err);
    }
  });
}
