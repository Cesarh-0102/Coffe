/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modelo de Tarjeta de Fidelización - Taju Coffee House
 * 
 * Especificaciones de Negocio:
 * - 8 sellos para completar un ciclo y ganar producto de especialidad + repostería artesanal.
 * - Control de Concurrencia Optimista (OCC): La propiedad `version` incrementa en cada actualización.
 * - Validación de compra mínima: $15.000.
 */

export const MAX_STAMPS_PER_CYCLE = 8;
export const MINIMUM_PURCHASE_AMOUNT = 15000;

export interface LoyaltyCard {
  id: string; // Habitualmente coincide con el customerId
  customerId: string;
  customerEmail: string;
  customerName: string;
  password?: string;
  documentNumber?: string; // Ej: "CC •••• 7821"
  phone?: string; // Ej: "+57 312 ••• 9021"
  branch?: string; // Ej: "Sede Chapinero"
  memberCode?: string; // Ej: "#7821-TJ"
  memberSince?: string; // Ej: "Mar 2023"
  loyaltyLevel?: string; // Ej: "NIVEL GOLD" o "Cliente Frecuente"
  stampsCount: number; // Valor entre 0 y 8
  totalCyclesCompleted: number; // Ciclos canjeados (16 sellos previos = 2 ciclos)
  totalVisits: number; // Visitas totales registradas
  favoriteDrinkNotes?: string;
  lastStampNotes?: string; // Ej: "Americano Doble"
  lastStampTime?: string; // Ej: "Hoy 10:24 AM"
  lastPurchaseDate?: string; // Formato ISO ej: "2026-11-11T16:00:00.000Z" para retención
  stampsDates?: Record<number, string>; // Ej: { 1: "12 Feb", 2: "18 Feb", 3: "24 Feb", 4: "01 Mar", 5: "Hoy" }
  version: number; // Control de concurrencia optimista (OCC)
  updatedAt: string;
  createdAt: string;
}

export interface StampSlot {
  index: number; // 1 a 8
  isFilled: boolean;
  isToday: boolean;
  isRewardSlot: boolean; // El sello 8 representa el premio de cortesía
  dateLabel?: string; // Ej: "12 Feb", "¡Hoy!", "Faltan 3"
}
