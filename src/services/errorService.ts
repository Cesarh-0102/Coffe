/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Manejador Centralizado de Errores de Firestore y Concurrencia
 * Cumple con el esquema estructurado FirestoreErrorInfo requerido por el sistema.
 */

import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  TRANSACTION = 'transaction',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Excepción específica para violaciones de concurrencia optimista (OCC)
 * Se produce cuando la versión del documento en Firestore difiere de la versión local consultada.
 */
export class ConcurrencyConflictError extends Error {
  public expectedVersion: number;
  public actualVersion: number;
  public documentId: string;

  constructor(documentId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Conflicto de Concurrencia (OCC): Los datos de la tarjeta #${documentId} fueron modificados por otro usuario o dispositivo. Versión esperada: ${expectedVersion}, versión actual en el servidor: ${actualVersion}.`
    );
    this.name = 'ConcurrencyConflictError';
    this.documentId = documentId;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

/**
 * Registra y lanza errores estructurados de Firestore
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error Structure:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}
