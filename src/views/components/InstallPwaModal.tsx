/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Instalación PWA (Mini-Tutorial Android e iOS) - Taju Coffee House
 * Diseño brutalist y accesible con apartados visuales claros para cada sistema operativo.
 */

import React from 'react';
import { X, Smartphone, Share2, MoreVertical, PlusSquare, CheckCircle, Download } from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-6 animate-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFEDE5] border border-orange-200 flex items-center justify-center text-[#D8470A] shadow-xs flex-shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-extrabold text-lg text-[#16191C]">
                  Instalar Taju Coffee House
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  App PWA
                </span>
              </div>
              <p className="text-xs text-gray-500 font-sans mt-0.5">
                Accede a tu tarjeta de fidelidad y sellos con un solo toque desde tu pantalla de inicio.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 ml-2"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido con dos apartados visualmente claros */}
        <div className="mt-5 space-y-4">
          
          {/* =========================================================================
              APARTADO ANDROID: Instrucciones para Google Chrome y Edge
             ========================================================================= */}
          <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border-2 border-emerald-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-emerald-200/60">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  🤖
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-emerald-950">
                    Apartado Android (Chrome / Edge)
                  </h4>
                  <p className="text-[10px] text-emerald-700 font-sans">
                    Dispositivos Samsung, Xiaomi, Motorola, Huawei y Google Pixel
                  </p>
                </div>
              </div>
              <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                Paso a Paso
              </span>
            </div>

            {/* Texto exacto requerido por el usuario */}
            <div className="bg-white rounded-xl p-3 border border-emerald-200 text-xs text-gray-800 font-sans shadow-2xs space-y-2">
              <div className="flex items-start space-x-2 font-bold text-emerald-900">
                <MoreVertical className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs">
                  Toca los 3 puntos arriba a la derecha y selecciona &apos;Añadir a la pantalla de inicio&apos;
                </p>
              </div>

              <div className="text-[11px] text-gray-600 space-y-1.5 pl-6 border-l-2 border-emerald-200 font-sans">
                <p><strong>1.</strong> Pulsa el botón de opciones <strong>(⋮)</strong> en la esquina superior derecha del navegador.</p>
                <p><strong>2.</strong> Busca y presiona <strong>&apos;Añadir a la pantalla de inicio&apos;</strong> o <strong>&apos;Instalar aplicación&apos;</strong>.</p>
                <p><strong>3.</strong> Confirma pulsando <strong>&apos;Instalar&apos;</strong> o <strong>&apos;Añadir&apos;</strong>. ¡Listo!</p>
              </div>
            </div>
          </div>

          {/* =========================================================================
              APARTADO IPHONE: Instrucciones para iOS Safari
             ========================================================================= */}
          <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/30 border-2 border-indigo-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-indigo-200/60">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  🍎
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-indigo-950">
                    Apartado iPhone (iOS Safari)
                  </h4>
                  <p className="text-[10px] text-indigo-700 font-sans">
                    Navegador Safari en iPhone y iPad
                  </p>
                </div>
              </div>
              <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                Paso a Paso
              </span>
            </div>

            {/* Texto exacto requerido por el usuario */}
            <div className="bg-white rounded-xl p-3 border border-indigo-200 text-xs text-gray-800 font-sans shadow-2xs space-y-2">
              <div className="flex items-start space-x-2 font-bold text-indigo-900">
                <Share2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs">
                  Toca el icono Compartir 📤 abajo y selecciona &apos;Añadir a la pantalla de inicio&apos; ➕
                </p>
              </div>

              <div className="text-[11px] text-gray-600 space-y-1.5 pl-6 border-l-2 border-indigo-200 font-sans">
                <p><strong>1.</strong> En la barra inferior de Safari, pulsa el botón de <strong>Compartir 📤</strong> (cuadrado con flecha hacia arriba).</p>
                <p><strong>2.</strong> Desplázate hacia abajo en el menú y selecciona <strong>&apos;Añadir a la pantalla de inicio&apos; ➕</strong>.</p>
                <p><strong>3.</strong> Pulsa <strong>&apos;Añadir&apos;</strong> en la esquina superior derecha y la app quedará instalada.</p>
              </div>
            </div>
          </div>

          {/* Beneficios de la instalación */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-500 font-sans">
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Funciona sin conexión</span>
            </span>
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sin tiendas de apps</span>
            </span>
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Acceso en 1 toque</span>
            </span>
          </div>
        </div>

        {/* Botón de cierre */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto btn-taju-primary font-display font-bold uppercase text-xs tracking-wider px-6 py-2.5 rounded-xl shadow-md cursor-pointer text-center"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
