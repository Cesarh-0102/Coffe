/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Componente Vista (MVC View): Modal de Solicitud de Restablecimiento de Contraseña
 * Taju Coffee House
 */

import React, { useState } from 'react';
import {
  Mail,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
  Coffee,
  Loader2,
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPasswordResetEmail: (email: string) => Promise<any>;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSendPasswordResetEmail,
  initialEmail = '',
}) => {
  const [identifier, setIdentifier] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentToEmail, setSentToEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanInput = identifier.trim();

    if (!cleanInput) {
      setErrorMessage('Por favor ingresa tu correo electrónico o tu número de cédula.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await onSendPasswordResetEmail(cleanInput);
      setIsSuccess(true);
      setSentToEmail(result?.email || cleanInput);
    } catch (err: any) {
      setErrorMessage(err.message || 'No fue posible enviar el correo de recuperación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    setIdentifier('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 sm:p-7 shadow-2xl relative my-6">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-[#16191C]">
                Recuperar Contraseña
              </h3>
              <p className="text-[11px] text-gray-500 font-sans">
                Taju Coffee House · Envío de enlace seguro por correo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={isLoading}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Estado: Éxito (Correo Enviado) */}
        {isSuccess ? (
          <div className="py-6 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h4 className="font-display font-extrabold text-lg text-[#16191C]">
                ¡Correo enviado exitosamente!
              </h4>
              <p className="text-xs text-gray-600 font-sans mt-2 leading-relaxed max-w-xs mx-auto">
                Hemos enviado las instrucciones y el enlace de restablecimiento a tu dirección de correo:
              </p>
              <div className="mt-2.5 p-2.5 bg-orange-50/70 border border-orange-200/60 rounded-xl font-mono text-xs font-bold text-[#D8470A] break-all">
                {sentToEmail}
              </div>
              <p className="text-[11px] text-gray-400 font-sans mt-3">
                Por favor revisa tu bandeja de entrada o la carpeta de spam / correo no deseado.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full btn-taju-primary font-display font-bold uppercase text-xs tracking-wider py-2.5 rounded-xl shadow-md cursor-pointer"
              >
                Volver al Inicio de Sesión
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Solicitud */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-gray-600 font-sans leading-relaxed">
              Ingresa el correo electrónico o número de cédula asociado a tu cuenta en Taju Coffee House. Te enviaremos un correo con el enlace oficial para crear tu nueva clave.
            </p>

            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-start space-x-2 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Campo Input de Correo o Cédula */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Correo Electrónico o Cédula *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="ejemplo@correo.com o cédula (1098742516)..."
                  disabled={isLoading}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Botones de Envío y Cancelación */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-taju-primary font-display font-bold uppercase text-xs tracking-wider px-5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando correo...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Correo</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
