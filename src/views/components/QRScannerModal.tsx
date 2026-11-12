/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Lector y Escáner de Códigos QR - Taju Coffee House
 * Manejo seguro y resiliente del ciclo de vida de la cámara
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Keyboard, QrCode, AlertCircle, Play } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
  knownCustomerIds?: { id: string; name: string }[];
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  knownCustomerIds = [],
}) => {
  const [mode, setMode] = useState<'manual' | 'camera'>('camera');
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const scannerContainerId = 'taju-qr-reader';

  // Detener cámara de forma segura sin colisiones de estado en Html5Qrcode
  const stopCameraSafely = useCallback(async () => {
    if (isTransitioningRef.current) return;
    const scanner = scannerRef.current;
    if (!scanner) return;

    isTransitioningRef.current = true;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (_) {
      // Ignorar transiciones pendientes internas de la librería
    } finally {
      try {
        scanner.clear();
      } catch (_) {}
      scannerRef.current = null;
      setIsScanning(false);
      isTransitioningRef.current = false;
    }
  }, []);

  // Iniciar cámara con comprobación del contenedor DOM
  const startCamera = useCallback(async () => {
    if (isTransitioningRef.current || scannerRef.current) return;

    const container = document.getElementById(scannerContainerId);
    if (!container) return;

    setCameraError(null);
    isTransitioningRef.current = true;

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          if (decodedText) {
            onScanSuccess(decodedText);
            await stopCameraSafely();
          }
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('[QRScanner] Cámara no inicializada:', err);
      setCameraError(
        'No se pudo conectar a la cámara web. Puedes ingresar el código o documento manualmente.'
      );
      setMode('manual');
      await stopCameraSafely();
    } finally {
      isTransitioningRef.current = false;
    }
  }, [onScanSuccess, stopCameraSafely]);

  useEffect(() => {
    if (!isOpen || mode !== 'camera') {
      stopCameraSafely();
      return;
    }

    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      clearTimeout(timer);
      stopCameraSafely();
    };
  }, [isOpen, mode, startCamera, stopCameraSafely]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScanSuccess(manualInput.trim());
      setManualInput('');
    }
  };

  const handleClose = () => {
    stopCameraSafely().then(() => onClose());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-5 sm:p-6 shadow-2xl relative">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-[#16191C]">
                Escanear QR de Cliente
              </h3>
              <p className="text-[10px] text-gray-400 font-sans">Taju Coffee House · POS Chapinero</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Modo */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`flex-1 py-2 text-xs font-display font-bold uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
              mode === 'camera'
                ? 'bg-white text-[#16191C] shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#D8470A]" />
            <span>Cámara en Vivo</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 text-xs font-display font-bold uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
              mode === 'manual'
                ? 'bg-white text-[#16191C] shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-[#D8470A]" />
            <span>Entrada Manual</span>
          </button>
        </div>

        {/* Modo Cámara */}
        {mode === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-2xl bg-[#16191C] min-h-[250px] flex items-center justify-center overflow-hidden border border-gray-800">
              <div id={scannerContainerId} className="w-full h-full" />
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-[#16191C] p-4 text-center">
                  <Camera className="w-8 h-8 text-[#D8470A] mb-2" />
                  <p className="text-xs font-sans text-gray-300 mb-3">
                    {cameraError ? cameraError : 'Cámara lista para activación.'}
                  </p>
                  <button
                    onClick={() => startCamera()}
                    className="btn-taju-primary text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Iniciar Escáner</span>
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-400 font-sans text-center">
              Apunta la cámara al código QR mostrado en la app del cliente.
            </p>
          </div>
        )}

        {/* Modo Manual */}
        {mode === 'manual' && (
          <div className="space-y-3">
            {cameraError && (
              <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl flex items-start space-x-2 text-xs text-[#D8470A]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  ID de Cliente o Código QR
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Ej: ID de cliente o texto escaneado"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-[#D8470A] focus:bg-white rounded-xl px-3 py-2 text-xs text-[#16191C] font-mono outline-none"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="w-full btn-taju-primary text-xs font-display font-bold uppercase tracking-wider py-2.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                Buscar Cliente
              </button>
            </form>

            {knownCustomerIds.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Clientes frecuentes en caja:
                </p>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {knownCustomerIds.slice(0, 5).map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => onScanSuccess(cust.id)}
                      className="w-full text-left p-2 rounded-lg hover:bg-orange-50 text-xs flex justify-between items-center transition-colors cursor-pointer"
                    >
                      <span className="font-semibold text-gray-800 truncate">{cust.name}</span>
                      <span className="font-mono text-[10px] text-gray-400">ID: {cust.id.slice(0, 8)}...</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
