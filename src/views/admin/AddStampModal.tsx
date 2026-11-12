/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Asignación de Sellos - Taju Coffee House
 * Valida compra mínima de $15.000 y actualiza con OCC
 */

import React, { useState } from 'react';
import { LoyaltyCard, MINIMUM_PURCHASE_AMOUNT, MAX_STAMPS_PER_CYCLE } from '../../models/LoyaltyCard';
import { PlusCircle, X, AlertCircle, Sparkles, Check, DollarSign } from 'lucide-react';

interface AddStampModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: LoyaltyCard | null;
  onConfirm: (amount: number, notes?: string) => Promise<any>;
  submitting?: boolean;
}

const QUICK_AMOUNTS = [15000, 18500, 22000, 30000, 45000];

export const AddStampModal: React.FC<AddStampModalProps> = ({
  isOpen,
  onClose,
  card,
  onConfirm,
  submitting = false,
}) => {
  const [amountStr, setAmountStr] = useState<string>('15000');
  const [notes, setNotes] = useState('Americano Doble');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !card) return null;

  const currentStamps = card.stampsCount;
  const nextStamp = currentStamps + 1;
  const willCompleteCycle = nextStamp >= MAX_STAMPS_PER_CYCLE;
  const numAmount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;

  const handleAmountChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    setAmountStr(digits);
    const parsed = parseInt(digits, 10) || 0;
    if (parsed < MINIMUM_PURCHASE_AMOUNT) {
      setValidationError(
        `El monto debe ser igual o superior a $${MINIMUM_PURCHASE_AMOUNT.toLocaleString('es-CO')} para otorgar un sello.`
      );
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount < MINIMUM_PURCHASE_AMOUNT) {
      setValidationError(
        `El monto debe ser igual o superior a $${MINIMUM_PURCHASE_AMOUNT.toLocaleString('es-CO')}.`
      );
      return;
    }
    try {
      await onConfirm(numAmount, notes.trim() || undefined);
    } catch {
      // El error se maneja en el controlador
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-[#16191C]">
                Asignar Sello de Compra
              </h3>
              <p className="text-[10px] font-mono text-gray-400">
                OCC Target: v{card.version} · Taju Coffee House
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

        {/* Resumen del Cliente */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase text-gray-400">Cliente</span>
              <div className="font-display font-bold text-sm text-[#16191C]">{card.customerName}</div>
              <div className="text-[11px] font-mono text-gray-500">{card.documentNumber || card.customerEmail}</div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-gray-400">Estado</span>
              <div className="font-display font-bold text-sm text-[#D8470A]">
                {currentStamps} de {MAX_STAMPS_PER_CYCLE} Sellos
              </div>
            </div>
          </div>

          {/* Proyección */}
          <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">Al confirmar compra:</span>
            {willCompleteCycle ? (
              <span className="inline-flex items-center space-x-1 font-mono font-bold text-[#D8470A] bg-[#FFEDE5] px-2 py-0.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>¡Completa 8 sellos y gana cortesía!</span>
              </span>
            ) : (
              <span className="font-mono font-bold text-[#16191C]">
                Avanzará al Sello #{nextStamp} de {MAX_STAMPS_PER_CYCLE}
              </span>
            )}
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center space-x-1">
                <DollarSign className="w-3.5 h-3.5 text-[#D8470A]" />
                <span>Monto de la Compra (Mínimo $15.000) *</span>
              </label>
              <span className="text-[10px] font-mono text-gray-400">En pesos COP</span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-gray-700">
                $
              </span>
              <input
                type="text"
                value={amountStr ? parseInt(amountStr, 10).toLocaleString('es-CO') : ''}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="15000"
                className={`w-full bg-gray-50 border rounded-xl pl-8 pr-3 py-2.5 text-base font-mono font-bold text-[#16191C] outline-none ${
                  validationError
                    ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                    : 'border-gray-200 focus:border-[#D8470A] focus:bg-white'
                }`}
                autoFocus
              />
            </div>

            {validationError && (
              <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Montos Rápidos */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-mono text-gray-400 self-center mr-1">Rápidos:</span>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAmountChange(amt.toString())}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    numAmount === amt
                      ? 'bg-[#16191C] text-white border-[#16191C]'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  ${amt.toLocaleString('es-CO')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Producto o Detalle de Orden
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Americano Doble"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white"
            />
          </div>

          <div className="pt-2 flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || numAmount < MINIMUM_PURCHASE_AMOUNT}
              className="flex-1 btn-taju-primary text-xs font-display font-bold uppercase tracking-wider py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Otorgar Sello</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
