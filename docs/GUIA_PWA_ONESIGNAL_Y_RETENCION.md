# Guía de PWA, Notificaciones OneSignal y Retención Automática (7 Días)
## Taju Coffee House

Esta guía documenta la arquitectura técnica y los pasos de configuración para la Progressive Web App (PWA), las Notificaciones Push Web con OneSignal y el Backend Automático de Retención.

---

## 1. Progressive Web App (PWA) e Instalación

### Archivos Implementados:
- **`public/manifest.json`**: Define el identificador (`/`), nombre, color temático (`#D8470A`), modo `standalone` y los iconos en alta resolución (192x192 y 512x512).
- **`public/service-worker.js`**: Service Worker nativo que intercepta eventos `install`, `activate` y `fetch` con estrategia Network-First y caché de respaldo para activos estáticos.
- **`index.html`**: Enlaza el manifiesto web, meta tags de iOS (`apple-mobile-web-app-capable`, `apple-touch-icon`) y registra el Service Worker al cargar.
- **`src/controllers/usePWAInstall.ts`**: Hook MVC que captura el evento nativo `beforeinstallprompt` en Android/Chrome y detecta dispositivos iOS/Safari.
- **`src/views/components/PWAInstallTutorialModal.tsx`**: Modal con diseño de dos columnas interactivas:
  - **Android (Chrome/Edge)**: *"Toca los 3 puntos arriba a la derecha y selecciona 'Añadir a la pantalla de inicio'"*.
  - **iPhone (iOS Safari)**: *"Toca el icono Compartir 📤 abajo y selecciona 'Añadir a la pantalla de inicio' ➕"*.
- **`src/views/auth/LoginView.tsx`**: Integra el botón **"Instalar App"** con acceso directo al prompt nativo o a la guía visual.

---

## 2. Notificaciones Push Web con OneSignal

Dado que el plan gratuito no requiere el plan de pago Blaze de Firebase Cloud Messaging, se integró el SDK Web oficial v16 de OneSignal.

### Archivos Implementados:
- **`index.html`**: Carga el SDK oficial de OneSignal (`https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js`).
- **`public/OneSignalSDKWorker.js`**: Service Worker requerido por OneSignal para recibir notificaciones en segundo plano incluso con la web cerrada.
- **`src/services/oneSignalService.ts`**:
  - `initOneSignal()`: Inicializa el SDK con el App ID.
  - `requestNotificationPermissionAndLogin(uid, email)`: Se ejecuta cuando un cliente inicia sesión, solicita el permiso nativo del navegador y vincula el UID único de Firestore.
  - `updateOneSignalLastPurchaseTag(customerId, fecha)`: Actualiza la etiqueta `fecha_ultima_compra` en el perfil del usuario.
- **`src/controllers/useAuthController.ts`**: Solicita los permisos automáticamente al autenticar clientes.
- **`src/controllers/useAdminController.ts`**: Al registrar un sello, actualiza la etiqueta `fecha_ultima_compra: YYYY-MM-DD`.

