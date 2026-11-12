/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Panel de Administrador y Punto de Venta (POS) - Taju Coffee House
 * Réplica exacta del panel en image_cf165636.png y pantallas complementarias
 */

import React, { useState } from 'react';
import { UserProfile } from '../../models/User';
import { useAdminController } from '../../controllers/useAdminController';
import { DigitalStampCard } from '../customer/DigitalStampCard';
import { ConcurrencyAlert } from '../components/ConcurrencyAlert';
import { QRScannerModal } from '../components/QRScannerModal';
import { AddStampModal } from './AddStampModal';
import { RegisterCustomerModal } from './RegisterCustomerModal';
import { EditCustomerModal } from './EditCustomerModal';
import { DeleteCustomerModal } from './DeleteCustomerModal';
import { RewardCelebrationModal } from '../components/RewardCelebrationModal';
import { StampHistoryTable } from '../customer/StampHistoryTable';
import { EditDeleteStampModal } from './EditDeleteStampModal';
import { BusinessAnalyticsView } from './BusinessAnalyticsView';
import { formatCurrency, formatDateTime, StampHistoryEntry } from '../../models/StampHistory';
import {
  QrCode,
  UserPlus,
  Search,
  RefreshCw,
  Gift,
  Users,
  FileText,
  Coffee,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Store,
  Touchpad,
  X,
  Plus,
  ArrowRight,
  Sparkles,
  Phone,
  CreditCard,
  Clock,
  Award,
  Pencil,
  Trash2,
  Receipt,
  Calendar,
  DollarSign,
  Menu,
  MessageCircle,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { LoyaltyCard } from '../../models/LoyaltyCard';

/**
 * Calcula los días transcurridos desde el último sello/compra del cliente
 * para auditoría e identificación de retención de clientes (> 7 días)
 */
function getDaysSinceLastVisit(customer: LoyaltyCard): { days: number; label: string; isOverdue: boolean } {
  const dateStr = customer.lastPurchaseDate || customer.updatedAt || customer.createdAt;
  if (!dateStr) {
    return { days: 0, label: 'Hoy', isOverdue: false };
  }
  const dateObj = new Date(dateStr);
  const time = dateObj.getTime();
  if (isNaN(time)) {
    return { days: 0, label: 'Reciente', isOverdue: false };
  }
  const diffMs = Date.now() - time;
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (days === 0) {
    return { days: 0, label: 'Hoy (0 días)', isOverdue: false };
  }
  if (days === 1) {
    return { days: 1, label: 'Hace 1 día', isOverdue: false };
  }
  return {
    days,
    label: `Hace ${days} días`,
    isOverdue: days >= 7,
  };
}

/**
 * =========================================================================
 * INTEGRACIÓN WHATSAPP - Botón de Retención para el Administrador:
 * Extrae el número de teléfono del cliente desde la base de datos de Firestore
 * y genera un enlace dinámico wa.me/<telefono>?text=<mensaje_personalizado>
 * Mensaje predeterminado:
 * "¡Hola [Nombre]! Hemos notado que llevas varios días sin visitarnos en Taju Coffee House.
 * Te recordamos que tienes sellos acumulados, ¡vuelve pronto para seguir sumando y ganar tu premio!"
 * =========================================================================
 */
function getCustomerWhatsAppUrl(phone: string | undefined, customerName: string): string | null {
  if (!phone) return null;
  const cleanDigits = phone.replace(/\D/g, '');
  if (!cleanDigits || cleanDigits.length < 7) return null;

  // Si es celular en Colombia (10 dígitos que inician con 3), anteponer el prefijo de país 57
  const finalPhone = cleanDigits.length === 10 && cleanDigits.startsWith('3') ? `57${cleanDigits}` : cleanDigits;
  const nombre = (customerName || 'Cliente').trim();
  const message = `¡Hola ${nombre}! Hemos notado que llevas varios días sin visitarnos en Taju Coffee House. Te recordamos que tienes sellos acumulados, ¡vuelve pronto para seguir sumando y ganar tu premio!`;

  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}

interface AdminDashboardViewProps {
  user: UserProfile;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ user }) => {
  const {
    cards,
    allCards,
    totalCardsCount,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    selectedCard,
    selectedCustomerHistory,
    historyLoading,
    allHistory,
    allHistoryLoading,
    loadAllHistory,
    setSelectedCard,
    handleSelectCustomer,
    handleRefreshSelectedCustomer,
    // Modales
    isQRScannerOpen,
    setIsQRScannerOpen,
    isAddStampModalOpen,
    setIsAddStampModalOpen,
    isRegisterModalOpen,
    setIsRegisterModalOpen,
    rewardCelebrationResult,
    setRewardCelebrationResult,
    // Modales Editar y Eliminar
    isEditModalOpen,
    setIsEditModalOpen,
    editingCustomer,
    setEditingCustomer,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    deletingCustomer,
    setDeletingCustomer,
    // Concurrencia y Alertas
    concurrencyConflict,
    actionError,
    actionSuccess,
    actionSubmitting,
    handleAddStamp,
    handleQRCodeScanned,
    handleRegisterNewCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handleUpdateStampHistory,
    handleDeleteStampHistory,
    clearAllHistory,
    loadAllCards,
  } = useAdminController(user);

  const [activeSidebarTab, setActiveSidebarTab] = useState<'scan' | 'analytics' | 'purchases' | 'customers' | 'history'>('scan');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [purchasesCustomerFilter, setPurchasesCustomerFilter] = useState<string>('all');
  const [purchasesMonthFilter, setPurchasesMonthFilter] = useState<string>('all');
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [successBannerDismissed, setSuccessBannerDismissed] = useState(false);
  const [customersFilter, setCustomersFilter] = useState<'all' | 'near_reward' | 'gold' | 'retention_7d'>('all');
  const [historyScope, setHistoryScope] = useState<'all' | 'selected'>('all');
  const [editingStampEntry, setEditingStampEntry] = useState<StampHistoryEntry | null>(null);

  // Lista filtrada en vivo de clientes para el typeahead en el Historial de Compras
  const searchedCustomersList = React.useMemo(() => {
    if (!customerSearchInput.trim()) return allCards;
    const term = customerSearchInput.toLowerCase().trim();
    return allCards.filter((c) => {
      const nameMatch = (c.customerName || '').toLowerCase().includes(term);
      const docMatch = (c.documentNumber || '').toLowerCase().includes(term);
      const emailMatch = (c.customerEmail || '').toLowerCase().includes(term);
      return nameMatch || docMatch || emailMatch;
    });
  }, [allCards, customerSearchInput]);

  // Cálculo memoizado de meses disponibles para el filtro
  const availableMonths = React.useMemo(() => {
    const monthsMap = new Map<string, string>();
    allHistory.forEach((h) => {
      if (h.createdAt) {
        const date = new Date(h.createdAt);
        if (!isNaN(date.getTime())) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthName = date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
          const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          monthsMap.set(key, capitalized);
        }
      }
    });

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!monthsMap.has(currentKey)) {
      const monthName = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      monthsMap.set(currentKey, monthName.charAt(0).toUpperCase() + monthName.slice(1));
    }

    return Array.from(monthsMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => b.value.localeCompare(a.value));
  }, [allHistory]);

  // Filtrado de compras por cliente y mes
  const filteredPurchasesList = React.useMemo(() => {
    return allHistory.filter((entry) => {
      if (purchasesCustomerFilter !== 'all') {
        if (entry.customerId !== purchasesCustomerFilter && entry.cardId !== purchasesCustomerFilter) {
          return false;
        }
      }

      if (purchasesMonthFilter !== 'all') {
        if (!entry.createdAt) return false;
        const date = new Date(entry.createdAt);
        if (isNaN(date.getTime())) return false;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (key !== purchasesMonthFilter) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allHistory, purchasesCustomerFilter, purchasesMonthFilter]);

  // Sumatoria total de compras seleccionadas
  const totalPurchasesSum = React.useMemo(() => {
    return filteredPurchasesList.reduce((sum, item) => sum + (Number(item.purchaseAmount) || 0), 0);
  }, [filteredPurchasesList]);

  // Promedio por compra
  const averagePurchaseAmount = React.useMemo(() => {
    return filteredPurchasesList.length > 0 ? Math.round(totalPurchasesSum / filteredPurchasesList.length) : 0;
  }, [filteredPurchasesList, totalPurchasesSum]);

  // Cliente por defecto si no hay ninguno seleccionado (Valentina Ríos o el primero de la lista)
  const activeCustomer = selectedCard || (cards.length > 0 ? cards[0] : allCards[0] || null);

  const stampSlots = activeCustomer
    ? Array.from({ length: 8 }, (_, i) => {
        const slotIndex = i + 1;
        const stampsCount = activeCustomer.stampsCount;
        const isFilled = stampsCount >= slotIndex;
        const isToday = isFilled && slotIndex === stampsCount;
        const isRewardSlot = slotIndex === 8;
        let dateLabel = '';
        if (isFilled) {
          dateLabel = activeCustomer.stampsDates?.[slotIndex] || (isToday ? '¡Hoy!' : `${slotIndex * 4} Feb`);
        } else if (isRewardSlot) {
          dateLabel = 'Premio';
        } else {
          dateLabel = `Faltan ${slotIndex - stampsCount}`;
        }
        return { index: slotIndex, isFilled, isToday, isRewardSlot, dateLabel };
      })
    : [];

  const progressPercent = activeCustomer ? Math.min(100, Math.round((activeCustomer.stampsCount / 8) * 100)) : 0;
  const stampsRemaining = activeCustomer ? Math.max(0, 8 - activeCustomer.stampsCount) : 8;

  // Filtrado específico para la pestaña de Fidelizados
  const filteredCustomersList = (cards.length > 0 ? cards : allCards).filter((c) => {
    if (customersFilter === 'near_reward') {
      return c.stampsCount >= 6;
    }
    if (customersFilter === 'gold') {
      return c.loyaltyLevel?.includes('GOLD') || c.totalCyclesCompleted >= 1;
    }
    if (customersFilter === 'retention_7d') {
      return getDaysSinceLastVisit(c).days >= 7;
    }
    return true;
  });

  // Clientes con recompensas listas o próximas a ganar
  const clientsNearReward = allCards.filter((c) => c.stampsCount >= 6);

  // Historial activo para mostrar
  const displayedHistory = historyScope === 'selected' && activeCustomer
    ? selectedCustomerHistory
    : allHistory;

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col md:flex-row">
      
      {/* =========================================================================
          BARRA DE NAVEGACIÓN MÓVIL Y MENÚ DESPLEGABLE (100% RESPONSIVE)
         ========================================================================= */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-[57px] z-20 shadow-2xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#D8470A] flex items-center justify-center cursor-pointer transition-colors"
            title="Abrir menú de navegación"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="font-display font-extrabold text-sm text-[#16191C]">
                Taju POS
              </h2>
              <span className="bg-[#FFEDE5] text-[#D8470A] text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase">
                {activeSidebarTab === 'scan' && 'Escanear'}
                {activeSidebarTab === 'analytics' && 'Estadísticas'}
                {activeSidebarTab === 'purchases' && 'Compras'}
                {activeSidebarTab === 'customers' && 'Fidelizados'}
                {activeSidebarTab === 'history' && 'Movimientos'}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-sans">
              Barra Principal Este · Bogotá
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="btn-taju-primary text-[11px] font-bold px-3 py-2 rounded-xl flex items-center space-x-1 shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Cliente</span>
          </button>
        </div>
      </div>

      {/* MENÚ DESPLEGABLE DE MÓVIL CON OVERLAY BACKDROP BLUR */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          {/* Backdrop obscuro interactivo */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Panel deslizante lateral del menú móvil */}
          <div className="relative bg-white w-4/5 max-w-xs h-full flex flex-col justify-between p-5 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              {/* Header del menú desplegable móvil */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D8470A] text-white flex items-center justify-center shadow-xs">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-extrabold text-sm text-[#16191C]">
                      Taju Coffee
                    </h2>
                    <p className="text-[10px] text-[#D8470A] font-bold uppercase tracking-wider">
                      Menú POS Móvil
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Botones de menú móvil */}
              <nav className="space-y-2">
                <button
                  onClick={() => {
                    setActiveSidebarTab('scan');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full py-3 px-3.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider flex items-center space-x-3 cursor-pointer ${
                    activeSidebarTab === 'scan'
                      ? 'btn-taju-primary shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Escanear y Sumar</span>
                </button>

                <button
                  onClick={() => {
                    setIsRegisterModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-3 px-3.5 rounded-xl text-xs font-display font-bold text-gray-700 hover:bg-gray-100 flex items-center space-x-3 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-[#D8470A]" />
                  <span>Nuevo Cliente</span>
                </button>

                {/* 3. ESTADÍSTICAS DEL NEGOCIO (RECHARTS) */}
                <button
                  onClick={() => {
                    setActiveSidebarTab('analytics');
                    loadAllHistory();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full py-3 px-3.5 rounded-xl text-xs font-display font-bold flex items-center space-x-3 cursor-pointer ${
                    activeSidebarTab === 'analytics'
                      ? 'bg-orange-50 text-[#D8470A] font-extrabold border border-orange-200/60'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <TrendingUp className={`w-4 h-4 ${activeSidebarTab === 'analytics' ? 'text-[#D8470A]' : 'text-gray-500'}`} />
                  <span>Estadísticas del Negocio</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSidebarTab('purchases');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full py-3 px-3.5 rounded-xl text-xs font-display font-bold flex items-center space-x-3 cursor-pointer ${
                    activeSidebarTab === 'purchases'
                      ? 'bg-orange-50 text-[#D8470A] font-extrabold border border-orange-200/60'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Receipt className={`w-4 h-4 ${activeSidebarTab === 'purchases' ? 'text-[#D8470A]' : 'text-gray-500'}`} />
                  <span>Historial Compras</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSidebarTab('customers');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full py-3 px-3.5 rounded-xl text-xs font-display font-bold flex items-center space-x-3 cursor-pointer ${
                    activeSidebarTab === 'customers'
                      ? 'bg-orange-50 text-[#D8470A] font-extrabold border border-orange-200/60'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Users className={`w-4 h-4 ${activeSidebarTab === 'customers' ? 'text-[#D8470A]' : 'text-gray-500'}`} />
                  <span>Fidelizados</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSidebarTab('history');
                    loadAllHistory();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full py-3 px-3.5 rounded-xl text-xs font-display font-bold flex items-center space-x-3 cursor-pointer ${
                    activeSidebarTab === 'history'
                      ? 'bg-orange-50 text-[#D8470A] font-extrabold border border-orange-200/60'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${activeSidebarTab === 'history' ? 'text-[#D8470A]' : 'text-gray-500'}`} />
                  <span>Movimientos</span>
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-600 font-bold uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>TERMINAL POS #02 EN LÍNEA</span>
              </div>
              <p className="text-[11px] font-sans font-medium text-gray-700 mt-0.5">
                Sede Chapinero · Bogotá
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR LATERAL DESKTOP (hidden md:flex) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          
          {/* Logo Taju Coffee Specialty */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-[#D8470A] text-white flex items-center justify-center shadow-sm">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-sm text-[#16191C] leading-tight">
                Taju Coffee
              </h2>
              <p className="text-[10px] text-gray-500 font-sans tracking-wide">
                Specialty Coffee
              </p>
            </div>
          </div>

          {/* Menú de Navegación Lateral */}
          <nav className="space-y-1.5">
            {/* 1. ESCANEAR Y SUMAR */}
            <button
              onClick={() => setActiveSidebarTab('scan')}
              className={`w-full py-3 px-3.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeSidebarTab === 'scan'
                  ? 'btn-taju-primary shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Escanear y Sumar</span>
            </button>

            {/* 2. NUEVO CLIENTE (Abre modal de registro inmediato) */}
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-display font-bold text-gray-700 hover:bg-gray-100 flex items-center space-x-2.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#D8470A]" />
              <span>Nuevo Cliente</span>
            </button>

            {/* 3. ESTADÍSTICAS DEL NEGOCIO (RECHARTS) */}
            <button
              onClick={() => {
                setActiveSidebarTab('analytics');
                loadAllHistory();
              }}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-display font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeSidebarTab === 'analytics'
                  ? 'bg-orange-50 text-[#D8470A] font-extrabold border border-orange-200/60'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${activeSidebarTab === 'analytics' ? 'text-[#D8470A]' : 'text-gray-500'}`} />
              <span>Estadísticas</span>
            </button>

            {/* 4. HISTORIAL COMPRAS (Reemplaza a Recompensas expresamente) */}
            <button
              onClick={() => setActiveSidebarTab('purchases')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-display font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeSidebarTab === 'purchases'
                  ? 'bg-orange-50 text-[#D8470A] font-extrabold border border-orange-200/60'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Receipt className={`w-4 h-4 ${activeSidebarTab === 'purchases' ? 'text-[#D8470A]' : 'text-gray-500'}`} />
              <span>Historial Compras</span>
            </button>

            {/* 4. FIDELIZADOS */}
            <button
              onClick={() => setActiveSidebarTab('customers')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-display font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeSidebarTab === 'customers'
                  ? 'bg-orange-50 text-[#D8470A] font-extrabold border border-orange-200/60'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className={`w-4 h-4 ${activeSidebarTab === 'customers' ? 'text-[#D8470A]' : 'text-gray-500'}`} />
              <span>Fidelizados</span>
            </button>

            {/* 5. MOVIMIENTOS */}
            <button
              onClick={() => {
                setActiveSidebarTab('history');
                loadAllHistory();
              }}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-display font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeSidebarTab === 'history'
                  ? 'bg-orange-50 text-[#D8470A] font-extrabold border border-orange-200/60'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeSidebarTab === 'history' ? 'text-[#D8470A]' : 'text-gray-500'}`} />
              <span>Movimientos</span>
            </button>
          </nav>
        </div>

        {/* Indicador inferior de Terminal */}
        <div className="pt-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80">
            <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-600 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TERMINAL TPV #02</span>
            </div>
            <p className="text-[11px] font-sans font-medium text-gray-700 mt-0.5">
              Barra Principal Este
            </p>
          </div>
        </div>
      </aside>

      {/* ÁREA CENTRAL PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-6xl space-y-5">
        
        {/* Banner de Éxito / Estado (image_cf165636.png) */}
        {!successBannerDismissed && activeCustomer && (
          <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-[#D8470A] text-white flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <p className="text-xs text-gray-800 font-sans">
                <strong className="font-bold text-[#D8470A]">¡Cliente activo: {activeCustomer.customerName} ({activeCustomer.stampsCount}/8 sellos)!</strong>
                <span className="text-gray-500 ml-1.5">· A solo {stampsRemaining} sellos de la recompensa de la casa.</span>
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-[11px] font-sans font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                Sede Chapinero
              </span>
              <button
                onClick={() => setSuccessBannerDismissed(true)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Alerta de Conflicto de Concurrencia (OCC) */}
        {concurrencyConflict?.detected && (
          <ConcurrencyAlert
            expectedVersion={concurrencyConflict.expectedVersion}
            actualVersion={concurrencyConflict.actualVersion}
            message={concurrencyConflict.message}
            onRefresh={handleRefreshSelectedCustomer}
            refreshing={refreshing}
          />
        )}

        {/* Notificaciones dinámicas de acción */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center space-x-2 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
        )}

        {actionError && !concurrencyConflict?.detected && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 1: ESCANEAR Y SUMAR (TPV POS PRINCIPAL - image_cf165636.png)
           ========================================================================= */}
        {activeSidebarTab === 'scan' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* TARJETA DE BÚSQUEDA DE CLIENTE */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="font-display font-extrabold text-xl text-[#16191C]">
                    Buscar cliente
                  </h2>
                  <p className="text-xs text-gray-500 font-sans">
                    Busca por nombre, teléfono o documento de identificación (Cédula C.C.) para asignar sellos o canjes.
                  </p>
                </div>

                <div className="inline-flex items-center space-x-1.5 text-[11px] font-sans font-medium text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
                  <Touchpad className="w-3.5 h-3.5 text-[#D8470A]" />
                  <span>Modo pantalla táctil POS activo</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Escribe: Valentina Ríos, Santiago Vélez, Cédula (ej: 1098742516) o Teléfono..."
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#D8470A] focus:bg-white rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#16191C] font-sans outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (cards.length > 0) {
                      handleSelectCustomer(cards[0]);
                    }
                  }}
                  className="w-full sm:w-auto btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </button>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    loadAllCards();
                  }}
                  className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-sans font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Nueva búsqueda</span>
                </button>

                <button
                  onClick={() => setIsQRScannerOpen(true)}
                  className="w-full sm:w-auto bg-orange-50 hover:bg-orange-100 text-[#D8470A] border border-orange-200 text-xs font-sans font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Cámara QR</span>
                </button>
              </div>

              {/* Resultados de búsqueda rápida si hay coincidencia */}
              {searchQuery && (
                <div className="mt-3 pt-3 border-t border-gray-100 max-h-52 overflow-y-auto space-y-1">
                  {cards.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 rounded-lg">
                      No se encontró ningún cliente con "<span className="font-bold">{searchQuery}</span>". 
                      <button
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="ml-2 text-[#D8470A] font-bold underline cursor-pointer"
                      >
                        ¿Deseas registrarlo ahora?
                      </button>
                    </div>
                  ) : (
                    cards.map((c) => (
                      <button
                        key={c.customerId}
                        onClick={() => {
                          handleSelectCustomer(c);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs flex justify-between items-center transition-colors cursor-pointer ${
                          activeCustomer?.customerId === c.customerId ? 'bg-orange-100/70 border border-orange-300' : 'hover:bg-orange-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#D8470A]/10 text-[#D8470A] font-bold flex items-center justify-center text-xs">
                            {c.customerName?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <span className="font-bold text-[#16191C] block">{c.customerName}</span>
                            <span className="text-[11px] text-gray-500 font-mono">
                              {c.documentNumber || 'Sin cédula'} · Tel: {c.phone || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#D8470A] block">{c.stampsCount}/8 sellos</span>
                          <span className="text-[10px] text-gray-400 font-sans">Seleccionar cliente →</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* LAYOUT PRINCIPAL DE 2 COLUMNAS (image_cf165636.png) */}
            {activeCustomer ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* COLUMNA IZQUIERDA: Tarjeta Oscura de Lujo y Botones de Acción */}
                <div className="lg:col-span-8 space-y-4">
                  <DigitalStampCard
                    card={activeCustomer}
                    stampSlots={stampSlots}
                    progressPercent={progressPercent}
                    stampsRemaining={stampsRemaining}
                    onOpenQR={() => setIsQRScannerOpen(true)}
                    showAdminInfo={true}
                  />

                  {/* BARRA DE ACCIÓN INFERIOR (image_cf165636.png) */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                      <button
                        onClick={() => setIsAddStampModalOpen(true)}
                        className="flex-1 sm:flex-none btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-5 py-3 rounded-xl shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Coffee className="w-4 h-4" />
                        <span>Agregar sello (+1)</span>
                      </button>

                      <button
                        onClick={() => handleRefreshSelectedCustomer()}
                        disabled={refreshing}
                        className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-sans font-bold px-4 py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>Sincronizar Firestore</span>
                      </button>
                    </div>

                    <div className="text-[11px] font-sans text-gray-500 flex items-center space-x-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-[#D8470A]" />
                      <span>
                        Último sello: <strong className="text-gray-800">{activeCustomer.lastStampTime || 'Hoy 10:24 AM'} ({activeCustomer.lastStampNotes || 'Americano Doble'})</strong>
                      </span>
                    </div>
                  </div>

                  {/* Historial de Sellos y Ventas del Cliente (Editable y Eliminable) */}
                  <StampHistoryTable
                    history={selectedCustomerHistory}
                    loading={historyLoading}
                    isAdmin={true}
                    onEditEntry={(entry) => setEditingStampEntry(entry)}
                    onDeleteEntry={(entry) => setEditingStampEntry(entry)}
                  />
                </div>

                {/* COLUMNA DERECHA: Perfil del Cliente & Terminal POS */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <h3 className="font-display font-bold text-sm text-[#16191C]">
                          Perfil del Cliente
                        </h3>
                      </div>
                      <span className="bg-[#FFEDE5] text-[#D8470A] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Activo
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-[10px] uppercase font-mono text-gray-400 block">
                          VISITAS TOTALES
                        </span>
                        <div className="font-display font-extrabold text-2xl text-[#16191C] mt-0.5">
                          {activeCustomer.totalVisits || 1}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          +{activeCustomer.stampsCount} este ciclo
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-[10px] uppercase font-mono text-gray-400 block">
                          CICLOS CANJEADOS
                        </span>
                        <div className="font-display font-extrabold text-2xl text-[#16191C] mt-0.5">
                          {activeCustomer.totalCyclesCompleted || 0}
                        </div>
                        <span className="text-[10px] text-gray-500 font-sans">
                          {(activeCustomer.totalCyclesCompleted || 0) * 8} sellos previos
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-mono text-gray-400 font-bold block mb-1">
                        NOTAS Y BEBIDA FAVORITA
                      </span>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs text-gray-700 font-sans">
                        {activeCustomer.favoriteDrinkNotes || 'Americano Doble con leche de avena · Sin azúcar'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-[11px] font-sans text-gray-500 space-y-1">
                        <p><strong className="text-gray-700">Documento:</strong> {activeCustomer.documentNumber || 'C.C. No registrada'}</p>
                        <p><strong className="text-gray-700">WhatsApp:</strong> {activeCustomer.phone || 'No registrado'}</p>
                        <p><strong className="text-gray-700">Código Membresía:</strong> <span className="font-mono text-[#D8470A] font-bold">{activeCustomer.memberCode || '#7821-TJ'}</span></p>
                      </div>

                      <div className="pt-2">
                        <a
                          href={getCustomerWhatsAppUrl(activeCustomer.phone, activeCustomer.customerName) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            const url = getCustomerWhatsAppUrl(activeCustomer.phone, activeCustomer.customerName);
                            if (!url) {
                              e.preventDefault();
                              alert(`El cliente "${activeCustomer.customerName}" no tiene un número telefónico válido registrado en Firestore.`);
                            }
                          }}
                          className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white" />
                          <span>Contactar por WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta Información de Terminal POS */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#D8470A] flex-shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-gray-400 block">
                          TERMINAL TAJU POS #02
                        </span>
                        <h4 className="font-bold text-xs text-[#16191C] mt-0.5">
                          Sede Chapinero (Cra 7 #54-20)
                        </h4>
                        <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                          Turno Activo: Barista #04 Carlos Mendoza
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-display font-bold text-base text-gray-700">No hay cliente seleccionado</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Utiliza la barra de búsqueda superior para encontrar un cliente o haz clic en "Nuevo Cliente" para registrarlo.
                </p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            PESTAÑA: ESTADÍSTICAS DEL NEGOCIO (RECHARTS - SELLOS Y CLIENTES ACTIVOS)
           ========================================================================= */}
        {activeSidebarTab === 'analytics' && (
          <BusinessAnalyticsView
            allCards={allCards}
            allHistory={allHistory}
            loading={allHistoryLoading || loading}
            onRefresh={() => {
              loadAllCards();
              loadAllHistory();
            }}
          />
        )}

        {/* =========================================================================
            PESTAÑA 2: FIDELIZADOS (DIRECTORIO DE CLIENTES - image_0dccfca8.png)
           ========================================================================= */}
        {activeSidebarTab === 'customers' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header del Directorio */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <h2 className="font-display font-extrabold text-xl text-[#16191C]">
                    Clientes Fidelizados
                  </h2>
                  <span className="bg-[#FFEDE5] text-[#D8470A] text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                    {allCards.length} {allCards.length === 1 ? 'cliente' : 'clientes'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-sans mt-1">
                  Directorio sincronizado directamente con Firebase Firestore (Single Source of Truth).
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="btn-taju-primary text-xs font-display font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Nuevo Cliente</span>
                </button>

                <button
                  onClick={() => loadAllCards()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refrescar</span>
                </button>
              </div>
            </div>

            {/* Filtros rápidos y buscador */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, cédula o tel..."
                  className="w-full bg-gray-50 border border-gray-200 focus:border-[#D8470A] focus:bg-white rounded-xl pl-9 pr-8 py-2 text-xs text-[#16191C] font-sans outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botones de filtro de estado */}
              <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setCustomersFilter('all')}
                  className={`text-xs font-sans font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    customersFilter === 'all'
                      ? 'bg-[#16191C] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos ({allCards.length})
                </button>

                <button
                  onClick={() => setCustomersFilter('near_reward')}
                  className={`text-xs font-sans font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    customersFilter === 'near_reward'
                      ? 'bg-[#D8470A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Cerca de premio (6-7 sellos)
                </button>

                <button
                  onClick={() => setCustomersFilter('gold')}
                  className={`text-xs font-sans font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    customersFilter === 'gold'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Nivel Gold
                </button>

                {/* Filtro de Retención (+7 días sin compras) */}
                <button
                  onClick={() => setCustomersFilter('retention_7d')}
                  className={`text-xs font-sans font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    customersFilter === 'retention_7d'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/80'
                  }`}
                  title="Clientes con 7 o más días sin registrar sellos o visitas"
                >
                  <span>⚠️ Inactivos (+7 días)</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    customersFilter === 'retention_7d' ? 'bg-red-700 text-white' : 'bg-red-200 text-red-800'
                  }`}>
                    {allCards.filter((c) => getDaysSinceLastVisit(c).days >= 7).length}
                  </span>
                </button>
              </div>
            </div>

            {/* TABLA PRINCIPAL DE CLIENTES FIDELIZADOS */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-display uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Cliente / Titular</th>
                      <th className="py-3 px-4">Documento (C.C.)</th>
                      <th className="py-3 px-4">WhatsApp / Teléfono</th>
                      <th className="py-3 px-4">Última Visita / Inactividad</th>
                      <th className="py-3 px-4">Nivel & Sede</th>
                      <th className="py-3 px-4">Progreso de Sellos</th>
                      <th className="py-3 px-4">Ciclos / Canjes</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                    {filteredCustomersList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="font-bold text-gray-600">No se encontraron clientes</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Prueba con otro término de búsqueda o cambia los filtros de retención.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCustomersList.map((customer) => {
                        const pct = Math.min(100, Math.round((customer.stampsCount / 8) * 100));
                        const isSelected = activeCustomer?.customerId === customer.customerId;
                        const visitInfo = getDaysSinceLastVisit(customer);
                        const whatsAppUrl = getCustomerWhatsAppUrl(customer.phone, customer.customerName);

                        return (
                          <tr
                            key={customer.customerId}
                            className={`hover:bg-orange-50/40 transition-colors ${isSelected ? 'bg-orange-50/70' : ''}`}
                          >
                            {/* Nombre y Avatar */}
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-[#D8470A] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                  {customer.customerName?.charAt(0) || 'C'}
                                </div>
                                <div>
                                  <span className="font-bold text-sm text-[#16191C] block">
                                    {customer.customerName}
                                  </span>
                                  <span className="text-[11px] text-gray-400 font-mono">
                                    {customer.customerEmail}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Cédula */}
                            <td className="py-3 px-4 font-mono font-medium text-gray-700">
                              {customer.documentNumber || 'CC •••• 7821'}
                            </td>

                            {/* Teléfono */}
                            <td className="py-3 px-4 font-mono text-gray-600">
                              <span className="inline-flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>{customer.phone || '+57 312 ••• 9021'}</span>
                              </span>
                            </td>

                            {/* Días transcurridos desde el último sello (Retención 7 días) */}
                            <td className="py-3 px-4">
                              {visitInfo.isOverdue ? (
                                <span className="inline-flex items-center space-x-1 bg-red-100 text-red-700 font-bold text-[10px] px-2.5 py-1 rounded-full border border-red-300 animate-pulse">
                                  <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
                                  <span>{visitInfo.label} (⚠️ +7d)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-gray-700 font-medium text-[11px] bg-gray-100 px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <span>{visitInfo.label}</span>
                                </span>
                              )}
                              <span className="block text-[10px] text-gray-400 mt-0.5">
                                {customer.lastStampNotes || 'Visita café'}
                              </span>
                            </td>

                            {/* Nivel */}
                            <td className="py-3 px-4">
                              <span className="inline-block bg-[#FFEDE5] text-[#D8470A] font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                                {customer.loyaltyLevel || 'NIVEL GOLD'}
                              </span>
                              <span className="block text-[10px] text-gray-400 mt-0.5">
                                {customer.branch || 'Sede Chapinero'}
                              </span>
                            </td>

                            {/* Progreso de sellos visual */}
                            <td className="py-3 px-4 min-w-[150px]">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-bold text-[#D8470A]">
                                  {customer.stampsCount} de 8 sellos
                                </span>
                                <span className="font-mono text-gray-400">{pct}%</span>
                              </div>
                              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#D8470A] h-full rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>

                            {/* Ciclos completados */}
                            <td className="py-3 px-4 font-mono text-center">
                              <span className="font-bold text-sm text-[#16191C]">
                                {customer.totalCyclesCompleted || 0}
                              </span>
                              <span className="block text-[10px] text-gray-400">
                                canjes previos
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {/* Botón Enviar WhatsApp con texto predeterminado de retención */}
                                <a
                                  href={whatsAppUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!whatsAppUrl) {
                                      e.preventDefault();
                                      alert(`El cliente "${customer.customerName}" no tiene un número telefónico válido registrado en Firestore. Por favor edita sus datos para agregar su WhatsApp.`);
                                    }
                                  }}
                                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-all shadow-2xs ${
                                    whatsAppUrl
                                      ? 'bg-[#25D366] hover:bg-[#20ba59] text-white cursor-pointer active:scale-95'
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                                  }`}
                                  title={whatsAppUrl ? `Enviar mensaje de WhatsApp a ${customer.customerName}` : 'Sin teléfono registrado'}
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                  <span>Enviar WhatsApp</span>
                                </a>

                                <button
                                  onClick={() => {
                                    handleSelectCustomer(customer);
                                    setActiveSidebarTab('scan');
                                  }}
                                  className="btn-taju-primary text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-2xs flex items-center space-x-1 cursor-pointer"
                                  title="Seleccionar en caja POS"
                                >
                                  <span>Caja POS</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>

                                <button
                                  onClick={() => {
                                    handleSelectCustomer(customer);
                                    setIsAddStampModalOpen(true);
                                  }}
                                  className="bg-orange-100 hover:bg-orange-200 text-[#D8470A] font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Agregar un sello de compra"
                                >
                                  +1 Sello
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingCustomer(customer);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-[#D8470A] hover:bg-orange-50 transition-colors cursor-pointer"
                                  title="Editar cliente"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setDeletingCustomer(customer);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Eliminar cliente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 3: HISTORIAL DE COMPRAS POR CLIENTE (REEMPLAZA A RECOMPENSAS)
           ========================================================================= */}
        {activeSidebarTab === 'purchases' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Header del Historial de Compras */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#16191C]">
                    Historial de Compras por Cliente
                  </h2>
                </div>
                <p className="text-xs text-gray-500 font-sans mt-1">
                  Consulta el desglose de consumos, montos por fecha y sumatorias totales en caja.
                </p>
              </div>

              {/* Filtros de Cliente y Mes */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Selector / Buscador en Vivo de Cliente (Nombre y Cédula) */}
                <div className="relative w-full sm:w-72">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customerSearchInput}
                      onFocus={() => setIsCustomerSearchOpen(true)}
                      onChange={(e) => {
                        setCustomerSearchInput(e.target.value);
                        setIsCustomerSearchOpen(true);
                        if (!e.target.value.trim()) {
                          setPurchasesCustomerFilter('all');
                        }
                      }}
                      placeholder="Buscar por correo, nombre o cédula..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-8 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] focus:bg-white transition-colors"
                    />
                    {customerSearchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchInput('');
                          setPurchasesCustomerFilter('all');
                          setIsCustomerSearchOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Menú Flotante de Coincidencias en Vivo */}
                  {isCustomerSearchOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsCustomerSearchOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto animate-in fade-in duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setPurchasesCustomerFilter('all');
                            setCustomerSearchInput('');
                            setIsCustomerSearchOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs font-sans border-b border-gray-100 flex items-center justify-between hover:bg-orange-50/60 cursor-pointer ${
                            purchasesCustomerFilter === 'all' ? 'bg-orange-50 font-bold text-[#D8470A]' : 'text-gray-700'
                          }`}
                        >
                          <span>👥 Todos los Clientes</span>
                          <span className="text-[10px] font-mono text-gray-400">({allCards.length})</span>
                        </button>

                        {searchedCustomersList.length === 0 ? (
                          <div className="p-3 text-center text-xs text-gray-400 font-sans">
                            No se encontraron clientes para "{customerSearchInput}"
                          </div>
                        ) : (
                          searchedCustomersList.map((c) => {
                            const isSelected = purchasesCustomerFilter === c.customerId;
                            return (
                              <button
                                key={c.customerId}
                                type="button"
                                onClick={() => {
                                  setPurchasesCustomerFilter(c.customerId);
                                  setCustomerSearchInput(`${c.customerName} (${c.customerEmail || c.documentNumber || 'Cliente'})`);
                                  setIsCustomerSearchOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 text-xs font-sans border-b border-gray-100 flex items-center justify-between hover:bg-orange-50/70 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-orange-50 font-bold text-[#D8470A]' : 'text-gray-800'
                                }`}
                              >
                                <div className="truncate pr-2 space-y-0.5">
                                  <span className="font-bold block truncate text-xs text-[#16191C]">
                                    {c.customerName}
                                  </span>
                                  <span className="text-[11px] text-[#D8470A] font-sans font-medium block truncate">
                                    📧 {c.customerEmail || 'Sin correo registrado'}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-mono block">
                                    📄 Cédula: <strong>{c.documentNumber || 'No registrada (Registro vía Google/Email)'}</strong>
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 flex-shrink-0 self-start mt-0.5">
                                  {c.stampsCount}/8 sellos
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Selector de Mes */}
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={purchasesMonthFilter}
                    onChange={(e) => setPurchasesMonthFilter(e.target.value)}
                    className="w-full sm:w-48 bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-sans text-[#16191C] outline-none focus:border-[#D8470A] cursor-pointer"
                  >
                    <option value="all">📅 Todos los Meses</option>
                    {availableMonths.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botón para Vaciar Historial Registrado */}
                {allHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de que deseas eliminar TODOS los movimientos e historial de compras registrados en el sistema? Esta acción dejará las compras en $0 para una producción limpia.')) {
                        clearAllHistory();
                      }
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1"
                    title="Eliminar todos los movimientos registrados"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Vaciar Historial</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cards de Métricas & Sumatoria Total Prominente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Card 1: SUMATORIA TOTAL EXPRESAMENTE REQUERIDA */}
              <div className="bg-gradient-to-br from-[#1E2024] to-[#141619] rounded-2xl p-4 text-white border border-amber-900/40 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#D8470A]/20 rounded-full blur-xl" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
                  💰 SUMATORIA TOTAL DE COMPRAS
                </span>
                <div className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                  {formatCurrency(totalPurchasesSum)}
                </div>
                <span className="text-[10px] text-gray-400 font-sans mt-1 block">
                  Monto total acumulado según los filtros activos
                </span>
              </div>

              {/* Card 2: Total Transacciones */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  🧾 TRANSACCIONES REGISTRADAS
                </span>
                <div className="font-display font-extrabold text-2xl sm:text-3xl text-[#16191C]">
                  {filteredPurchasesList.length}
                </div>
                <span className="text-[10px] text-gray-500 font-sans mt-1 block">
                  Compras en el periodo seleccionado
                </span>
              </div>

              {/* Card 3: Promedio por Compra */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  📊 COMPRA PROMEDIO (TICKET)
                </span>
                <div className="font-display font-extrabold text-2xl sm:text-3xl text-[#D8470A]">
                  {formatCurrency(averagePurchaseAmount)}
                </div>
                <span className="text-[10px] text-gray-500 font-sans mt-1 block">
                  Promedio por consumo en caja
                </span>
              </div>
            </div>

            {/* Tabla de Historial de Compras con Sumatoria Final */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-[#D8470A]" />
                  <h3 className="font-display font-bold text-sm text-[#16191C]">
                    Detalle de Compras y Consumos por Cliente
                  </h3>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {filteredPurchasesList.length} registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-display uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">Cliente / Titular</th>
                      <th className="py-3 px-4">Detalle / Producto</th>
                      <th className="py-3 px-4 text-right">Monto Comprado ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                    {filteredPurchasesList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400">
                          <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="font-bold text-gray-600">No hay compras registradas para este filtro</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Prueba seleccionando otro cliente o mes.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPurchasesList.map((entry) => (
                        <tr key={entry.id} className="hover:bg-orange-50/30 transition-colors">
                          {/* Fecha */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {(() => {
                              const dt = formatDateTime(entry.createdAt);
                              return (
                                <span className="font-mono text-gray-700 font-medium block">
                                  {dt.date} · <span className="text-gray-400">{dt.time}</span>
                                </span>
                              );
                            })()}
                          </td>

                          {/* Cliente */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#D8470A]/10 text-[#D8470A] font-bold flex items-center justify-center text-xs">
                                {entry.customerName?.charAt(0) || 'C'}
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 block">{entry.customerName}</span>
                              </div>
                            </div>
                          </td>

                          {/* Detalle */}
                          <td className="py-3 px-4 text-gray-600 font-sans">
                            {entry.notes || 'Consumo en caja POS'}
                          </td>

                          {/* Monto Comprado */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-sm text-[#16191C]">
                            {formatCurrency(entry.purchaseAmount || 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* FILA DE SUMATORIA FINAL EXPRESAMENTE REQUERIDA */}
                  {filteredPurchasesList.length > 0 && (
                    <tfoot className="bg-amber-50/80 border-t-2 border-amber-300 font-sans">
                      <tr>
                        <td colSpan={3} className="py-3.5 px-4 text-right font-display font-extrabold uppercase text-xs tracking-wider text-amber-950">
                          SUMATORIA TOTAL COMPRAS:
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-base text-[#D8470A]">
                          {formatCurrency(totalPurchasesSum)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 4: MOVIMIENTOS (AUDITORÍA COMPLETA - image_0dccfca8.png)
           ========================================================================= */}
        {activeSidebarTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header de Auditoría */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h2 className="font-display font-extrabold text-xl text-[#16191C]">
                    Registro y Auditoría de Movimientos POS
                  </h2>
                </div>
                <p className="text-xs text-gray-500 font-sans mt-1">
                  Historial de sellos otorgados con monto de compra exacto (mínimo $15.000 COP), fecha y hora.
                </p>
              </div>

              {/* Selector de Ámbito: Todos vs Cliente Activo */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setHistoryScope('all')}
                  className={`text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                    historyScope === 'all'
                      ? 'bg-[#16191C] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Toda la Sede ({allHistory.length})
                </button>

                {activeCustomer && (
                  <button
                    onClick={() => setHistoryScope('selected')}
                    className={`text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                      historyScope === 'selected'
                        ? 'btn-taju-primary'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Solo {activeCustomer.customerName}
                  </button>
                )}

                <button
                  onClick={() => loadAllHistory()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${allHistoryLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* TABLA DE MOVIMIENTOS */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden p-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 font-display uppercase tracking-wider text-[10px] border-b border-gray-200">
                      <th className="py-2.5 px-3"># Sello</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Monto Compra</th>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Ciclo</th>
                      <th className="py-2.5 px-3">Detalle / Notas</th>
                      <th className="py-2.5 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                    {displayedHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-gray-400">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="font-bold">No hay transacciones registradas todavía</p>
                          <p className="text-[11px] mt-0.5">Asigna el primer sello desde el Punto de Venta.</p>
                        </td>
                      </tr>
                    ) : (
                      displayedHistory.map((entry) => {
                        const { date, time } = formatDateTime(entry.createdAt);
                        return (
                          <tr key={entry.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#D8470A]">
                              <span className="inline-block bg-orange-100 text-[#D8470A] px-2 py-0.5 rounded text-[11px]">
                                Sello #{entry.stampNumber}
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="font-bold text-[#16191C] block">
                                {entry.customerName || 'Cliente Taju'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                Barista: {entry.adminEmail ? entry.adminEmail.split('@')[0] : 'Carlos Mendoza'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 font-mono font-bold text-sm text-[#16191C]">
                              {formatCurrency(entry.purchaseAmount)}
                            </td>

                            <td className="py-2.5 px-3 text-gray-700">
                              <span className="font-medium block">{date}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{time}</span>
                            </td>

                            <td className="py-2.5 px-3 font-mono text-gray-600">
                              Ciclo #{entry.cycleNumber}
                            </td>

                            <td className="py-2.5 px-3 text-gray-600">
                              {entry.notes || 'Compra café especial'}
                            </td>

                            <td className="py-2.5 px-3">
                              {entry.rewardGranted ? (
                                <span className="inline-flex items-center space-x-1 bg-[#D8470A] text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  <Gift className="w-3 h-3" />
                                  <span>¡Premio Ganado!</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-emerald-600 font-mono text-[11px] font-medium">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Acreditado</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modales */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={handleQRCodeScanned}
        knownCustomerIds={allCards.map((c) => ({ id: c.customerId, name: c.customerName }))}
      />

      <AddStampModal
        isOpen={isAddStampModalOpen}
        onClose={() => setIsAddStampModalOpen(false)}
        card={activeCustomer}
        onConfirm={(amount, notes) => handleAddStamp(amount, notes, activeCustomer)}
        submitting={actionSubmitting}
      />

      <RegisterCustomerModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegister={async (payload) => {
          await handleRegisterNewCustomer(payload);
          setActiveSidebarTab('scan');
        }}
        submitting={actionSubmitting}
      />

      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onSave={handleUpdateCustomer}
      />

      <DeleteCustomerModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingCustomer(null);
        }}
        customer={deletingCustomer}
        onConfirmDelete={handleDeleteCustomer}
      />

      <RewardCelebrationModal
        isOpen={Boolean(rewardCelebrationResult)}
        onClose={() => setRewardCelebrationResult(null)}
        customerName={activeCustomer?.customerName}
        totalCycles={rewardCelebrationResult?.totalCyclesCompleted ?? 1}
      />

      <EditDeleteStampModal
        isOpen={Boolean(editingStampEntry)}
        onClose={() => setEditingStampEntry(null)}
        entry={editingStampEntry}
        onUpdate={handleUpdateStampHistory}
        onDelete={handleDeleteStampHistory}
        submitting={actionSubmitting}
      />
    </div>
  );
};
