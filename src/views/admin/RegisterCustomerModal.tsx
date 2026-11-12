/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Registro de Nuevo Cliente - Taju Coffee House
 * Réplica exacta de la pantalla en image_9e225f46.png
 */

import React, { useState } from 'react';
import { CustomerRegistrationPayload } from '../../services/authService';
import { UserPlus, X, Check, CreditCard, Gift, AlertCircle, Smartphone, Lock, Eye, EyeOff } from 'lucide-react';
import { PasswordRequirementsFeedback } from '../components/PasswordRequirementsFeedback';
import { validatePasswordPolicy } from '../../services/passwordValidator';

interface RegisterCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (payload: CustomerRegistrationPayload) => Promise<any>;
  submitting?: boolean;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const RegisterCustomerModal: React.FC<RegisterCustomerModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  submitting = false,
}) => {
  const [docType, setDocType] = useState('Cédula C.C.');
  const [docNumber, setDocNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+57 ');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('Taju2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [birthdayDay, setBirthdayDay] = useState('14');
  const [birthdayMonth, setBirthdayMonth] = useState('Octubre');
  const [grantWelcomeStamp, setGrantWelcomeStamp] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Por favor ingresa el nombre completo del cliente.');
      return;
    }
    if (!docNumber.trim()) {
      setFormError('Por favor ingresa el número de documento de identificación.');
      return;
    }

    const cleanPass = password.trim() || 'Taju2026!';
    const policy = validatePasswordPolicy(cleanPass);
    if (!policy.isValid) {
      setFormError(policy.errorMessage || 'La contraseña debe contener 1 mayúscula, 1 minúscula, 3 números y 1 carácter especial.');
      return;
    }

    // Si no proporciona email, generar uno basado en documento o teléfono
    const customerEmail = email.trim() || `cliente.${docNumber.replace(/\D/g, '')}@taju.co`;

    try {
      await onRegister({
        email: customerEmail,
        name: name.trim(),
        username: username.trim() || undefined,
        password: cleanPass,
        documentType: docType,
        documentNumber: docNumber.trim(),
        phone: phone.trim(),
        birthdayDay,
        birthdayMonth,
        grantWelcomeStamp,
      });
    } catch (err: any) {
      setFormError(err.message || 'Error registrando cliente en Taju Coffee House.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera y Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <div className="text-[11px] font-sans text-gray-400 flex items-center space-x-1">
              <span>Clientes</span>
              <span>/</span>
              <span className="text-[#D8470A] font-semibold">Nuevo Cliente</span>
            </div>
            <div className="flex items-center space-x-2.5 mt-0.5">
              <h2 className="font-display font-extrabold text-xl text-[#16191C]">
                Registrar Nuevo Cliente
              </h2>
              <span className="bg-[#FFEDE5] text-[#D8470A] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Emisión Inmediata
              </span>
            </div>
            <p className="text-xs text-gray-500 font-sans mt-0.5">
              Crea una cuenta en segundos para vincular su tarjeta de fidelidad y acumular sellos desde la primera visita en barra.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mt-4 flex items-start space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          
          {/* SECCIÓN 1: Datos del Cliente */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#D8470A] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xs uppercase text-[#16191C] tracking-wide">
                    1. Datos del Cliente
                  </h3>
                  <p className="text-[10px] text-gray-500 font-sans">
                    Identificación rápida para vinculación en sistema POS
                  </p>
                </div>
              </div>
              <span className="bg-[#FFEDE5] text-[#D8470A] text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                REQUERIDO
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* TIPO DOC */}
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  TIPO DOC.
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-[#16191C] font-sans outline-none focus:border-[#D8470A] focus:bg-white"
                >
                  <option value="Cédula C.C.">Cédula C.C.</option>
                  <option value="Cédula Extranjería">Cédula Extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>

              {/* NÚMERO DE DOCUMENTO */}
              <div className="sm:col-span-8">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    NÚMERO DE DOCUMENTO *
                  </label>
                  <span className="text-[9px] text-gray-400 font-mono">Sin puntos</span>
                </div>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="1098742516"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>

              {/* NOMBRE COMPLETO */}
              <div className="sm:col-span-12">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  NOMBRE COMPLETO *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Santiago Vélez Arango"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>

              {/* WHATSAPP / TELÉFONO */}
              <div className="sm:col-span-6">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    WHATSAPP / TELÉFONO MÓVIL *
                  </label>
                  <span className="text-[9px] text-[#D8470A] font-semibold">Para sellos</span>
                </div>
                <div className="relative">
                  <Smartphone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 318 402 9911"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="sm:col-span-6">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    EMAIL *
                  </label>
                  <span className="text-[9px] text-[#D8470A] font-semibold">Único en sistema</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camila@ejemplo.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>

              {/* USUARIO / USERNAME */}
              <div className="sm:col-span-6">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    USUARIO / USERNAME
                  </label>
                  <span className="text-[9px] text-gray-400 font-sans">Opcional (Único)</span>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="ej: camilav, cliente123"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>

              {/* ASIGNACIÓN DE CONTRASEÑA */}
              <div className="sm:col-span-12 bg-orange-50/40 rounded-xl p-3 border border-orange-200/60">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-800 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#D8470A]" />
                    <span>Contraseña Asignada al Cliente *</span>
                  </label>
                  <span className="text-[10px] font-sans text-gray-500">Para ingreso en Login</span>
                </div>

                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ej: 2026Taju"
                    required
                    className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-24 py-2 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A]"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPassword(`Taju${Math.floor(100 + Math.random() * 900)}!`)}
                      className="text-[10px] bg-white hover:bg-orange-50 text-[#D8470A] font-bold px-2 py-0.5 rounded border border-orange-200 cursor-pointer shadow-2xs"
                    >
                      Generar
                    </button>
                  </div>
                </div>

                {/* Requisitos visuales en tiempo real */}
                <PasswordRequirementsFeedback password={password} showAlways={true} />

                <p className="text-[10px] text-gray-500 font-sans mt-1">
                  El cliente podrá usar su Cédula (o correo) con esta contraseña para ver su tarjeta digital y sellos.
                </p>
              </div>

              {/* Cumpleaños del Cliente */}
              <div className="sm:col-span-12 bg-amber-50/50 rounded-lg p-2.5 border border-amber-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Gift className="w-4 h-4 text-[#D8470A]" />
                  <div>
                    <span className="text-xs font-bold text-gray-800">Cumpleaños del Cliente</span>
                    <p className="text-[10px] text-gray-500">¡Regalo sorpresa de café especial durante su mes!</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={birthdayDay}
                    onChange={(e) => setBirthdayDay(e.target.value)}
                    className="bg-white border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </option>
                    ))}
                  </select>

                  <select
                    value={birthdayMonth}
                    onChange={(e) => setBirthdayMonth(e.target.value)}
                    className="bg-white border border-gray-200 rounded px-2 py-1 text-xs font-sans"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Emisión de Tarjeta de Fidelidad */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#D8470A] flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xs uppercase text-[#16191C] tracking-wide">
                  2. Emisión de Tarjeta de Fidelidad
                </h3>
                <p className="text-[10px] text-gray-500 font-sans">
                  Configuración de bienvenida y activación de billetera
                </p>
              </div>
            </div>

            {/* Checkbox Sello de Bienvenida */}
            <label className="flex items-start space-x-3 p-3 bg-gray-50 hover:bg-orange-50/50 rounded-xl border border-gray-200 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={grantWelcomeStamp}
                onChange={(e) => setGrantWelcomeStamp(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#D8470A] accent-[#D8470A] rounded"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-gray-800">
                    Otorgar 1er sello de bienvenida por registro
                  </span>
                  <span className="bg-[#D8470A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                    +1 SELLO GRATIS
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                  El cliente inicia su tarjeta con 1/8 completado para incentivar su segunda visita.
                </p>
              </div>
            </label>
          </div>

          {/* Botones de Envío y Cancelación */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-4 text-[10px] font-mono text-gray-400">
              <span><strong className="text-gray-600">Enter:</strong> Registrar</span>
              <span><strong className="text-gray-600">Esc:</strong> Cancelar</span>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="w-1/2 sm:w-auto btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Emitiendo Tarjeta...' : 'Crear Cliente y Emitir Tarjeta'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
