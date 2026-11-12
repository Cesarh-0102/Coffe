/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pantalla de Inicio de Sesión Unificado - Taju Coffee House (MVC View)
 * 
 * - Un solo login para Admin (CajaTaju / 2026Taju) y Clientes (Cédula o Correo con clave)
 * - Botón oficial "Continuar con Google"
 * - Recuperación de contraseña por correo vía Firebase sendPasswordResetEmail (ForgotPasswordModal)
 * - Opción alternativa para establecer/actualizar contraseña directa con cédula
 */

import React, { useState } from 'react';
import { CustomerRegistrationPayload } from '../../services/authService';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { InstallAppModal } from './InstallAppModal';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle,
  X,
  Coffee,
  Mail,
  Download,
} from 'lucide-react';
import { PasswordRequirementsFeedback } from '../components/PasswordRequirementsFeedback';
import { validatePasswordPolicy } from '../../services/passwordValidator';

interface LoginViewProps {
  onLogin: (emailOrUser: string, pass: string) => Promise<any>;
  onRegister?: (payload: CustomerRegistrationPayload) => Promise<any>;
  onResetPassword?: (identifier: string, newPass: string) => Promise<{ success: boolean; customerName: string; email: string }>;
  onSendPasswordResetEmail?: (email: string) => Promise<any>;
  onGoogleLogin?: () => Promise<any>;
  linkGoogleAccount?: (password: string) => Promise<any>;
  googleLinkContext?: { email: string; credential: any } | null;
  loading: boolean;
  error: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLogin,
  onResetPassword,
  onSendPasswordResetEmail,
  onGoogleLogin,
  linkGoogleAccount,
  googleLinkContext,
  loading,
  error,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modales de Recuperación y Establecimiento de Contraseña e Instalación
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isDirectSetModalOpen, setIsDirectSetModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Estados del modal de establecimiento directo por cédula
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [resetShowPass, setResetShowPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    const cleanUser = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setLocalError('Por favor ingresa tu correo o cédula y tu contraseña.');
      return;
    }

