/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal para Editar Datos de Cliente Fidelizado - Taju Coffee House
 */

import React, { useState, useEffect } from 'react';
import { LoyaltyCard } from '../../models/LoyaltyCard';
import {
  UserCheck,
  X,
  Mail,
  User,
  CreditCard,
  Phone,
  Coffee,
  Award,
  AlertCircle,
  Save,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { PasswordRequirementsFeedback } from '../components/PasswordRequirementsFeedback';
import { validatePasswordPolicy } from '../../services/passwordValidator';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: LoyaltyCard | null;
  onSave: (customerId: string, updatedData: Partial<LoyaltyCard>) => Promise<any>;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loyaltyLevel, setLoyaltyLevel] = useState('NIVEL GOLD');
  const [stampsCount, setStampsCount] = useState(0);
  const [favoriteDrinkNotes, setFavoriteDrinkNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.customerName || '');
      setEmail(customer.customerEmail || '');
      setDocumentNumber(customer.documentNumber || '');
      setPhone(customer.phone || '');
      setPassword('');
      setShowPassword(false);
      setLoyaltyLevel(customer.loyaltyLevel || 'NIVEL GOLD');
      setStampsCount(typeof customer.stampsCount === 'number' ? customer.stampsCount : 0);
      setFavoriteDrinkNotes(customer.favoriteDrinkNotes || '');
      setError(null);
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }

    const cleanPass = password.trim();
    if (cleanPass) {
      const policy = validatePasswordPolicy(cleanPass);
      if (!policy.isValid) {
        setError(policy.errorMessage || 'La contraseña debe tener 1 mayúscula, 1 minúscula, 3 números y 1 carácter especial.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: Partial<LoyaltyCard> = {
        customerName: name.trim(),
        customerEmail: email.trim(),
        documentNumber: documentNumber.trim(),
        phone: phone.trim(),
        loyaltyLevel,
        stampsCount: Math.max(0, Math.min(8, Number(stampsCount))),
        favoriteDrinkNotes: favoriteDrinkNotes.trim(),
      };

      if (cleanPass) {
        payload.password = cleanPass;
      }

      await onSave(customer.customerId, payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar los datos del cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full p-6 shadow-2xl relative my-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-[#16191C]">
                Editar Cliente Fidelizado
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Modifica la información y progreso del cliente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl my-4 flex items-start space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Nombre y Apellido */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Valentina Ríos"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
              />
            </div>
          </div>

          {/* Grid de 2 columnas: Correo & Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@correo.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Teléfono / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 312 458 9021"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Grid de 2 columnas: Documento & Nivel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Número de Documento (Cédula C.C.)
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ej: 1098742516"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Nivel de Membresía
              </label>
              <div className="relative">
                <Award className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={loyaltyLevel}
                  onChange={(e) => setLoyaltyLevel(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white cursor-pointer"
                >
                  <option value="NIVEL GOLD">NIVEL GOLD</option>
                  <option value="NIVEL SILVER">NIVEL SILVER</option>
                  <option value="NIVEL BRONCE">NIVEL BRONCE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Campo para Cambiar Contraseña del Cliente */}
          <div className="bg-orange-50/50 border border-orange-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#D8470A] uppercase tracking-wider">
              <KeyRound className="w-4 h-4 text-[#D8470A]" />
              <span>Cambiar Contraseña del Cliente (Opcional)</span>
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar en blanco para conservar la clave actual"
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-10 py-2 text-xs font-mono text-[#16191C] outline-none focus:border-[#D8470A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {password.trim() ? (
              <PasswordRequirementsFeedback password={password} showAlways={true} />
            ) : (
              <span className="text-[10px] text-gray-500 font-sans block">
                Solo escribe en este campo si deseas cambiar o restablecer la clave del cliente (ej: TajuCoffee2026!).
              </span>
            )}
          </div>

          {/* Cantidad de sellos activos */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Cantidad de Sellos Activos (0 a 8)
            </label>
            <div className="flex items-center space-x-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <input
                type="range"
                min="0"
                max="8"
                value={stampsCount}
                onChange={(e) => setStampsCount(Number(e.target.value))}
                className="w-full accent-[#D8470A] cursor-pointer"
              />
              <span className="font-mono font-extrabold text-sm text-[#D8470A] min-w-[60px] text-right">
                {stampsCount} / 8
              </span>
            </div>
          </div>

          {/* Bebida favorita y notas */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Notas y Bebida Favorita
            </label>
            <div className="relative">
              <Coffee className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <textarea
                value={favoriteDrinkNotes}
                onChange={(e) => setFavoriteDrinkNotes(e.target.value)}
                placeholder="Ej: Americano Doble con leche de avena · Sin azúcar"
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white resize-none"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
