/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modelo de Usuario - Taju Coffee House
 */

export type UserRole = 'admin' | 'customer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  role: UserRole;
  phone?: string;
  documentType?: string; // Ej: "Cédula C.C."
  documentNumber?: string; // Ej: "1098742516"
  birthdayDay?: string | number;
  birthdayMonth?: string;
  loyaltyLevel?: string; // Ej: "NIVEL GOLD"
  memberSince?: string;
  password?: string;
  authProvider?: 'google' | 'manual';
  profileCompleted?: boolean;
  lastPurchaseDate?: string; // Fecha de la última compra para automatizaciones de retención
  fcmToken?: string; // Token de notificaciones push
  createdAt: string;
  updatedAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isCustomer: boolean;
}