### Cómo configurar OneSignal en tu Panel:
1. Regístrate gratis en [https://onesignal.com](https://onesignal.com).
2. Crea una aplicación de tipo **Web Push**.
3. Selecciona **Typical Site**, ingresa el nombre *"Taju Coffee House"* y la URL de tu sitio.
4. En **Safari Web ID** y **Web Push Settings**, copia tu **OneSignal App ID**.
5. Define la variable de entorno en tu archivo `.env`:
   ```bash
   VITE_ONESIGNAL_APP_ID="TU_ONESIGNAL_APP_ID_AQUI"
   ```
6. **Configurar el Push Automático de Retención a los 7 días**:
   - En OneSignal, ve a **Messages** > **Automated** (o **Journeys**).
   - Crea un nuevo mensaje automático con disparador:
     - **Condition**: *User Tag `fecha_ultima_compra` is 7 days ago*.
   - Mensaje del Push:
     - **Título**: *¡Te extrañamos en Taju Coffee House! ☕*
     - **Mensaje**: *Llevas 7 días sin visitarnos. Tienes sellos acumulados esperándote, ¡vuelve hoy para seguir sumando y ganar tu cortesía!*
     - **URL de Apertura**: La URL de tu app para que abra directamente su tarjeta.

---

## 3. Botón de WhatsApp para el Administrador

### Funcionalidad Implementada:
- **Cálculo de Inactividad en Vivo**: Cada cliente en la tabla de Fidelizados calcula cuántos días han transcurrido desde su último sello o compra (`getDaysSinceLastVisit`).
- **Alerta Visual**: Si el cliente lleva **7 o más días sin registrar sellos**, el sistema muestra una insignia resaltada en rojo: `⚠️ Hace X días (+7d)`.
- **Filtro Rápido de Retención**: Un botón en la barra de filtros `⚠️ Inactivos (+7 días)` filtra instantáneamente a los clientes que requieren atención.
- **Botón "Enviar WhatsApp"**:
  - Estilizado con el verde oficial de WhatsApp (`#25D366`).
  - Extrae el teléfono de Firestore del cliente, limpia caracteres y antepone el indicativo colombiano `57` si es un móvil de 10 dígitos.
  - Abre el enlace dinámico `https://wa.me/57...` con el texto predeterminado:
    > *"¡Hola [Nombre]! Hemos notado que llevas varios días sin visitarnos en Taju Coffee House. Te recordamos que tienes sellos acumulados, ¡vuelve pronto para seguir sumando y ganar tu premio! ☕"*
  - Si el cliente no tiene teléfono, avisa al administrador para que lo agregue desde el modal de edición.

---

## 4. Código Alternativo de Firebase Cloud Functions (Cron Job a las 10:00 AM)

Si en el futuro activas el plan Blaze de Firebase y deseas que una Cloud Function programada ejecute el cron diario a las 10:00 AM en lugar de OneSignal, puedes desplegar el siguiente código:

### `functions/index.js`
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Cron Job programado todos los días a las 10:00 AM (Zona horaria Bogotá/Colombia)
 * Busca clientes cuya última compra fue hace exactamente 7 días y les envía una notificación push.
 */
exports.scheduledCustomerRetention = functions.pubsub
  .schedule('0 10 * * *')
  .timeZone('America/Bogota')
  .onRun(async (context) => {
    const db = admin.firestore();
    const messaging = admin.messaging();

    // Calcular la fecha exacta de hace 7 días (YYYY-MM-DD)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 7);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    console.log(`[Retention Job] Buscando clientes con última compra el: ${targetDateStr}`);

    try {
      // Consultar usuarios clientes
      const usersSnapshot = await db.collection('users')
        .where('role', '==', 'customer')
        .get();

      let notificationsSent = 0;

      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        const lastPurchase = userData.lastPurchaseDate ? userData.lastPurchaseDate.split('T')[0] : null;

        // Si su última compra fue hace 7 días y tiene token de notificación push guardado
        if (lastPurchase === targetDateStr && userData.fcmToken) {
          const customerName = (userData.displayName || 'Cliente').split(' ')[0];
          
          const payload = {
            token: userData.fcmToken,
            notification: {
              title: `¡Te extrañamos en Taju Coffee, ${customerName}! ☕`,
              body: 'Han pasado 7 días desde tu última visita. ¡Vuelve hoy, acumula sellos y acércate a tu premio de cortesía!',
            },
            data: {
              url: 'https://ais-dev-6sdi577qiguwpcveoj2gdi-600213927141.us-east1.run.app',
            },
          };

          await messaging.send(payload);
          notificationsSent++;
          console.log(`[Retention Job] Notificación enviada a ${userData.email}`);
        }
      }

      console.log(`[Retention Job] Total notificaciones enviadas hoy: ${notificationsSent}`);
      return null;
    } catch (error) {
      console.error('[Retention Job] Error ejecutando cron de retención:', error);
      throw error;
    }
  });
```

### Cómo desplegar la Cloud Function:
1. Instala Firebase CLI: `npm install -g firebase-tools`
2. Inicia sesión: `firebase login`
3. En la raíz del proyecto, inicializa funciones: `firebase init functions`
4. Pega el código anterior en `functions/index.js`.
5. Despliega con: `firebase deploy --only functions`
