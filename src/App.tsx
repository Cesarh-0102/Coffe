/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TAJU COFFEE HOUSE - Aplicación Web de Fidelización de Clientes
 * 
 * Arquitectura MVC en Frontend:
 * - /models: User, LoyaltyCard, StampHistory
 * - /services: Firebase Auth, Firestore Single Source of Truth, OCC, Transacciones Atómicas
 * - /controllers: useAuthController, useCustomerCardController, useAdminController
 * - /views: LoginView, AdminDashboardView, CustomerDashboardView
 */

import React from 'react';
import { useAuthController } from './controllers/useAuthController';
import { BrutalistHeader } from './views/components/BrutalistHeader';
import { LoginView } from './views/auth/LoginView';
import { ResetPasswordView } from './views/auth/ResetPasswordView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { CustomerDashboardView } from './views/customer/CustomerDashboardView';
import { CompleteGoogleProfileView } from './views/customer/CompleteGoogleProfileView';

export default function App() {
  const [resetCode, setResetCode] = React.useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const oobCode = params.get('oobCode');
      if (oobCode) return oobCode;
    }
    return null;
  });
  const {
    user,
    loading,
    error,
    actionLoading,
    login,
    register,
    loginWithGoogle,
    linkGoogleAccount,
    googleLinkContext,
    completeGoogleProfile,
    cancelGoogleRegistration,
    logout,
    resetPassword,
    sendPasswordResetEmail,
  } = useAuthController();

  // Pantalla de Carga Inicial con el Logo Oficial de Taju
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex flex-col items-center justify-center p-4">
        <div className="relative mb-4">
          <img
            src="/assets/aistudio/image_4501393a.png"
            alt="Taju Coffee House"
            className="w-20 h-20 rounded-full object-cover shadow-xl border-2 border-amber-900/30 animate-pulse"
          />
        </div>
        <h2 className="font-display font-extrabold text-xl text-[#16191C]">
          Taju Coffee House
        </h2>
        <p className="text-xs text-[#D8470A] font-bold uppercase tracking-widest mt-0.5">
          Specialty Coffee · Bogotá
        </p>
        <p className="text-[11px] font-mono text-gray-400 mt-2">
          Conectando con Firebase Firestore (Single Source of Truth)...
        </p>
      </div>
    );
  }

  // Si el usuario llega desde el enlace del correo con oobCode
  if (resetCode) {
    return (
      <ResetPasswordView
        oobCode={resetCode}
        onSuccess={() => {
          setResetCode(null);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }}
        onCancel={() => {
          setResetCode(null);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }}
      />
    );
  }

  // Si no hay usuario autenticado: Pantalla de Login Unificado
  if (!user) {
    return (
      <LoginView
        onLogin={login}
        onRegister={register}
        onResetPassword={resetPassword}
        onSendPasswordResetEmail={sendPasswordResetEmail}
        onGoogleLogin={loginWithGoogle}
        linkGoogleAccount={linkGoogleAccount}
        googleLinkContext={googleLinkContext}
        loading={actionLoading}
        error={error}
      />
    );
  }

  // Caso B (Nuevo usuario autenticado con Google):
  // Antes de mostrar la vista final del cliente, debe llenar los datos faltantes
  // (cédula, teléfono móvil y cumpleaños) para completar su registro y emitir su tarjeta.
  if (user.role === 'customer' && user.profileCompleted === false) {
    return (
      <CompleteGoogleProfileView
        user={user}
        onComplete={completeGoogleProfile}
        onCancel={cancelGoogleRegistration}
        loading={actionLoading}
        error={error}
      />
    );
  }

  // Usuario Autenticado con Registro Completo: Detección automática y enrutamiento según rol
  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#16191C] flex flex-col">
      {/* Barra de Navegación Superior */}
      <BrutalistHeader user={user} onLogout={logout} />

      {/* Enrutamiento por Rol (Admin vs Cliente) */}
      <main className="flex-1">
        {user.role === 'admin' ? (
          <AdminDashboardView user={user} />
        ) : (
          <CustomerDashboardView user={user} />
        )}
      </main>

      {/* Pie de Página */}
      <footer className="border-t border-gray-200 py-3.5 px-4 text-center text-[11px] font-sans text-gray-400 bg-white">
        Taju Coffee House · Cra 7 #54-20, Sede Chapinero · Bogotá · Single Source of Truth OCC
      </footer>
    </div>
  );
}
