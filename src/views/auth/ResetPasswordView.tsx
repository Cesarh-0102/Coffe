/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vista de Restablecimiento de Contraseña (MVC View)
 * Taju Coffee House
 * 
 * Se activa cuando el cliente abre el enlace recibido en su correo electrónico:
 * - Valida el código oobCode con Firebase Auth
 * - Valida la política estricta de contraseñas:
 *   * 1 Mayúscula
 *   * 1 Minúscula
 *   * 3 Números
 *   * 1 Carácter especial
 * - Actualiza la contraseña en Firebase Auth Y en la base de datos Firestore (Single Source of Truth)
 * - Permite al cliente ingresar inmediatamente
 */

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Coffee,
  Loader2,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  verifyResetCode,
  confirmPasswordResetAndSync,
} from '../../services/authService';
import { PasswordRequirementsFeedback } from '../components/PasswordRequirementsFeedback';
import { validatePasswordPolicy } from '../../services/passwordValidator';

interface ResetPasswordViewProps {
  oobCode: string;
  onSuccess: (email: string) => void;
  onCancel: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  oobCode,
  onSuccess,
  onCancel,
}) => {
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('Cliente Taju');
  const [isVerifyingCode, setIsVerifyingCode] = useState(true);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  // 1. Verificar el código de restablecimiento al montar
  useEffect(() => {
    let isMounted = true;

    async function checkCode() {
      try {
        setIsVerifyingCode(true);
        setCodeError(null);
        const res = await verifyResetCode(oobCode);
        if (isMounted) {
          setEmail(res.email);
          setCustomerName(res.displayName || 'Cliente Taju');
        }
      } catch (err: any) {
        if (isMounted) {
          setCodeError(
            err.message ||
              'El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.'
          );
        }
      } finally {
        if (isMounted) {
          setIsVerifyingCode(false);
        }
      }
    }

    if (oobCode) {
      checkCode();
    } else {
      setCodeError('No se encontró el código de verificación en el enlace.');
      setIsVerifyingCode(false);
    }

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validación estricta con la política requerida
    const validation = validatePasswordPolicy(newPassword);
    if (!validation.isValid) {
      setSubmitError(
        validation.errorMessage ||
          'La contraseña no cumple con todos los requisitos de seguridad obligatorios.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Confirmar en Firebase Auth Y actualizar en Firestore users & loyaltyCards
      await confirmPasswordResetAndSync(oobCode, newPassword.trim());
      setIsDone(true);
    } catch (err: any) {
      setSubmitError(
        err.message ||
          'No se pudo actualizar la contraseña. Es posible que el enlace haya expirado.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Cabecera con Logotipo Oficial Taju Coffee House */}
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
            Restablecer Contraseña Oficial
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xl">
          
          {isVerifyingCode ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#D8470A] animate-spin mx-auto" />
              <p className="text-xs font-sans text-gray-600">
                Verificando enlace de seguridad de Firebase...
              </p>
            </div>
          ) : codeError ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#16191C]">
                  Enlace no válido o expirado
                </h3>
                <p className="text-xs text-gray-600 font-sans mt-1 leading-relaxed">
                  {codeError}
                </p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="w-full btn-taju-primary font-display font-bold uppercase text-xs tracking-wider py-2.5 rounded-xl shadow-md cursor-pointer"
              >
                Volver al Inicio de Sesión
              </button>
            </div>
          ) : isDone ? (
            <div className="py-6 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-lg text-[#16191C]">
                  ¡Contraseña actualizada con éxito!
                </h3>
                <p className="text-xs text-gray-600 font-sans mt-1.5 leading-relaxed">
                  Tu nueva contraseña ha sido sincronizada en la base de datos de <strong>Taju Coffee House</strong>. Ya puedes ingresar con tu cuenta.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSuccess(email)}
                className="w-full btn-taju-primary font-display font-bold uppercase text-xs tracking-wider py-3 rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Ingresar Ahora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8470A]">
                  Cuenta verificada
                </span>
                <h2 className="font-display font-extrabold text-base text-[#16191C]">
                  Hola, {customerName}
                </h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {email}
                </p>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-start space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Campo 1: Nueva Contraseña */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder="Ej: Taju2026!"
                    required
                    disabled={isSubmitting}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Retroalimentación en tiempo real de las reglas */}
                <PasswordRequirementsFeedback password={newPassword} showAlways={true} />
              </div>

              {/* Campo 2: Confirmar Contraseña */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder="Repite la contraseña"
                    required
                    disabled={isSubmitting}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Botón de envío */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-taju-primary font-display font-bold uppercase text-xs tracking-wider py-3 rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sincronizando con Base de Datos...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Actualizar e Iniciar Sesión</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                >
                  Cancelar y volver
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
