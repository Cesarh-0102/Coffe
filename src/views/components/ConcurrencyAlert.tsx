/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Alerta de Prevención de Sobrescritura de Datos Obsoletos - Taju Coffee House
 */

import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface ConcurrencyAlertProps {
  expectedVersion?: number;
  actualVersion?: number;
  message?: string;
  onRefresh: () => void;
  refreshing?: boolean;
}

export const ConcurrencyAlert: React.FC<ConcurrencyAlertProps> = ({
  expectedVersion,
  actualVersion,
  message,
  onRefresh,
  refreshing = false,
}) => {
  return (
    <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4 sm:p-5 my-4 shadow-sm animate-in fade-in">
      <div className="flex items-start space-x-3.5">
        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex-shrink-0 flex items-center justify-center shadow-xs">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-display font-bold text-sm text-red-900 uppercase tracking-wider">
              ¡Conflicto de Concurrencia Optimista (OCC)!
            </h4>
            <span className="bg-red-600 text-white text-[9px] font-mono px-2 py-0.5 rounded-full uppercase">
              Bloqueo Preventivo
            </span>
          </div>

          <p className="text-xs text-red-800 mt-1 font-sans leading-relaxed">
            {message ||
              'La tarjeta de este cliente fue modificada por otro usuario o dispositivo en Firebase mientras estaba en tu pantalla. Para evitar la sobrescritura de datos obsoletos, se ha protegido la base de datos.'}
          </p>

          {expectedVersion !== undefined && actualVersion !== undefined && (
            <div className="flex items-center space-x-3 mt-2 font-mono text-[11px] bg-white rounded-lg border border-red-200/80 p-2">
              <div>
                <span className="text-gray-400">Versión en tu pantalla:</span>{' '}
                <strong className="text-gray-800">v{expectedVersion}</strong>
              </div>
              <span className="text-gray-400">→</span>
              <div>
                <span className="text-gray-400">Versión actual en Firebase:</span>{' '}
                <strong className="text-red-600">v{actualVersion}</strong>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center space-x-3">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center space-x-2 btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-4 py-2 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Sincronizando...' : 'Refrescar datos del servidor ahora'}</span>
            </button>
            <span className="text-[11px] text-gray-500 font-sans">
              Obligatorio antes de guardar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
