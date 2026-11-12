/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Barra de Navegación Superior - Taju Coffee House
 * Inspirada fielmente en los diseños oficiales (image_cf165636.png e image_9e225f46.png)
 */

import React from 'react';
import { UserProfile } from '../../models/User';
import { LogOut, RefreshCw, MapPin } from 'lucide-react';

interface BrutalistHeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const BrutalistHeader: React.FC<BrutalistHeaderProps> = ({
  user,
  onLogout,
  onRefresh,
  refreshing = false,
}) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        
        {/* Logotipo Oficial de Taju Coffee House */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src="/assets/aistudio/image_4501393a.png"
              alt="Taju Coffee House Logo"
              className="w-10 h-10 rounded-full object-cover shadow-sm border border-amber-900/20"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[#16191C]">
                Taju Coffee House
              </span>
            </div>
            <p className="text-[10px] font-sans text-[#D8470A] uppercase tracking-widest font-bold">
              Specialty Coffee · Bogotá
            </p>
          </div>
        </div>

        {/* Píldoras de Estado (FIDELIZACIÓN & En Línea) */}
        <div className="hidden md:flex items-center space-x-3">
          <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-[#FFEDE5] text-[#D8470A] border border-[#D8470A]/20">
            🏷️ FIDELIZACIÓN
          </span>

          <span className="inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>En línea</span>
          </span>

          <span className="inline-flex items-center space-x-1 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-[#D8470A]" />
            <span>Sede Chapinero</span>
          </span>
        </div>

        {/* Sección de Usuario y Cierre de Sesión */}
        {user && (
          <div className="flex items-center space-x-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                title="Sincronizar directamente con Firebase"
                className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#D8470A]' : 'text-gray-500'}`} />
                <span className="hidden lg:inline">{refreshing ? 'Sincronizando...' : 'Refrescar'}</span>
              </button>
            )}

            {/* Perfil del Operador / Barista */}
            <div className="flex items-center space-x-2.5 pl-2 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-[#16191C] leading-tight">
                  {user.displayName}
                </div>
                <div className="text-[10px] text-gray-500 font-sans">
                  {user.role === 'admin' ? 'Barista Principal | Turno Mañana' : 'Cliente Frecuente'}
                </div>
              </div>

              {/* Avatar circular */}
              <div className="w-8 h-8 rounded-full bg-[#16191C] text-white flex items-center justify-center text-xs font-bold font-display shadow-xs border border-gray-300">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'T'}
              </div>
            </div>

            {/* Botón Cerrar Sesión */}
            <button
              onClick={onLogout}
              className="inline-flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
