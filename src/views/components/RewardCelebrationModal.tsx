/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Celebración de Recompensa - Taju Coffee House
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, CheckCircle2, X } from 'lucide-react';

interface RewardCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  totalCycles?: number;
}

export const RewardCelebrationModal: React.FC<RewardCelebrationModalProps> = ({
  isOpen,
  onClose,
  customerName,
  totalCycles = 1,
}) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#D8470A', '#F59E0B', '#16191C', '#FFEDE5', '#D4AF37'],
      });
      const timer = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
          colors: ['#D8470A', '#F59E0B', '#FFFFFF'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
          colors: ['#D8470A', '#F59E0B', '#FFFFFF'],
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center pt-2 pb-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#D8470A] text-white shadow-lg mb-3">
            <Gift className="w-8 h-8" />
          </div>

          <div className="flex items-center justify-center space-x-1.5 text-xs font-mono uppercase text-[#D8470A] tracking-widest font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>¡8 SELLOS COMPLETADOS!</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <h3 className="font-display font-extrabold text-2xl text-[#16191C] mt-1 tracking-tight">
            ¡Premio Especial Taju Ganado!
          </h3>

          {customerName && (
            <p className="text-xs text-gray-500 font-sans mt-0.5">
              Cliente: <strong className="text-gray-800">{customerName}</strong>
            </p>
          )}
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-gray-800 space-y-2">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#D8470A] flex-shrink-0 mt-0.5" />
            <p>
              ¡Felicidades! Has completado el ciclo #{totalCycles}. Tienes derecho a un <strong>Café de especialidad de la casa + Pastelería artesanal de cortesía</strong> en barra.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
            <p>
              Tu tarjeta ha vuelto automáticamente a <strong>0 sellos</strong> para iniciar tu próximo ciclo de fidelización en Taju Coffee House.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={onClose}
            className="w-full btn-taju-primary font-display font-bold uppercase text-xs tracking-wider py-3 rounded-xl shadow-md cursor-pointer"
          >
            Entendido, ¡Muchas Gracias!
          </button>
        </div>
      </div>
    </div>
  );
};
