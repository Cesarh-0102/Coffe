/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modelo de Historial de Sellos (StampHistory Model)
 * 
 * Registra de forma inmutable cada sello asignado:
 * - Monto exacto de la compra (debe ser >= $15.000)
 * - Fecha y hora exacta
 * - Número de sello otorgado (1 a 8)
 * - Número de ciclo
 * - Si otorgó o reclamó el premio del local
 */

export interface StampHistoryEntry {
  id: string;
  cardId: string;
  customerId: string;
  customerName?: string;
  adminId: string;
  adminEmail: string;
  purchaseAmount: number;
  stampNumber: number; // 1 a 8
  cycleNumber: number;
  rewardGranted: boolean;
  createdAt: string; // ISO string o timestamp formateado
  notes?: string;
}

/**
 * Formatea un valor numérico a moneda local (ej. $15.000)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea fecha y hora exacta legible para el cliente
 */
export function formatDateTime(dateString: string): { date: string; time: string } {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      return { date: 'Fecha no disp.', time: '--:--' };
    }
    const date = d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return { date, time };
  } catch {
    return { date: dateString, time: '' };
  }
}
