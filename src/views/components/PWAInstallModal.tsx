import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Apple, Check, X, ShieldCheck, Zap, Share, PlusSquare, Menu } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // Detect if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect if user is on iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    setIsIOSDevice(isIOS);
    if (isIOS) {
      setActiveTab('ios');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setIsOpen(false);
      }
    } else {
      setIsOpen(true);
    }
  };

  if (isInstalled) {
    return null; // Already running as an installed PWA
  }

  return (
    <>
      {/* Botón en el Login para Instalar App */}
      <button
        type="button"
        onClick={handleInstallClick}
        className="w-full mt-3 bg-amber-50 hover:bg-amber-100 text-[#D8470A] font-sans font-bold text-xs py-2.5 px-4 rounded-xl border border-amber-200/80 flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-2xs group"
      >
        <div className="w-6 h-6 rounded-lg bg-[#D8470A] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
          <Download className="w-3.5 h-3.5" />
        </div>
        <span>Instalar App en tu Celular</span>
        <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded-full font-mono">
          Guía
        </span>
      </button>

      {/* Modal de Tutorial Responsivo */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full p-5 sm:p-6 shadow-2xl relative my-6 max-h-[90vh] overflow-y-auto">
            
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-[#16191C]">
                    Instala Taju Coffee App
                  </h3>
                  <p className="text-[11px] text-gray-500 font-sans">
                    Acceso rápido desde tu pantalla de inicio sin ocupar espacio de tienda
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Plataforma (Android vs iPhone) */}
            <div className="mt-4 grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-white text-[#D8470A] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Android (Chrome)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-white text-[#D8470A] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Apple className="w-4 h-4" />
                <span>iPhone / iPad (iOS)</span>
              </button>
            </div>

            {/* Contenido del Tutorial según la plataforma seleccionada */}
            <div className="mt-5 space-y-4">
              
              {/* PESTAÑA ANDROID */}
              {activeTab === 'android' && (
                <div className="space-y-4 animate-in fade-in">
                  
                  {/* Botón de Instalación Directa si el navegador lo permite */}
                  {deferredPrompt && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-center">
                      <p className="text-xs text-gray-700 font-medium mb-3">
                        ¡Tu navegador soporta instalación automática con un solo toque!
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          await deferredPrompt.prompt();
                          const { outcome } = await deferredPrompt.userChoice;
                          if (outcome === 'accepted') {
                            setIsOpen(false);
                          }
                        }}
                        className="btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md cursor-pointer inline-flex items-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Instalar Automáticamente Ahora</span>
                      </button>
                    </div>
                  )}

                  <div className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Pasos si usas Google Chrome en Android:
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-[#D8470A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        1
                      </div>
                      <div className="text-xs text-gray-700">
                        Abre el menú de opciones de tu navegador (toca los <span className="font-bold text-gray-900">tres puntos verticales ⋮</span> en la esquina superior derecha).
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-[#D8470A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        2
                      </div>
                      <div className="text-xs text-gray-700">
                        Busca y selecciona la opción <span className="font-bold text-gray-900">"Instalar aplicación"</span> o <span className="font-bold text-gray-900">"Agregar a la pantalla principal"</span>.
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-[#D8470A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        3
                      </div>
                      <div className="text-xs text-gray-700">
                        Confirma tocando en <span className="font-bold text-gray-900">"Instalar"</span> o <span className="font-bold text-gray-900">"Agregar"</span>. ¡Listo! El acceso directo de Taju Coffee quedará en tu celular.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA IOS (IPHONE / IPAD) */}
              {activeTab === 'ios' && (
                <div className="space-y-4 animate-in fade-in">
                  
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 flex items-start space-x-2">
                    <Share className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      En dispositivos Apple (iPhone / iPad), la instalación se realiza directamente desde el navegador <strong>Safari</strong>.
                    </span>
                  </div>

                  <div className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Pasos en Safari para iPhone / iPad:
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        1
                      </div>
                      <div className="text-xs text-gray-700 flex items-center flex-wrap gap-1">
                        Abre esta página en <span className="font-bold text-gray-900">Safari</span> y toca el botón de compartir <span className="inline-flex items-center bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-blue-600 shadow-2xs"><Share className="w-3 h-3 mr-1" /> Compartir</span> en la barra inferior (iPhone) o superior (iPad).
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        2
                      </div>
                      <div className="text-xs text-gray-700 flex items-center flex-wrap gap-1">
                        Desplázate hacia abajo en el menú desplegable y selecciona <span className="inline-flex items-center bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-gray-900 shadow-2xs"><PlusSquare className="w-3 h-3 mr-1 text-gray-700" /> Agregar a inicio</span> (o "Añadir a Pantalla de inicio").
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        3
                      </div>
                      <div className="text-xs text-gray-700">
                        Toca en <span className="font-bold text-gray-900">"Agregar"</span> en la esquina superior derecha. El icono de Taju Coffee House aparecerá en tu pantalla de inicio como una aplicación nativa.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Beneficios PWA */}
              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center text-[11px] text-gray-500">
                <div className="flex items-center justify-center space-x-1.5 bg-gray-50 p-2 rounded-lg">
                  <Zap className="w-3.5 h-3.5 text-[#D8470A]" />
                  <span>Acceso instantáneo</span>
                </div>
                <div className="flex items-center justify-center space-x-1.5 bg-gray-50 p-2 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Seguro y rápido</span>
                </div>
              </div>

            </div>

            {/* Botón Cerrar */}
            <div className="mt-5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-sans font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Entendido, cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
