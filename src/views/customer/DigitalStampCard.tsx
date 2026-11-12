/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Tarjeta Digital de Fidelidad - Taju Coffee House
 * Réplica exacta de la tarjeta oscura de lujo mostrada en image_23a2ae5a.png e image_cf165636.png
 */

import React from 'react';
import { LoyaltyCard, StampSlot, MAX_STAMPS_PER_CYCLE } from '../../models/LoyaltyCard';
import { QrCode, Gift, Check, Coffee, Sparkles, ChevronDown } from 'lucide-react';

interface DigitalStampCardProps {
  card: LoyaltyCard | null;
  stampSlots: StampSlot[];
  progressPercent: number;
  stampsRemaining: number;
  onOpenQR: () => void;
  showAdminInfo?: boolean;
}

export const DigitalStampCard: React.FC<DigitalStampCardProps> = ({
  card,
  stampSlots,
  progressPercent,
  stampsRemaining,
  onOpenQR,
  showAdminInfo = false,
}) => {
  const customerName = card?.customerName || 'Valentina Ríos';
  const stampsCount = card?.stampsCount ?? 0;
  const cycles = card?.totalCyclesCompleted ?? 0;
  const version = card?.version ?? 1;
  const docNumber = card?.documentNumber || 'CC •••• 7821';
  const phone = card?.phone || '+57 312 ••• 9021';
  const memberCode = card?.memberCode || '#7821-TJ';
  const memberSince = card?.memberSince || 'Mar 2023';

  return (
    <div className="taju-dark-card rounded-2xl p-5 sm:p-7 text-white overflow-hidden relative">
      
      {/* Marca de agua decorativa suave de taza */}
      <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
        <Coffee className="w-64 h-64 text-white" />
      </div>

      {/* Cabecera de la Tarjeta */}
      <div className="flex items-start justify-between pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center space-x-3">
          {/* Logo cuadrado oscuro TAJU HOUSE */}
          <div className="w-12 h-12 rounded-xl bg-[#23272E] border border-white/15 flex flex-col items-center justify-center p-1 shadow-inner">
            <span className="font-display font-extrabold text-[11px] tracking-widest text-[#D8470A] leading-tight">
              TAJU
            </span>
            <span className="text-[8px] font-sans text-gray-400 uppercase tracking-wider">
              HOUSE
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-mono tracking-widest text-gray-400">
                FIDELIDAD TAJU · SEDE CHAPINERO
              </span>
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">
              {customerName}
            </h2>
            <p className="text-[11px] text-gray-400 font-sans">
              Miembro desde {memberSince}
            </p>
          </div>
        </div>

        {/* Badge Nivel Gold / Cliente Frecuente */}
        <div className="flex flex-col items-end space-y-1">
          <div className="bg-[#D8470A] text-white text-[11px] font-bold font-sans px-3 py-1 rounded-full shadow-sm flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>Cliente Frecuente</span>
          </div>
          <span className="font-mono text-[10px] text-amber-300 font-semibold tracking-wider">
            GOLD {memberCode}
          </span>
        </div>
      </div>

      {/* Fila de Datos de Identificación (Cédula, Teléfono) si está en modo POS */}
      {showAdminInfo && (
        <div className="grid grid-cols-3 gap-3 py-3 border-b border-white/10 text-xs font-sans relative z-10">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-mono block">Titular</span>
            <span className="font-medium text-gray-200 truncate block">{customerName}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-mono block">Cédula / Documento</span>
            <span className="font-mono text-gray-200 block">{docNumber}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-mono block">Teléfono Registrado</span>
            <span className="font-mono text-gray-200 block">{phone}</span>
          </div>
        </div>
      )}

      {/* Barra de Progreso */}
      <div className="py-4 relative z-10">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 rounded-full bg-[#D8470A] text-white flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
            <span className="font-medium text-gray-200">
              Progreso actual: <strong className="text-white">{stampsCount} de {MAX_STAMPS_PER_CYCLE} sellos</strong>
            </span>
          </div>
          <div className="font-mono font-bold text-amber-400 text-sm">
            {stampsCount} de {MAX_STAMPS_PER_CYCLE} sellos ({progressPercent}%)
          </div>
        </div>

        {/* Barra naranja redondeada */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#D8470A] to-[#FF6B2C] rounded-full transition-all duration-500 ease-out shadow-xs"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Cuadrícula de los 8 Sellos (Exacta a image_23a2ae5a.png) */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4 my-2 relative z-10">
        {stampSlots.map((slot) => {
          return (
            <div key={slot.index} className="flex flex-col items-center">
              {/* Caja del Sello */}
              <div
                className={`w-full aspect-square max-w-[85px] rounded-xl flex flex-col items-center justify-center relative transition-transform duration-200 ${
                  slot.isToday
                    ? 'taju-stamp-today scale-102 ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900'
                    : slot.isFilled
                    ? 'taju-stamp-active text-white'
                    : slot.isRewardSlot
                    ? 'taju-stamp-reward text-amber-400'
                    : 'bg-[#22262C] border border-white/5 text-gray-400'
                }`}
              >
                {/* Indicador pequeño superior si es hoy */}
                {slot.isToday && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-[#16191C] animate-ping" />
                )}

                {/* Contenido Central */}
                {slot.isToday ? (
                  <div className="flex flex-col items-center justify-center">
                    <Coffee className="w-5 h-5 text-white mb-0.5" />
                    <span className="font-display font-extrabold text-xs text-white">
                      #{slot.index}
                    </span>
                  </div>
                ) : slot.isFilled ? (
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-display font-extrabold text-sm sm:text-base text-white">
                      #{slot.index}
                    </span>
                  </div>
                ) : slot.isRewardSlot ? (
                  <div className="flex flex-col items-center justify-center p-1 text-center">
                    <Gift className="w-5 h-5 text-amber-400 mb-0.5" />
                    <span className="font-display font-extrabold text-[9px] text-amber-400 uppercase tracking-tight">
                      ¡GRATIS!
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-gray-500 font-light text-base leading-none mb-0.5">+</span>
                    <span className="font-display font-semibold text-xs text-gray-400">
                      #{slot.index}
                    </span>
                  </div>
                )}
              </div>

              {/* Etiqueta Inferior (Fecha o Estado) */}
              <span
                className={`text-[10px] mt-1.5 font-sans font-medium text-center ${
                  slot.isToday
                    ? 'text-amber-400 font-bold'
                    : slot.isFilled
                    ? 'text-gray-300'
                    : slot.isRewardSlot
                    ? 'text-amber-400 font-bold'
                    : 'text-gray-500'
                }`}
              >
                {slot.dateLabel || (slot.isFilled ? `${slot.index * 3} Feb` : `Faltan ${slot.index - stampsCount}`)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Banner de Recompensa dentro de la tarjeta */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#D8470A]/20 border border-[#D8470A]/40 flex items-center justify-center text-[#D8470A] flex-shrink-0">
            <Gift className="w-4 h-4 text-[#D8470A]" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-amber-300 font-bold">
              RECOMPENSA 8° SELLO
            </div>
            <div className="text-xs text-gray-200 font-medium">
              1 Producto disponible de cortesía (1 sola unidad a elección)
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <span className="inline-block bg-black/40 border border-white/10 text-gray-300 text-[11px] font-mono px-2.5 py-1 rounded-full">
            {stampsRemaining > 0 ? `Faltan ${stampsRemaining} visitas` : '¡Recompensa Lista!'}
          </span>
        </div>
      </div>

      {/* Banner Destacado de Ciclos Canjeados */}
      <div className="mt-3 bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between relative z-10 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-gray-950 flex items-center justify-center font-black text-base shadow-sm">
            🏆
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300 font-bold block">
              CICLOS CANJEADOS
            </span>
            <span className="text-xs text-gray-200 font-medium">
              Total de tarjetas completadas y redimidas
            </span>
          </div>
        </div>

        <div className="bg-amber-400 text-gray-950 font-display font-black text-sm px-3.5 py-1.5 rounded-xl shadow-md flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-gray-950" />
          <span>{cycles} {cycles === 1 ? 'Ciclo' : 'Ciclos'}</span>
        </div>
      </div>

      {/* Botón Acordeón "Mostrar QR para sellar o redimir" */}
      <div className="mt-3.5 pt-2 relative z-10">
        <button
          onClick={onOpenQR}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-medium text-xs py-2.5 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
        >
          <div className="flex items-center space-x-2">
            <QrCode className="w-4 h-4 text-[#D8470A] group-hover:scale-110 transition-transform" />
            <span className="font-semibold tracking-wide">Mostrar QR para sellar o redimir</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* Pie de tarjeta sutil con OCC Version */}
      <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-gray-400 relative z-10">
        <span className="flex items-center space-x-1.5">
          <span className="text-gray-400">Ciclos canjeados:</span>
          <strong className="text-amber-300 font-bold bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-md text-xs">
            {cycles} {cycles === 1 ? 'Ciclo' : 'Ciclos'}
          </strong>
        </span>
        <span>OCC Cloud Version: v{version}</span>
      </div>
    </div>
  );
};
