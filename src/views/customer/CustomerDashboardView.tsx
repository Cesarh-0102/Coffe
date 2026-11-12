/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vista de Cliente - Taju Coffee House
 */

import React, { useState } from 'react';
import { UserProfile } from '../../models/User';
import { useCustomerCardController } from '../../controllers/useCustomerCardController';
import { DigitalStampCard } from './DigitalStampCard';
import { StampHistoryTable } from './StampHistoryTable';
import { CustomerQRModal } from './CustomerQRModal';
import { RewardCelebrationModal } from '../components/RewardCelebrationModal';
import {
  CreditCard,
  Gift,
  Star,
  CheckCircle,
  RefreshCw,
  Sparkles,
  QrCode,
} from 'lucide-react';

interface CustomerDashboardViewProps {
  user: UserProfile;
}

export const CustomerDashboardView: React.FC<CustomerDashboardViewProps> = ({ user }) => {
  const {
    card,
    history,
    stampSlots,
    progressPercent,
    stampsRemaining,
    loading,
    refreshing,
    error,
    showRewardModal,
    setShowRewardModal,
    refreshFromServer,
  } = useCustomerCardController(user.uid);

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'card' | 'rewards'>('card');
  const [showHistory, setShowHistory] = useState(false);

  const firstName = (card?.customerName || user.displayName || 'Valentina').split(' ')[0];

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <div className="max-w-md mx-auto px-4 py-5 sm:py-6">
        
        {/* Cabecera del Cliente con Logo y Sede */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <img
              src="/assets/aistudio/image_4501393a.png"
              alt="Taju Coffee House"
              className="w-10 h-10 rounded-full object-cover shadow-xs border border-amber-900/20"
            />
            <div>
              <h2 className="font-display font-bold text-sm text-[#16191C] leading-tight">
                Taju Coffee House
              </h2>
              <p className="text-[10px] text-gray-500 font-sans uppercase tracking-wider">
                📍 BOGOTÁ · SEDE CHAPINERO
              </p>
            </div>
          </div>

          <button
            onClick={() => refreshFromServer()}
            disabled={refreshing || loading}
            title="Refrescar con el servidor"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#D8470A] shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#D8470A]' : ''}`} />
          </button>
        </div>

        {/* Saludo Personalizado y Nivel Gold */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display font-extrabold text-2xl text-[#16191C] tracking-tight">
              ¡Hola, {firstName}! ☕
            </h1>

            <div className="bg-[#1B1E23] text-amber-400 text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs flex items-center space-x-1.5 border border-amber-400/30">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>NIVEL GOLD</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 mt-1 font-sans">
            {stampsRemaining > 0 ? (
              <>
                Estás a solo <strong className="text-[#D8470A] font-bold">{stampsRemaining} {stampsRemaining === 1 ? 'sello' : 'sellos'}</strong> de tu café y repostería artesanal gratis.
              </>
            ) : (
              <span className="text-[#D8470A] font-bold">
                ¡Has completado 8 sellos! Tu café y repostería artesanal gratis están listos.
              </span>
            )}
          </p>
        </div>

        {/* Notificación si hay premio desbloqueado */}
        {card && card.stampsCount === 8 && (
          <div className="bg-gradient-to-r from-[#D8470A] to-[#E55716] text-white p-3.5 rounded-xl shadow-md mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider">¡8 Sellos Alcanzados!</span>
                <p className="text-[11px] text-white/90">Acércate a caja para reclamar tu cortesía.</p>
              </div>
            </div>
            <button
              onClick={() => setShowRewardModal(true)}
              className="bg-white text-[#D8470A] text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer"
            >
              Reclamar
            </button>
          </div>
        )}

        {/* Tarjeta de Lujo de 8 Sellos Taju */}
        <DigitalStampCard
          card={card}
          stampSlots={stampSlots}
          progressPercent={progressPercent}
          stampsRemaining={stampsRemaining}
          onOpenQR={() => setIsQRModalOpen(true)}
        />

        {/* Botón de Acción Principal "Ver Premios / Historial" */}
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full btn-taju-primary font-display font-bold text-sm py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Gift className="w-4 h-4" />
            <span>{showHistory ? 'Ocultar Historial de Compras' : 'Ver Premios e Historial de Sellos'}</span>
          </button>

          {/* Banner de Reglas del Programa */}
          <div className="bg-white rounded-xl p-3.5 border border-gray-200/80 shadow-2xs">
            <div className="flex items-center space-x-2 text-[#D8470A] font-bold text-[11px] uppercase tracking-wider mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>PROGRAMA DE FIDELIDAD ARTESANAL TAJU COFFEE</span>
            </div>
            <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
              Los sellos no vencen. Cada compra igual o superior a $15.000 califica para 1 sello por orden.
            </p>
          </div>
        </div>

        {/* Tabla Detallada de Historial (Desplegable) */}
        {showHistory && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <StampHistoryTable history={history} loading={loading} />
          </div>
        )}

        {/* Modales */}
        <CustomerQRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          customerId={user.uid}
          customerEmail={user.email}
          customerName={card?.customerName || user.displayName}
        />

        <RewardCelebrationModal
          isOpen={showRewardModal}
          onClose={() => setShowRewardModal(false)}
          customerName={card?.customerName || user.displayName}
          totalCycles={card?.totalCyclesCompleted ?? 1}
        />
      </div>

      {/* Barra de Navegación Inferior Móvil (Fija) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-lg z-30 py-2">
        <div className="max-w-md mx-auto grid grid-cols-3 px-2">
          <button
            onClick={() => { setActiveTab('card'); setShowHistory(false); }}
            className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
              activeTab === 'card' ? 'text-[#D8470A]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <CreditCard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold font-sans">Mi Tarjeta</span>
          </button>

          <button
            onClick={() => { setActiveTab('rewards'); setShowHistory(true); }}
            className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
              activeTab === 'rewards' ? 'text-[#D8470A]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Star className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium font-sans">Recompensas</span>
          </button>

          <button
            onClick={() => setIsQRModalOpen(true)}
            className="flex flex-col items-center justify-center py-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <QrCode className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium font-sans">Mi QR</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
