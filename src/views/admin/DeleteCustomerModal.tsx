/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Confirmación para Eliminar Cliente Fidelizado - Taju Coffee House
 */

import React, { useState } from 'react';
import { LoyaltyCard } from '../../models/LoyaltyCard';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface DeleteCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: LoyaltyCard | null;
  onConfirmDelete: (customerId: string, deleteHistory?: boolean) => Promise<any>;
}

export const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onConfirmDelete,
}) => {
  const [deleteHistory, setDeleteHistory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      await onConfirmDelete(customer.customerId, deleteHistory);
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar al cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-red-200 max-w-md w-full p-6 shadow-2xl relative my-6">
        
        {/* Icono de advertencia principal */}
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-6 h-6" />
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="font-display font-extrabold text-lg text-[#16191C]">
            ¿Eliminar Cliente Fidelizado?
          </h3>
          <p className="text-xs text-gray-600 font-sans leading-relaxed">
            Estás a punto de eliminar el registro de{' '}
            <strong className="text-red-600 font-bold">{customer.customerName}</strong>.
          </p>
        </div>

        {/* Caja de detalles del cliente a eliminar */}
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 my-3 space-y-1 text-xs font-sans text-red-900">
          <div className="flex justify-between">
            <span className="text-gray-500">Correo:</span>
            <span className="font-mono font-bold text-[#D8470A]">{customer.customerEmail || 'Sin correo'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Documento:</span>
            <span className="font-mono font-bold">{customer.documentNumber || 'Sin cédula'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sellos Acumulados:</span>
            <span className="font-mono font-bold text-amber-700">{customer.stampsCount} / 8 sellos</span>
          </div>
        </div>

        {/* Checkbox / Opción: Eliminar también los movimientos e historial de compras */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 my-3">
          <label className="flex items-start space-x-2.5 cursor-pointer text-xs font-sans text-gray-800">
            <input
              type="checkbox"
              checked={deleteHistory}
              onChange={(e) => setDeleteHistory(e.target.checked)}
              className="mt-0.5 rounded border-amber-400 text-[#D8470A] focus:ring-[#D8470A] w-4 h-4 cursor-pointer accent-[#D8470A]"
            />
            <div>
              <span className="font-bold block text-[#16191C]">
                Eliminar también todos los movimientos e historial de compras de este cliente
              </span>
              <span className="text-[11px] text-gray-600 block mt-0.5">
                Si esta casilla está marcada, se borrarán de Firestore todas las transacciones asociadas a su cuenta.
              </span>
            </div>
          </label>
        </div>

        <div className="flex items-start space-x-2 text-[11px] text-amber-800 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60 mb-4">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            Esta acción deshabilitará la tarjeta digital de sellos y eliminará los datos de Firestore.
          </span>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 p-3 rounded-xl text-xs mb-4">
            {error}
          </div>
        )}

        {/* Botones de acción */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-display font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? 'Eliminando...' : 'Sí, Eliminar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
