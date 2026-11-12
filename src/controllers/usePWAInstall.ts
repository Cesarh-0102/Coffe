/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Controlador de Instalación PWA (MVC Controller) - Taju Coffee House
 * Gestiona el evento beforeinstallprompt, detección de dispositivos (Android / iOS)
 * y el flujo de instalación nativa y guiada por modal.
 */

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 1. Detección de si la app ya está corriendo en modo PWA instalada
    const checkIsStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isStandaloneNavigator = (window.navigator as any).standalone === true;
      return isStandaloneMedia || isStandaloneNavigator;
    };

    setIsInstalled(checkIsStandalone());

    // 2. Detección de plataforma móvil
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // 3. Captura del evento nativo beforeinstallprompt (Android Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('[PWA] Evento beforeinstallprompt capturado y guardado');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsModalOpen(false);
      console.log('[PWA] Aplicación instalada con éxito');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Intenta lanzar el prompt nativo de instalación.
   * Si no está disponible o el dispositivo es iOS, abre el tutorial en el modal.
   */
  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return;
        }
      } catch (err) {
        console.warn('[PWA] Error lanzando prompt nativo:', err);
      }
    }

    // Si no hay prompt nativo disponible o es iOS/Android sin prompt automático, abrir tutorial
    setIsModalOpen(true);
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isModalOpen,
    setIsModalOpen,
    handleInstallClick,
  };
}
