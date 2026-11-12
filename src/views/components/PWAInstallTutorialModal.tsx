/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Instalación PWA - Taju Coffee House (MVC View)
 * Proporciona guías interactivas y visuales para usuarios de Android (Chrome/Edge)
 * e iPhone / iPad (iOS Safari) para agregar la app a su pantalla de inicio.
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Share,
  MoreVertical,
  PlusSquare,
  X,
  Download,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface PWAInstallTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlatform?: 'android' | 'ios';
  platform?: 'android' | 'ios';
  onSelectPlatform?: (platform: 'android' | 'ios') => void;
}

export const PWAInstallTutorialModal: React.FC<PWAInstallTutorialModalProps> = ({
  isOpen,
  onClose,
  defaultPlatform,
  platform,
  onSelectPlatform,
}) => {
  const [localTab, setLocalTab] = useState<'android' | 'ios'>(
    platform || defaultPlatform || 'android'
  );

  const selectedTab = platform || localTab;
  const handleSelectTab = (tab: 'android' | 'ios') => {
    setLocalTab(tab);
    if (onSelectPlatform) {
      onSelectPlatform(tab);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="bg-white rounded-3xl border border-gray-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con Logo */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#16191C] to-[#2A2E35] p-1 flex items-center justify-center shadow-md">
              <img
                src="/assets/aistudio/image_4501393a.png"
                alt="Taju Coffee House"
                className="w-10 h-10 rounded-xl object-cover"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D8470A] block">
                Progressive Web App
              </span>
              <h3 className="font-display font-extrabold text-lg text-[#16191C]">
                Instalar Taju Coffee House
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensaje descriptivo */}
        <p className="mt-3 text-xs text-gray-600 font-sans leading-relaxed">
          Instala la aplicación en tu pantalla de inicio para acceder directamente a tu tarjeta de sellos,
          recibir notificaciones de premios y disfrutar de una experiencia nativa sin barras de navegación.
        </p>

        {/* Selector de Plataforma: Android vs iPhone */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => handleSelectTab('android')}
            className={`py-2.5 px-3 rounded-xl text-xs font-display font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              selectedTab === 'android'
                ? 'bg-white text-[#D8470A] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android (Chrome)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('ios')}
            className={`py-2.5 px-3 rounded-xl text-xs font-display font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              selectedTab === 'ios'
                ? 'bg-white text-[#D8470A] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-base">🍎</span>
            <span>iPhone (Safari)</span>
          </button>
        </div>

        {/* =========================================================================
            APARTADO ANDROID: GUÍA VISUAL PASO A PASO
           ========================================================================= */}
        {selectedTab === 'android' && (
          <div className="mt-5 space-y-3.5 animate-in fade-in duration-150">
            <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#D8470A] uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Instalación en Android / Google Chrome</span>
              </div>
              <p className="text-xs text-gray-700 font-sans">
                Sigue estos dos sencillos pasos para instalar la aplicación en tu dispositivo:
              </p>
            </div>

            <div className="space-y-3">
              {/* Paso 1 Android */}
              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-[#16191C] text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[#16191C]">
                    <span>Toca los 3 puntos arriba a la derecha</span>
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-200 rounded-md text-gray-700">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                    Abre el menú principal de Google Chrome o de tu navegador.
                  </p>
                </div>
              </div>

              {/* Paso 2 Android */}
              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-[#D8470A] text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[#16191C]">
                    <span>Selecciona &quot;Añadir a la pantalla de inicio&quot;</span>
                    <Download className="w-3.5 h-3.5 text-[#D8470A]" />
                  </div>
                  <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                    O haz clic en &quot;Instalar aplicación&quot; en la ventana emergente de confirmación.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            APARTADO IPHONE: GUÍA VISUAL PASO A PASO
           ========================================================================= */}
        {selectedTab === 'ios' && (
          <div className="mt-5 space-y-3.5 animate-in fade-in duration-150">
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Instalación en iPhone / Safari</span>
              </div>
              <p className="text-xs text-gray-700 font-sans">
                Apple requiere que agregues la aplicación desde Safari con estos 2 pasos:
              </p>
            </div>

            <div className="space-y-3">
              {/* Paso 1 iOS */}
              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-[#16191C] text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[#16191C]">
                    <span>Toca el icono Compartir</span>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-lg">
                      <Share className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-gray-500 font-normal">abajo en la barra</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                    Ubica el botón de compartir en la barra inferior de navegación de Safari.
                  </p>
                </div>
              </div>

              {/* Paso 2 iOS */}
              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-[#D8470A] text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[#16191C]">
                    <span>Selecciona &quot;Añadir a la pantalla de inicio&quot;</span>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 text-gray-800 rounded-lg">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                    Desplázate hacia abajo en la lista y presiona &quot;Añadir&quot; en la esquina superior derecha.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ventajas PWA */}
        <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px] text-gray-500 font-sans">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Acceso offline instantáneo</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Notificaciones de cortesías</span>
          </div>
        </div>

        {/* Botón de Cierre / Entendido */}
        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full btn-taju-primary font-display font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>¡Entendido!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
