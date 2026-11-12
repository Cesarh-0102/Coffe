/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vista MVC: Completar Registro tras Inicio de Sesión con Google (Caso B)
 * Solicita los datos faltantes requeridos en el panel de administración:
 * - Tipo y Número de Cédula / Documento
 * - Teléfono Móvil / WhatsApp
 * - Fecha de Cumpleaños (Día y Mes)
 * - Contraseña para futuros inicios de sesión con credenciales
 */

import React, { useState } from 'react';
import { UserProfile } from '../../models/User';
import { GoogleProfileCompletionPayload } from '../../services/authService';
import { PasswordRequirementsFeedback } from '../components/PasswordRequirementsFeedback';
import { validatePasswordPolicy } from '../../services/passwordValidator';
import {
  UserCheck,
  Smartphone,
  Gift,
  CreditCard,
  Check,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Mail,
} from 'lucide-react';

interface CompleteGoogleProfileViewProps {
  user: UserProfile;
  onComplete: (payload: GoogleProfileCompletionPayload) => Promise<any>;
  onCancel: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const CompleteGoogleProfileView: React.FC<CompleteGoogleProfileViewProps> = ({
  user,
  onComplete,
  onCancel,
  loading = false,
  error = null,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [documentType, setDocumentType] = useState(user.documentType || 'Cédula C.C.');
  const [documentNumber, setDocumentNumber] = useState(user.documentNumber || '');
  const [phone, setPhone] = useState(user.phone || '+57 ');
  const [birthdayDay, setBirthdayDay] = useState<string>(
    user.birthdayDay ? String(user.birthdayDay) : '14'
  );
  const [birthdayMonth, setBirthdayMonth] = useState<string>(user.birthdayMonth || 'Octubre');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanName = displayName.trim();
    const cleanDoc = documentNumber.replace(/\D/g, '').trim();
    const cleanPhone = phone.trim();
    const cleanPass = password.trim();

    if (!cleanName) {
      setLocalError('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!cleanDoc || cleanDoc.length < 5) {
      setLocalError('Por favor ingresa un número de cédula o documento válido (mínimo 5 dígitos).');
      return;
    }

    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 7) {
      setLocalError('Por favor ingresa un número de teléfono móvil válido.');
      return;
    }

    if (!birthdayDay || !birthdayMonth) {
      setLocalError('Por favor selecciona el día y mes de tu cumpleaños.');
      return;
    }

    if (!cleanPass) {
      setLocalError('Por favor crea una contraseña para tus próximos inicios de sesión.');
      return;
    }

    const policy = validatePasswordPolicy(cleanPass);
    if (!policy.isValid) {
      setLocalError(
        policy.errorMessage ||
          'La contraseña debe contener 1 mayúscula, 1 minúscula, 3 números y 1 carácter especial.'
      );
      return;
    }

    try {
      await onComplete({
        displayName: cleanName,
        documentType,
        documentNumber: cleanDoc,
        phone: cleanPhone,
        birthdayDay,
        birthdayMonth,
        password: cleanPass,
        grantWelcomeStamp: true,
      });
    } catch (_) {
      // El error es gestionado por el controlador
    }
  };

  const activeError = localError || error;

  return (
    <div className="min-h-screen bg-[#F5F6F8] py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-xl w-full mx-auto">
        {/* Cabecera de Bienvenida */}
        <div className="text-center mb-6">
          <img
            src="/assets/aistudio/image_4501393a.png"
            alt="Taju Coffee House"
            className="w-20 h-20 rounded-full mx-auto object-cover shadow-lg border-2 border-amber-900/30 mb-3"
          />
          <span className="inline-flex items-center space-x-1.5 bg-[#FFEDE5] text-[#D8470A] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Paso Final · Activar Tarjeta Digital</span>
          </span>
          <h1 className="font-display font-extrabold text-2xl text-[#16191C] mt-2">
            Completa tus Datos de Fidelidad
          </h1>
          <p className="text-xs text-gray-600 font-sans mt-1 max-w-md mx-auto">
            Tu correo <strong className="text-[#16191C]">{user.email}</strong> ha sido verificado con Google.
            Ingresa tu cédula, teléfono móvil y cumpleaños para emitir tu tarjeta de cliente.
          </p>
        </div>

        {/* Tarjeta del Formulario */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-xl">
          {activeError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl mb-5 flex items-start space-x-2.5 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span className="font-medium">{activeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Correo de Google vinculado (Solo lectura) */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Correo Vinculado (Identificador Único)
                  </span>
                  <span className="text-xs font-mono font-bold text-[#16191C]">{user.email}</span>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Verificado
              </span>
            </div>

            {/* Nombre Completo */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Valentina Ríos"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
              />
            </div>

            {/* Tipo de Documento y Cédula */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Tipo Doc. *
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-[#16191C] font-sans outline-none focus:border-[#D8470A] focus:bg-white"
                >
                  <option value="Cédula C.C.">Cédula C.C.</option>
                  <option value="Cédula Extranjería">Cédula Extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>

              <div className="sm:col-span-8">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    Número de Cédula / Documento *
                  </label>
                  <span className="text-[9px] text-gray-400 font-mono">Sin puntos ni espacios</span>
                </div>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1098742516"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>
            </div>

            {/* Teléfono Móvil / WhatsApp */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                  Teléfono Móvil / WhatsApp *
                </label>
                <span className="text-[9px] text-[#D8470A] font-semibold">
                  Requerido para notificaciones de sellos
                </span>
              </div>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 318 402 9911"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>
            </div>

            {/* Cumpleaños del Cliente */}
            <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-[#D8470A] flex items-center justify-center flex-shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-800 block">
                    Fecha de Cumpleaños *
                  </span>
                  <span className="text-[10px] text-gray-500">
                    ¡Recibe un beneficio especial en tu mes de cumpleaños!
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={birthdayDay}
                  onChange={(e) => setBirthdayDay(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A]"
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={(i + 1).toString()}>
                      Día {i + 1}
                    </option>
                  ))}
                </select>

                <select
                  value={birthdayMonth}
                  onChange={(e) => setBirthdayMonth(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A]"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contraseña para futuros inicios de sesión con credenciales */}
            <div className="bg-orange-50/40 rounded-xl p-3.5 border border-orange-200/60">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-800 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#D8470A]" />
                  <span>Crea tu Contraseña de Acceso *</span>
                </label>
                <span className="text-[10px] font-sans text-gray-500">
                  Para ingresar luego con tu correo o cédula
                </span>
              </div>

              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ej: Taju2026!"
                  required
                  className="w-full bg-white border border-gray-300 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <PasswordRequirementsFeedback password={password} showAlways={true} />
            </div>

            {/* Sello de bienvenida informativo */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#D8470A] flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="text-xs text-gray-600">
                Al completar tu registro recibirás automáticamente tu{' '}
                <strong className="text-[#D8470A]">1er sello de bienvenida gratis</strong> en tu tarjeta
                digital.
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cancelar y Salir</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 btn-taju-primary font-display font-bold uppercase text-xs tracking-wider py-3 px-6 rounded-xl shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Guardando y Activando Tarjeta...'
                    : 'Completar Registro y Ver Mi Tarjeta'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
