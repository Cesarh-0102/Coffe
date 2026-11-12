/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Configuración e Inicialización de Firebase
 * Conexión centralizada a Firebase Authentication y Cloud Firestore.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicialización de la aplicación Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Inicialización de Firestore utilizando explícitamente el databaseId del proyecto
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Inicialización del servicio de Autenticación
export const auth = getAuth(app);
auth.languageCode = 'es';

/**
 * Valida la conectividad inicial con Firestore según las directivas del sistema
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Conexión establecida con Firestore con éxito.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Cliente en modo offline o sin conexión directa.');
    }
    // Fallos por permisos o ausencia del documento de test son normales al iniciar
    return false;
  }
}

/**
 * Elimina recursivamente todas las propiedades con valor `undefined` de un objeto
 * para evitar el error "Unsupported field value: undefined" de Cloud Firestore.
 */
export function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        sanitized[key] = sanitizeFirestorePayload(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

// Ejecución de prueba de conexión al arrancar el módulo
testConnection();
