/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Historial Detallado de Sellos y Compras - Taju Coffee House
 */

import React from 'react';
import { StampHistoryEntry, formatCurrency, formatDateTime } from '../../models/StampHistory';
import { History, Gift, CheckCircle, Clock } from 'lucide-react';

interface StampHistoryTableProps {
  history: StampHistoryEntry[];
  loading?: boolean;
  isAdmin?: boolean;
  onEditEntry?: (entry: StampHistoryEntry) => void;
  onDeleteEntry?: (entry: StampHistoryEntry) => void;
}

export const StampHistoryTable: React.FC<StampHistoryTableProps> = ({
  history,
  loading = false,
  isAdmin = false,
  onEditEntry,
  onDeleteEntry,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs mt-4">
      
      {/* Encabezado del Historial */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#D8470A] flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-[#16191C]">
              Historial Detallado de Sellos y Ventas
            </h3>
            <p className="text-xs text-gray-400 font-sans">
              {isAdmin
                ? 'Haz clic en cualquier registro para editar el monto de la compra o eliminar el sello.'
                : 'Registro inmutable en Firestore con monto exacto, fecha y hora de compra.'}
            </p>
          </div>
        </div>

        <span className="font-mono text-xs bg-gray-100 rounded-full px-3 py-1 text-gray-700">
          {history.length} {history.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Contenido: Tabla o Estado Vacío */}
      {loading ? (
        <div className="py-10 text-center">
          <div className="inline-block w-6 h-6 border-2 border-[#D8470A] border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            Consultando registros en Firestore...
          </p>
        </div>
      ) : history.length === 0 ? (
        <div className="py-8 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200 my-3">
          <Clock className="w-7 h-7 text-gray-400 mx-auto mb-1.5 opacity-60" />
          <p className="font-display font-bold text-xs text-[#16191C]">
            Aún no hay sellos registrados
          </p>
          <p className="text-[11px] text-gray-500 max-w-xs mx-auto mt-0.5">
            Realiza tu compra igual o superior a $15.000 en Taju Coffee House y presenta tu QR al barista.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto my-3 border border-gray-100 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-display uppercase tracking-wider text-[10px] border-b border-gray-200">
                <th className="py-2.5 px-3"># Sello</th>
                <th className="py-2.5 px-3">Monto Compra</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Hora Exacta</th>
                <th className="py-2.5 px-3">Ciclo</th>
                <th className="py-2.5 px-3">Estado / Premio</th>
                {isAdmin && <th className="py-2.5 px-3 text-right">Acciones Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-sans">
              {history.map((entry) => {
                const { date, time } = formatDateTime(entry.createdAt);
                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      isAdmin ? 'hover:bg-orange-50/50 cursor-pointer' : 'hover:bg-gray-50/70'
                    }`}
                    onClick={() => {
                      if (isAdmin && onEditEntry) onEditEntry(entry);
                    }}
                  >
                    {/* Número de Sello */}
                    <td className="py-2.5 px-3 font-mono font-bold text-[#D8470A]">
                      <span className="inline-block bg-orange-100 text-[#D8470A] px-2 py-0.5 rounded text-[11px]">
                        Sello #{entry.stampNumber}
                      </span>
                    </td>

                    {/* Monto Exacto de la Compra */}
                    <td className="py-2.5 px-3 font-mono font-bold text-sm text-[#16191C]">
                      {formatCurrency(entry.purchaseAmount)}
                    </td>

                    {/* Fecha */}
                    <td className="py-2.5 px-3 text-gray-700 font-medium">
                      {date}
                    </td>

                    {/* Hora Exacta */}
                    <td className="py-2.5 px-3 font-mono text-gray-400">
                      {time}
                    </td>

                    {/* Número de Ciclo */}
                    <td className="py-2.5 px-3 font-mono text-gray-600">
                      Ciclo #{entry.cycleNumber}
                    </td>

                    {/* Estado / Premio */}
                    <td className="py-2.5 px-3">
                      {entry.rewardGranted ? (
                        <span className="inline-flex items-center space-x-1 bg-[#D8470A] text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <Gift className="w-3 h-3" />
                          <span>¡Premio Otorgado!</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 font-mono text-[11px] font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Acreditado</span>
                        </span>
                      )}
                    </td>

                    {/* Acciones Admin (Editar / Eliminar) */}
                    {isAdmin && (
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => onEditEntry && onEditEntry(entry)}
                            title="Editar Sello / Monto"
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-[#D8470A] transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEntry && onDeleteEntry(entry)}
                            title="Eliminar Sello y Venta"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
