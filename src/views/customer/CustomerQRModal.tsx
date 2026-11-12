/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal del Código QR del Cliente - Taju Coffee House
 */

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateCustomerQRPayload } from '../../services/qrService';
import { QrCode, X, Copy, Check } from 'lucide-react';

interface CustomerQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerEmail: string;
  customerName: string;
}

export const CustomerQRModal: React.FC<CustomerQRModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerEmail,
  customerName,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const qrPayload = generateCustomerQRPayload(customerId, customerEmail);

  const handleCopyId = () => {
    navigator.clipboard.writeText(customerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado */}
        <div className="text-center pb-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 text-[#D8470A] mb-2 shadow-xs">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="font-display font-extrabold text-lg text-[#16191C]">
            Tu Código QR de Fidelidad
          </h3>
          <p className="text-xs text-gray-500 font-sans mt-0.5">
            Presenta este código al barista para registrar tu compra mínima de $15.000 COP.
          </p>
        </div>

        {/* Contenedor del Código QR */}
        <div className="my-3 p-5 bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center shadow-xs">
          <QRCodeSVG
            value={qrPayload}
            size={190}
            level="H"
            includeMargin={false}
            fgColor="#16191C"
            bgColor="#FFFFFF"
          />

          <div className="mt-3.5 text-center">
            <p className="font-display font-bold text-sm text-[#16191C]">
              {customerName}
            </p>
            <p className="text-[11px] text-gray-400 font-mono truncate max-w-[220px]">
              {customerEmail}
            </p>
          </div>
        </div>

        {/* Identificador de Texto y Copiar */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex items-center justify-between">
          <div className="truncate mr-2">
            <div className="text-[9px] uppercase font-mono text-gray-400">ID de Cliente:</div>
            <div className="font-mono text-xs font-bold text-[#16191C] truncate">{customerId}</div>
          </div>
          <button
            onClick={handleCopyId}
            className="flex-shrink-0 px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-xs cursor-pointer flex items-center space-x-1"
            title="Copiar ID"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            <span className="text-[10px] font-mono uppercase">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        {/* Botón de Cierre */}
        <div className="mt-4">
          <button
            onClick={onClose}
            className="w-full btn-taju-primary text-xs font-display font-bold uppercase tracking-wider py-2.5 rounded-xl shadow-md cursor-pointer"
          >
            Listo, Volver a Mi Tarjeta
          </button>
        </div>
      </div>
    </div>
  );
};
