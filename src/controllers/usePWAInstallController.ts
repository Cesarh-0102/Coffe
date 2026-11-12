/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controlador MVC de Instalación PWA (src/controllers/usePWAInstallController.ts)
 * Taju Coffee House
 *
 * Responsabilidades:
 * 1. Detectar el sistema operativo del usuario (Android vs iOS/iPhone vs Desktop).
 * 2. Capturar el evento nativo `beforeinstallprompt` en navegadores basados en Chromium (Android Chrome/Edge).
 * 3. Gestionar la lógica del botón "Instalar App":
 *    - En Android (Chrome/Edge): Si el evento `beforeinstallprompt` está disponible, lanza el prompt nativo.
 *      Si no está disponible, abre el modal con el mini-tutorial de Android ("Toca los 3 puntos y selecciona 'Añadir a la pantalla de inicio'").
 *    - En iPhone/iOS (Safari): Como WebKit no soporta `beforeinstallprompt`, abre directamente el
 *      mini-tutorial visual e interactivo exclusivo para iOS ("Toca el icono de Compartir 📤 y selecciona 'Añadir a la pantalla de inicio' ➕").
 */

import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type TutorialPlatform = 'android' | 'ios';

// Variable global para conservar el evento si se dispara antes de montar un componente específico
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function usePWAInstallController() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState<boolean>(false);
  const [tutorialPlatform, setTutorialPlatform] = useState<TutorialPlatform>('android');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Verificar si la PWA ya se está ejecutando en modo standalone (instalada)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandaloneMode);
    };
    checkStandalone();

    // 2. Detectar plataforma (iOS vs Android)
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDetected =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const androidDetected = /android/.test(ua);

    setIsIOS(iosDetected);
    setIsAndroid(androidDetected);
    setTutorialPlatform(iosDetected ? 'ios' : 'android');

    // 3. Capturar evento `beforeinstallprompt` (Android Chrome / Edge / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    // 4. Detectar cuando la app ha sido instalada exitosamente
    const handleAppInstalled = () => {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsTutorialModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Acción principal al pulsar el botón "Instalar App"
   */
  const handleInstallClick = useCallback(async () => {
    // Caso 1: Dispositivo iPhone / iOS (Safari)
    // iOS no soporta el prompt nativo automático; abrimos directamente el tutorial exclusivo para iOS
    if (isIOS) {
      setTutorialPlatform('ios');
      setIsTutorialModalOpen(true);
      return;
    }

    // Caso 2: Dispositivo Android (Chrome/Edge) o Desktop con prompt nativo disponible
    const activePrompt = deferredPrompt || globalDeferredPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
        }
        return;
      } catch (err) {
        console.warn('[PWA Controller] No se pudo lanzar prompt nativo, mostrando tutorial:', err);
      }
    }

    // Caso 3: Android / Navegador cuando `beforeinstallprompt` no está disponible
    // Abre el modal con el mini-tutorial rápido de los 3 puntos
    setTutorialPlatform('android');
    setIsTutorialModalOpen(true);
  }, [isIOS, deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isTutorialModalOpen,
    tutorialPlatform,
    setTutorialPlatform,
    setIsTutorialModalOpen,
    handleInstallClick,
  };
}