    try {
      await onLogin(cleanUser, cleanPass);
    } catch (err: any) {
      // Manejado por estado de error
    }
  };

  const handleSetDirectPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!resetIdentifier.trim()) {
      setResetError('Por favor ingresa tu número de cédula, correo o teléfono.');
      return;
    }

    const cleanPass = resetNewPass.trim();
    const policy = validatePasswordPolicy(cleanPass);
    if (!policy.isValid) {
      setResetError(policy.errorMessage || 'La contraseña debe contener 1 mayúscula, 1 minúscula, 3 números y 1 carácter especial.');
      return;
    }

    if (resetNewPass !== resetConfirmPass) {
      setResetError('Las contraseñas no coinciden.');
      return;
    }

    setResetLoading(true);

    try {
      if (onResetPassword) {
        const result = await onResetPassword(resetIdentifier.trim(), resetNewPass.trim());
        setIsDirectSetModalOpen(false);
        setSuccessMessage(`¡Contraseña establecida para ${result.customerName}! Ya puedes iniciar sesión.`);
        setIdentifier(resetIdentifier.trim());
        setPassword(resetNewPass.trim());
        setResetIdentifier('');
        setResetNewPass('');
        setResetConfirmPass('');
      }
    } catch (err: any) {
      setResetError(err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setResetLoading(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Logotipo Oficial Circular Taju Coffee House */}
        <div className="text-center">
          <div className="inline-block relative mb-3">
            <img
              src="/assets/aistudio/image_4501393a.png"
              alt="Taju Coffee House Logo"
              className="w-24 h-24 rounded-full mx-auto object-cover shadow-xl border-2 border-amber-900/30"
            />
          </div>

          <h1 className="font-display font-extrabold text-2xl tracking-tight text-[#16191C]">
            Taju Coffee House
          </h1>
          <p className="mt-0.5 text-xs text-[#D8470A] font-sans font-bold uppercase tracking-widest">
            Specialty Coffee · Tarjeta de Fidelidad Digital
          </p>
        </div>

        {/* Tarjeta de Autenticación Unificada */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xl">
          
          <div className="mb-5 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-lg text-[#16191C]">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-gray-500 font-sans mt-0.5">
                Ingresa con tu correo electrónico o cédula registrada
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
          </div>

          {/* Banner de Mensaje de Éxito */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl mb-4 flex items-start space-x-2 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Banner de Error */}
          {activeError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{activeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo 1: Correo o Cédula */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Correo Electrónico o Cédula *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ej: cliente@correo.com o cédula (1098742516)..."
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Campo 2: Contraseña */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                  Contraseña *
                </label>
                
                {/* Enlace para Recuperar / Enviar Correo de Restablecimiento */}
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[10px] text-[#D8470A] hover:underline font-bold cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón Principal Iniciar Sesión */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-taju-primary font-display font-bold uppercase text-xs tracking-wider py-3 rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
            >
              {loading ? (
                <span>Verificando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar a Taju Coffee</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Separador */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono">
              <span className="bg-white px-2 text-gray-400">O también</span>
            </div>
          </div>

          {/* Botón de Google Login con Validación Cruzada Auth <-> Firestore */}
          {onGoogleLogin && (
            <button
              type="button"
              onClick={async () => {
                setLocalError(null);
                setSuccessMessage(null);
                try {
                  await onGoogleLogin();
                } catch (_) {
                  // El error (ej. Caso A: correo ya registrado) es capturado en el Controlador
                  // y mostrado automáticamente en el banner de alerta de esta Vista (activeError)
                }
              }}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-sans font-bold text-xs py-2.5 px-4 rounded-xl border border-gray-200 flex items-center justify-center space-x-2.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>
          )}

          {/* Botón para Instalar Aplicación (Tutorial Android / iPhone) */}
          <button
            type="button"
            onClick={() => setIsInstallModalOpen(true)}
            className="w-full mt-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-sans font-bold text-xs py-2.5 px-4 rounded-xl border border-amber-200/80 flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-[#D8470A]" />
            <span>Instalar Aplicación en Celular</span>
          </button>

        </div>

        {/* Info pie */}
        <p className="mt-4 text-center text-[11px] text-gray-400 font-sans">
          Taju Coffee House · Cra 7 #54-20, Sede Chapinero · Bogotá
        </p>
      </div>

      {/* =========================================================================
          MODAL DE INSTALACIÓN PWA (Android / iPhone)
         ========================================================================= */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* =========================================================================
          MODAL 1: RECUPERACIÓN DE CONTRASEÑA POR EMAIL (sendPasswordResetEmail)
         ========================================================================= */}
      {onSendPasswordResetEmail && (
        <ForgotPasswordModal
          isOpen={isForgotModalOpen}
          onClose={() => setIsForgotModalOpen(false)}
          onSendPasswordResetEmail={onSendPasswordResetEmail}
          initialEmail={identifier}
        />
      )}

      {/* =========================================================================
          MODAL 2: ESTABLECER CONTRASEÑA DIRECTA CON CÉDULA
         ========================================================================= */}
      {isDirectSetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 shadow-2xl relative my-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-[#16191C]">
                    Establecer con Cédula
                  </h3>
                  <p className="text-[11px] text-gray-500 font-sans">
                    Define tu clave personal para acceder a tu tarjeta
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDirectSetModalOpen(false)}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mt-3 flex items-start space-x-2 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleSetDirectPassword} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Tu Cédula o Correo Registrado *
                </label>
                <input
                  type="text"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="Ej: 1098742516 o tu@correo.com"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={resetShowPass ? 'text' : 'password'}
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    placeholder="Mínimo 4 caracteres (ej: Taju2026)"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setResetShowPass(!resetShowPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {resetShowPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <PasswordRequirementsFeedback password={resetNewPass} showAlways={true} />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type={resetShowPass ? 'text' : 'password'}
                  value={resetConfirmPass}
                  onChange={(e) => setResetConfirmPass(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDirectSetModalOpen(false)}
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-4 py-2 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {resetLoading ? <span>Guardando...</span> : <span>Guardar Contraseña</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: VINCULAR CUENTA DE GOOGLE CON CONTRASEÑA EXISTENTE
         ========================================================================= */}
      {googleLinkContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 shadow-2xl relative my-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-[#16191C]">
                    Vincular Cuenta de Google
                  </h3>
                  <p className="text-[11px] text-gray-500 font-sans">
                    El correo {googleLinkContext.email} ya está registrado. Ingresa tu contraseña para unificarlas.
                  </p>
                </div>
              </div>
            </div>

            {linkError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mt-3 flex items-start space-x-2 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{linkError}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLinkError(null);
                if (!linkPassword.trim()) {
                  setLinkError('Por favor ingresa tu contraseña actual.');
                  return;
                }
                setLinkLoading(true);
                try {
                  if (linkGoogleAccount) {
                    await linkGoogleAccount(linkPassword.trim());
                  }
                } catch (err: any) {
                  setLinkError(err.message || 'Contraseña incorrecta.');
                } finally {
                  setLinkLoading(false);
                }
              }}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Contraseña Actual de {googleLinkContext.email} *
                </label>
                <input
                  type="password"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Tu contraseña registrada..."
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkPassword('')}
                  disabled={linkLoading}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={linkLoading}
                  className="btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-4 py-2 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {linkLoading ? <span>Vinculando...</span> : <span>Vincular y Acceder</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
