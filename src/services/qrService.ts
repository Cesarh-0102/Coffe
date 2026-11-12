/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Servicio de Códigos QR (QR Service)
 * Genera y valida los payloads de los códigos QR de los clientes.
 */

const QR_PREFIX = 'VANGUARD_LOYALTY:v1:';

export interface QRPayload {
  customerId: string;
  email?: string;
  isValid: boolean;
}

/**
 * Genera el string seguro que se codifica dentro del código QR del cliente
 */
export function generateCustomerQRPayload(customerId: string, email: string): string {
  return `${QR_PREFIX}${customerId}:${encodeURIComponent(email)}`;
}

/**
 * Parsea e interpreta el código escaneado por el administrador.
 * Soporta tanto el formato oficial Vanguard como IDs directos de cliente.
 */
export function parseScannedQRCode(scannedText: string): QRPayload {
  if (!scannedText || typeof scannedText !== 'string') {
    return { customerId: '', isValid: false };
  }

  const clean = scannedText.trim();

  if (clean.startsWith(QR_PREFIX)) {
    const parts = clean.substring(QR_PREFIX.length).split(':');
    const customerId = parts[0] || '';
    const email = parts[1] ? decodeURIComponent(parts[1]) : undefined;
    return {
      customerId,
      email,
      isValid: Boolean(customerId && customerId.length >= 4),
    };
  }

  // Si escanea directamente el ID o UID
  return {
    customerId: clean,
    isValid: clean.length >= 4,
  };
}
