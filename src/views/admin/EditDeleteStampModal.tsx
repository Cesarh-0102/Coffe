/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Edición o Eliminación de Sello/Venta - Taju Coffee House (Admin)
 * Permite al administrador editar el monto o eliminar la venta/sello,
 * recalculando automáticamente la tarjeta del cliente y sincronizando Firestore.
 */

import React, { useState } from 'react';
import { StampHistoryEntry } from '../../models/StampHistory';
import { DollarSign, Trash2, Edit3, X, AlertCircle, Check, Coffee } from 'lucide-react';
import { MINIMUM_PURCHASE_AMOUNT } from '../../models/LoyaltyCard';

interface EditDeleteStampModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: StampHistoryEntry | null;
  onUpdate: (historyId: string, data: { purchaseAmount: number; notes?: string }) => Promise<any>;
  onDelete: (historyId: string) => Promise<any>;
  submitting?: boolean;
}

export const EditDeleteStampModal: React.FC<EditDeleteStampModalProps> = ({
  isOpen,
  onClose,
  entry,
  onUpdate,
  onDelete,
  submitting = false,
}) => {
  if (!isOpen || !entry) return null;

  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [amountStr, setAmountStr] = useState(String(entry.purchaseAmount || 15000));
  const [notes, setNotes] = useState(entry.notes || 'Sello otorgado por consumo');
  const [error, setError] = useState<string | null>(null);

  const numAmount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount < MINIMUM_PURCHASE_AMOUNT) {
      setError(`El monto de la compra debe ser igual o superior a $${MINIMUM_PURCHASE_AMOUNT.toLocaleString('es-CO')}.`);
      return;
    }

    try {
      await onUpdate(entry.id, {
        purchaseAmount: numAmount,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el registro.');
    }
  };

  const handleDeleteConfirm = async () => {
    setError(null);
    try {
      await onDelete(entry.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el sello.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 shadow-2xl relative">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-[#16191C]">
                Gestionar Sello #{entry.stampNumber}
              </h3>
              <p className="text-[10px] font-mono text-gray-400">
                Cliente: {entry.customerName || 'Cliente Taju'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 flex items-start space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'view' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono">Monto de Venta:</span>
                <span className="font-mono font-bold text-base text-[#16191C]">
                  ${Number(entry.purchaseAmount || 0).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono">Ciclo:</span>
                <span className="font-medium">Ciclo #{entry.cycleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono">Fecha / Hora:</span>
                <span className="font-medium">{new Date(entry.createdAt).toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono">Notas:</span>
                <span className="font-medium italic">{entry.notes || 'Sello otorgado por consumo'}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center font-sans">
              ¿Qué acción deseas realizar sobre este sello y registro de venta?
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-display font-bold uppercase text-xs tracking-wider py-3 px-4 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Edit3 className="w-4 h-4 text-[#D8470A]" />
                <span>Editar Monto</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('delete')}
                className="bg-red-50 hover:bg-red-100 text-red-700 font-display font-bold uppercase text-xs tracking-wider py-3 px-4 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Eliminar Sello</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'edit' && (
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Nuevo Monto de la Venta (COP) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-gray-700">
                  $
                </span>
                <input
                  type="text"
                  value={amountStr ? parseInt(amountStr, 10).toLocaleString('es-CO') : ''}
                  onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, ''))}
                  placeholder="15000"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-base font-mono font-bold text-[#16191C] outline-none focus:border-[#D8470A]"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Mínimo requerido por sello: $15.000</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Detalle / Notas
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Americano Doble"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A]"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setMode('view')}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
              >
                Volver
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex-1 btn-taju-primary text-xs font-display font-bold uppercase tracking-wider py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        )}

        {mode === 'delete' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 space-y-2">
              <div className="font-bold flex items-center space-x-1.5 text-red-900">
                <Trash2 className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>¿Estás seguro de eliminar este sello y venta?</span>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Esta acción eliminará permanentemente el registro de venta de <strong>${Number(entry.purchaseAmount || 0).toLocaleString('es-CO')}</strong> (Sello #{entry.stampNumber}) y <strong>reducirá en 1 el conteo de sellos</strong> de la tarjeta del cliente en Firestore.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setMode('view')}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-display font-bold uppercase text-xs tracking-wider py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{submitting ? 'Eliminando...' : 'Sí, Eliminar Sello'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
