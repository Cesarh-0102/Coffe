/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Tutorial e Instalación PWA (Android / iPhone)
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Smartphone,
  Share2,
  PlusSquare,
  CheckCircle2,
  HelpCircle,
  Menu,
  ArrowRight,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [activePlatform, setActivePlatform] = useState<'android' | 'iphone'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detectar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-6 max-h-[90vh] overflow-y-auto">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#D8470A] flex items-center justify-center shadow-inner">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-[#16191C]">
                Instalar Taju Coffee App
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Accede más rápido como una aplicación nativa en tu celular
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isInstalled && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center space-x-3 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">¡La aplicación ya se encuentra instalada en tu dispositivo! Puedes abrirla desde tu pantalla de inicio.</span>
          </div>
        )}

        {/* Selector de Plataforma (Android vs iPhone) */}
        <div className="mt-5 grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => setActivePlatform('android')}
            className={`py-2.5 px-3 rounded-lg text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activePlatform === 'android'
                ? 'bg-white text-[#16191C] shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlatform('iphone')}
            className={`py-2.5 px-3 rounded-lg text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activePlatform === 'iphone'
                ? 'bg-white text-[#16191C] shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Share2 className="w-4 h-4 text-blue-600" />
            <span>iPhone / iOS</span>
          </button>
        </div>

        {/* Contenido del Tutorial */}
        <div className="mt-5 space-y-4">
          {activePlatform === 'android' ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 text-xs text-amber-900">
                <p className="font-bold mb-1 flex items-center space-x-1.5">
                  <span>📱 Tutorial para dispositivos Android (Chrome / Edge)</span>
                </p>
                <p className="text-amber-800/80 leading-relaxed">
                  Puedes instalar Taju Coffee House en segundos para recibir notificaciones y acumular tus sellos sin abrir el navegador.
                </p>
              </div>

              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full btn-taju-primary font-display font-bold uppercase text-xs tracking-wider py-3 rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Aplicación Ahora</span>
                </button>
              )}

              <div className="space-y-3 pt-1">
                <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-[#D8470A]/10 text-[#D8470A] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Abre el menú del navegador</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Toca el ícono de los tres puntos verticales (<Menu className="w-3.5 h-3.5 inline text-gray-700 mx-0.5" />) ubicados en la esquina superior derecha de tu navegador Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-[#D8470A]/10 text-[#D8470A] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Selecciona "Instalar aplicación" o "Agregar a pantalla principal"</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Busca la opción en el menú desplegable. En algunos dispositivos dice <span className="font-semibold text-gray-700">"Instalar aplicación"</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-[#D8470A]/10 text-[#D8470A] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Confirma la instalación</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Presiona <span className="font-semibold text-gray-700">"Instalar"</span> en la ventana emergente. ¡Listo! El acceso directo quedará en tu pantalla de inicio.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-4 text-xs text-blue-900">
                <p className="font-bold mb-1 flex items-center space-x-1.5">
                  <span>🍎 Tutorial para iPhone y iPad (Safari)</span>
                </p>
                <p className="text-blue-800/80 leading-relaxed">
                  Para la mejor experiencia en iOS, asegúrate de abrir esta página en el navegador <span className="font-bold">Safari</span>.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Usa el navegador Safari</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Asegúrate de estar navegando en <span className="font-semibold text-gray-700">Safari</span> (es requisito de Apple para instalar aplicaciones web).
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Toca el botón de Compartir</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      En la barra inferior (o superior) de Safari, toca el ícono de compartir (<Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> cuadrado con flecha hacia arriba).
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Selecciona "Agregar a inicio"</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Desplázate por el menú de opciones hasta encontrar <span className="font-semibold text-gray-700">"Agregar a inicio"</span> (<PlusSquare className="w-3.5 h-3.5 inline text-gray-700 mx-0.5" />).
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Confirma tocando "Agregar"</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      En la esquina superior derecha, presiona <span className="font-semibold text-gray-700">"Agregar"</span>. ¡Listo! Ya tendrás Taju Coffee en tu pantalla de inicio de iOS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl cursor-pointer shadow-md"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
