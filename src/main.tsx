import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { initOneSignal } from './services/oneSignalService';

// Inicialización de OneSignal Web Push SDK
initOneSignal();

// Registro del Service Worker básico de PWA para instalabilidad nativa
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('[PWA] Service Worker (/service-worker.js) registrado correctamente:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Aviso al registrar Service Worker:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
