/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Controlador del Panel de Administrador (MVC Controller: useAdminController)
 * 
 * Gestiona:
 * - Listado y filtrado de clientes y tarjetas de fidelización.
 * - Selección de cliente vía escaneo de QR o búsqueda manual.
 * - Asignación de sellos con validación de compra mínima ($15.000).
 * - Control de Concurrencia Optimista (OCC) y prevención estricta de sobrescritura de datos obsoletos.
 * - Registro de nuevos clientes desde el panel administrativo.
 */

import { useState, useEffect, useCallback } from 'react';
import { LoyaltyCard, MINIMUM_PURCHASE_AMOUNT } from '../models/LoyaltyCard';
import { StampHistoryEntry } from '../models/StampHistory';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  fetchAllLoyaltyCards,
  fetchCardFromServer,
  fetchCustomerHistory,
  fetchAllHistory,
  addStampWithTransaction,
  AddStampResult,
  updateCustomerLoyaltyCard,
  deleteCustomerLoyaltyCard,
  updateStampHistoryEntry,
  deleteStampHistoryEntry,
  registerCardInMemory,
  clearAllStampHistory,
} from '../services/loyaltyService';
import { registerCustomer, initializeLoyaltyCardForCustomer } from '../services/authService';
import { ConcurrencyConflictError } from '../services/errorService';
import { parseScannedQRCode } from '../services/qrService';
import { UserProfile } from '../models/User';
import { updateOneSignalLastPurchaseTag } from '../services/oneSignalService';

export function useAdminController(adminUser: UserProfile | null) {
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cliente seleccionado actualmente
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<StampHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [allHistory, setAllHistory] = useState<StampHistoryEntry[]>([]);
  const [allHistoryLoading, setAllHistoryLoading] = useState(false);

  // Estados de modales
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isAddStampModalOpen, setIsAddStampModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [rewardCelebrationResult, setRewardCelebrationResult] = useState<AddStampResult | null>(null);

  // Modales de Edición y Eliminación de Clientes
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<LoyaltyCard | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<LoyaltyCard | null>(null);

  // Estado de error y conflicto de concurrencia (OCC)
  const [concurrencyConflict, setConcurrencyConflict] = useState<{
    detected: boolean;
    expectedVersion: number;
    actualVersion: number;
    message: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  /**
   * Carga la lista completa de tarjetas directamente del servidor Firestore
   */
  const loadAllCards = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setActionError(null);

    try {
      const freshCards = await fetchAllLoyaltyCards();
      setCards(freshCards);
    } catch (err: any) {
      console.error('[useAdminController] Error cargando tarjetas:', err);
      setActionError('Error al obtener la lista de clientes desde el servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Suscripción en Tiempo Real (Realtime Live Sync) a la colección de tarjetas
  useEffect(() => {
    const cardsCol = collection(db, 'loyaltyCards');
    const unsubscribe = onSnapshot(
      cardsCol,
      (snapshot) => {
        const liveCards: LoyaltyCard[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const card: LoyaltyCard = {
            id: docSnap.id,
            customerId: data.customerId || docSnap.id,
            customerEmail: data.customerEmail || '',
            customerName: data.customerName || 'Cliente Taju',
            documentNumber: data.documentNumber || '',
            phone: data.phone || '',
            branch: data.branch || 'Sede Chapinero (Cra 7 #54-20)',
            memberCode: data.memberCode || `#${docSnap.id.slice(0, 4).toUpperCase()}-TJ`,
            memberSince: data.memberSince || 'Mar 2023',
            loyaltyLevel: data.loyaltyLevel || 'NIVEL GOLD',
            stampsCount: typeof data.stampsCount === 'number' ? data.stampsCount : 0,
            totalCyclesCompleted: typeof data.totalCyclesCompleted === 'number' ? data.totalCyclesCompleted : 0,
            totalVisits: typeof data.totalVisits === 'number' ? data.totalVisits : 1,
            favoriteDrinkNotes: data.favoriteDrinkNotes,
            lastStampNotes: data.lastStampNotes || 'Americano Doble',
            lastStampTime: data.lastStampTime || 'Hoy 10:24 AM',
            lastPurchaseDate: data.lastPurchaseDate,
            stampsDates: data.stampsDates || { 1: '12 Feb', 2: '18 Feb', 3: '24 Feb', 4: '01 Mar', 5: 'Hoy' },
            version: typeof data.version === 'number' ? data.version : 1,
            updatedAt: data.updatedAt || new Date().toISOString(),
            createdAt: data.createdAt || new Date().toISOString(),
          };
          registerCardInMemory(card);
          liveCards.push(card);
        });
        setCards(liveCards.sort((a, b) => a.customerName.localeCompare(b.customerName)));
        setLoading(false);
      },
      (err) => {
        console.warn('[useAdminController] Realtime sync error on cards, fallback to fetch:', err);
        loadAllCards(false);
      }
    );

    return () => unsubscribe();
  }, [loadAllCards]);

  // Auto-sync on window focus and periodic interval (every 3 seconds) for instant admin views updates without manual refresh
  useEffect(() => {
    const handleFocus = () => {
      loadAllCards(false);
    };
    window.addEventListener('focus', handleFocus);

    const intervalId = setInterval(() => {
      loadAllCards(false);
    }, 3000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [loadAllCards]);

  // Suscripción en Tiempo Real (Realtime Live Sync) a todo el historial de compras
  useEffect(() => {
    const historyCol = collection(db, 'stampHistory');
    const unsubscribe = onSnapshot(
      historyCol,
      (snapshot) => {
        const liveHistory: StampHistoryEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          liveHistory.push({
            id: docSnap.id,
            cardId: data.cardId || '',
            customerId: data.customerId || '',
            customerName: data.customerName || 'Cliente Taju',
            adminId: data.adminId || '',
            adminEmail: data.adminEmail || '',
            purchaseAmount: Number(data.purchaseAmount) || 0,
            stampNumber: Number(data.stampNumber) || 1,
            cycleNumber: Number(data.cycleNumber) || 1,
            rewardGranted: Boolean(data.rewardGranted),
            createdAt: data.createdAt || new Date().toISOString(),
            notes: data.notes || '',
          });
        });
        liveHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllHistory(liveHistory);
      },
      (err) => {
        console.warn('[useAdminController] Realtime sync error on stampHistory:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Suscripción en Tiempo Real al historial de compras/sellos del cliente seleccionado
  useEffect(() => {
    if (!selectedCard?.customerId) {
      setSelectedCustomerHistory([]);
      return;
    }

    const historyColRef = collection(db, 'stampHistory');
    const q = query(historyColRef, where('customerId', '==', selectedCard.customerId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const history: StampHistoryEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          history.push({
            id: docSnap.id,
            cardId: data.cardId || selectedCard.customerId,
            customerId: data.customerId || selectedCard.customerId,
            customerName: data.customerName || selectedCard.customerName,
            adminId: data.adminId || '',
            adminEmail: data.adminEmail || '',
            purchaseAmount: Number(data.purchaseAmount) || 0,
            stampNumber: Number(data.stampNumber) || 1,
            cycleNumber: Number(data.cycleNumber) || 1,
            rewardGranted: Boolean(data.rewardGranted),
            createdAt: data.createdAt || new Date().toISOString(),
            notes: data.notes,
          });
        });
        history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSelectedCustomerHistory(history);
        setHistoryLoading(false);
      },
      (err) => {
        console.warn('[useAdminController] Error en snapshot de historial del cliente:', err);
        setHistoryLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedCard?.customerId]);

  /**
   * Selecciona un cliente y carga su historial y tarjeta más recientes desde el servidor
   */
  const handleSelectCustomer = useCallback(async (card: LoyaltyCard) => {
    setSelectedCard(card);
    setConcurrencyConflict(null);
    setActionError(null);
    setHistoryLoading(true);

    try {
      // Garantizar que la versión del cliente sea la más reciente del servidor (Single Source of Truth)
      const fresh = await fetchCardFromServer(card.customerId);
      if (fresh) {
        setSelectedCard(fresh);
      }
      const history = await fetchCustomerHistory(card.customerId);
      setSelectedCustomerHistory(history);
    } catch (err: any) {
      console.error('Error cargando historial de cliente:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  /**
   * Refresca forzosamente la tarjeta del cliente seleccionado desde Firestore
   * Limpia cualquier bandera de conflicto de concurrencia y sincroniza la versión local con el servidor
   */
  const handleRefreshSelectedCustomer = useCallback(async () => {
    if (!selectedCard) return;
    setRefreshing(true);
    setConcurrencyConflict(null);
    setActionError(null);

    try {
      const fresh = await fetchCardFromServer(selectedCard.customerId);
      if (fresh) {
        setSelectedCard(fresh);
        // Actualizar también en la lista general en memoria
        setCards((prev) => prev.map((c) => (c.customerId === fresh.customerId ? fresh : c)));
      }
      const history = await fetchCustomerHistory(selectedCard.customerId);
      setSelectedCustomerHistory(history);
      setActionSuccess('Datos sincronizados con éxito desde el servidor Firestore.');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError('No se pudo refrescar el cliente desde el servidor.');
    } finally {
      setRefreshing(false);
    }
  }, [selectedCard]);

  /**
   * Procesa el código QR escaneado y selecciona al cliente
   */
  const handleQRCodeScanned = useCallback(async (scannedText: string) => {
    setIsQRScannerOpen(false);
    const parsed = parseScannedQRCode(scannedText);
    
    if (!parsed.isValid) {
      setActionError('El código QR escaneado no es un identificador válido de Vanguard Club.');
      return;
    }

    try {
      setLoading(true);
      const fresh = await fetchCardFromServer(parsed.customerId);
      if (fresh) {
        await handleSelectCustomer(fresh);
        setIsAddStampModalOpen(true); // Abrir directamente el modal para agregar sello
      } else {
        setActionError(`No se encontró ninguna tarjeta activa para el cliente con ID: ${parsed.customerId}`);
      }
    } catch (err) {
      setActionError('Error buscando tarjeta del cliente escaneado.');
    } finally {
      setLoading(false);
    }
  }, [handleSelectCustomer]);

  /**
   * Asignar un nuevo sello al cliente seleccionado con validación de concurrencia optimista (OCC)
   * y verificación estricta de monto mínimo ($15.000).
   */
  const handleAddStamp = useCallback(
    async (purchaseAmount: number, notes?: string, targetCard?: LoyaltyCard | null) => {
      const activeCard = targetCard || selectedCard || cards[0];
      if (!activeCard) {
        setActionError('No hay ningún cliente seleccionado. Registra o selecciona un cliente para otorgar sellos.');
        return;
      }

      const admin = adminUser || {
        uid: 'taju-admin-caja',
        email: 'cajataju@taju.co',
        displayName: 'Administrador Taju',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };

      if (purchaseAmount < MINIMUM_PURCHASE_AMOUNT) {
        setActionError(`El monto debe ser de al menos $${MINIMUM_PURCHASE_AMOUNT.toLocaleString('es-CO')}.`);
        return;
      }

      setActionSubmitting(true);
      setActionError(null);
      setConcurrencyConflict(null);

      try {
        // Ejecución de la transacción con verificación de versión (OCC)
        const result = await addStampWithTransaction(
          activeCard.customerId,
          activeCard.version || 1,
          purchaseAmount,
          { uid: admin.uid, email: admin.email },
          notes
        );

        // Si se completaron 8 sellos, preparar modal de felicitaciones/premio
        if (result.rewardUnlocked) {
          setRewardCelebrationResult(result);
        }

        setActionSuccess(
          result.rewardUnlocked
            ? `¡8 Sellos alcanzados para ${activeCard.customerName}! Ha ganado su premio y la tarjeta se reinició a 0.`
            : `Sello #${result.newStampsCount} asignado exitosamente a ${activeCard.customerName} por compra de $${purchaseAmount.toLocaleString('es-CO')}.`
        );

        // Cerrar modal de asignación
        setIsAddStampModalOpen(false);

        // =========================================================================
        // INTEGRACIÓN ONESIGNAL - Retención Automática (7 días):
        // Cada vez que el admin asigna un sello, actualizamos la etiqueta de OneSignal:
        // OneSignal.User.addTag("fecha_ultima_compra", "<fecha_actual>")
        // (Permite que la campaña automatizada en OneSignal envíe push a los 7 días)
        // =========================================================================
        const todayDateTag = new Date().toISOString().split('T')[0];
        updateOneSignalLastPurchaseTag(activeCard.customerId, todayDateTag);

        // Actualizar el cliente seleccionado activo
        setSelectedCard((prev) => {
          const base = prev || activeCard;
          return {
            ...base,
            stampsCount: result.newStampsCount,
            totalCyclesCompleted: result.totalCyclesCompleted,
            version: result.newVersion,
          };
        });

        setTimeout(() => setActionSuccess(null), 5000);
        return result;
      } catch (err: any) {
        console.error('[useAdminController] Error al agregar sello:', err);

      // Detección estricta de Conflicto de Concurrencia (OCC)
      if (err instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({
          detected: true,
          expectedVersion: err.expectedVersion,
          actualVersion: err.actualVersion,
          message: err.message,
        });
        setActionError(
          'CONFLICTO DE CONCURRENCIA: La tarjeta fue modificada en otro dispositivo o sesión mientras la tenías abierta. Se impidió la sobrescritura de datos obsoletos. Haz clic en "Refrescar datos del servidor" antes de continuar.'
        );
      } else {
        setActionError(err.message || 'Error inesperado al registrar el sello.');
      }
      throw err;
    } finally {
      setActionSubmitting(false);
    }
  }, [selectedCard, adminUser, handleRefreshSelectedCustomer, loadAllCards]);

  /**
   * Registrar un nuevo cliente desde el panel de administración
   */
  /**
   * Carga todo el historial de movimientos de la sede
   */
  const loadAllHistory = useCallback(async () => {
    setAllHistoryLoading(true);
    try {
      const history = await fetchAllHistory();
      setAllHistory(history);
    } catch (err) {
      console.error('[useAdminController] Error cargando historial general:', err);
    } finally {
      setAllHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllHistory();
  }, [loadAllHistory]);

  /**
   * Registrar un nuevo cliente desde el panel de administración
   */
  const handleRegisterNewCustomer = useCallback(async (
    payload: {
      email: string;
      name: string;
      password?: string;
      documentType?: string;
      documentNumber?: string;
      phone?: string;
      birthdayDay?: string | number;
      birthdayMonth?: string;
      grantWelcomeStamp?: boolean;
    }
  ) => {
    setActionSubmitting(true);
    setActionError(null);

    try {
      const newProfile = await registerCustomer(payload);
      
      setActionSuccess(`¡Cliente ${payload.name} emitido con éxito en Taju Coffee!`);
      setIsRegisterModalOpen(false);
      
      // Consultar tarjeta recién creada
      const freshCard = await fetchCardFromServer(newProfile.uid);
      if (freshCard) {
        setCards((prev) => {
          const exists = prev.some((c) => c.customerId === freshCard.customerId);
          return exists ? prev.map((c) => (c.customerId === freshCard.customerId ? freshCard : c)) : [freshCard, ...prev];
        });
      }

      // Recargar lista completa de tarjetas desde Firestore
      await loadAllCards(true);
      await loadAllHistory();

      setTimeout(() => setActionSuccess(null), 4000);
      return newProfile;
    } catch (err: any) {
      setActionError(err.message || 'Error al registrar nuevo cliente.');
      throw err;
    } finally {
      setActionSubmitting(false);
    }
  }, [loadAllCards, loadAllHistory]);

  /**
   * Actualizar datos de un cliente fidelizado
   */
  const handleUpdateCustomer = useCallback(async (
    customerId: string,
    updatedData: Partial<LoyaltyCard>
  ) => {
    setActionSubmitting(true);
    setActionError(null);

    try {
      const updatedCard = await updateCustomerLoyaltyCard(customerId, updatedData);
      
      setActionSuccess(`¡Cliente "${updatedCard.customerName}" actualizado correctamente!`);
      
      // Si el cliente editado es el seleccionado actualmente, actualizarlo
      if (selectedCard?.customerId === customerId) {
        setSelectedCard(updatedCard);
      }

      await loadAllCards(true);

      setTimeout(() => setActionSuccess(null), 4000);
      return updatedCard;
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar cliente.');
      throw err;
    } finally {
      setActionSubmitting(false);
    }
  }, [selectedCard, loadAllCards]);

  /**
   * Actualizar un registro de historial (venta o sello) de un cliente
   */
  const handleUpdateStampHistory = useCallback(async (
    historyEntryId: string,
    updatedData: { purchaseAmount: number; notes?: string }
  ) => {
    setActionSubmitting(true);
    setActionError(null);

    try {
      await updateStampHistoryEntry(historyEntryId, updatedData);
      setActionSuccess('¡Registro de venta actualizado correctamente!');

      if (selectedCard) {
        const history = await fetchCustomerHistory(selectedCard.customerId);
        setSelectedCustomerHistory(history);
      }
      await loadAllHistory();

      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar el registro de venta.');
      throw err;
    } finally {
      setActionSubmitting(false);
    }
  }, [selectedCard, loadAllHistory]);

  /**
   * Eliminar un registro de historial específico (sello/venta) y ajustar la tarjeta del cliente
   */
  const handleDeleteStampHistory = useCallback(async (historyEntryId: string) => {
    setActionSubmitting(true);
    setActionError(null);

    try {
      await deleteStampHistoryEntry(historyEntryId);
      setActionSuccess('¡Sello y registro de venta eliminados correctamente!');

      if (selectedCard) {
        const freshCard = await fetchCardFromServer(selectedCard.customerId);
        if (freshCard) setSelectedCard(freshCard);
        const history = await fetchCustomerHistory(selectedCard.customerId);
        setSelectedCustomerHistory(history);
      }

      await loadAllCards(true);
      await loadAllHistory();

      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Error al eliminar el registro.');
      throw err;
    } finally {
      setActionSubmitting(false);
    }
  }, [selectedCard, loadAllCards, loadAllHistory]);

  /**
   * Eliminar un cliente fidelizado de Firestore y memoria.
   * Permite opcionalmente eliminar todo su historial de compras/movimientos.
   */
  const handleDeleteCustomer = useCallback(async (customerId: string, deleteHistory = false) => {
    setActionSubmitting(true);
    setActionError(null);

    try {
      await deleteCustomerLoyaltyCard(customerId, deleteHistory);
      
      setActionSuccess('Cliente eliminado exitosamente.');

      if (selectedCard?.customerId === customerId) {
        setSelectedCard(null);
      }

      await loadAllCards(true);
      await loadAllHistory();

      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Error al eliminar cliente.');
      throw err;
    } finally {
      setActionSubmitting(false);
    }
  }, [selectedCard, loadAllCards, loadAllHistory]);

  /**
   * Borra todos los movimientos e historial de compras registrados en la base de datos
   */
  const handleClearAllHistory = useCallback(async () => {
    setActionSubmitting(true);
    setActionError(null);
    try {
      await clearAllStampHistory();
      setAllHistory([]);
      setActionSuccess('Historial de movimientos e historial de compras vaciado completamente.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Error al limpiar el historial.');
    } finally {
      setActionSubmitting(false);
    }
  }, []);

  // Filtrar tarjetas según búsqueda (soporta nombre, email, id, documento con/sin formato, teléfono, código de miembro)
  const filteredCards = cards.filter((card) => {
    const rawQ = searchQuery.toLowerCase().trim();
    if (!rawQ) return true;

    // 1. Coincidencia normal de texto
    const textMatches =
      (card.customerName && card.customerName.toLowerCase().includes(rawQ)) ||
      (card.customerEmail && card.customerEmail.toLowerCase().includes(rawQ)) ||
      (card.customerId && card.customerId.toLowerCase().includes(rawQ)) ||
      (card.documentNumber && card.documentNumber.toLowerCase().includes(rawQ)) ||
      (card.phone && card.phone.toLowerCase().includes(rawQ)) ||
      (card.memberCode && card.memberCode.toLowerCase().includes(rawQ));

    if (textMatches) return true;

    // 2. Coincidencia por dígitos puros (ej: si el usuario tipea '1098742516' o '3184029911')
    const digitsQ = rawQ.replace(/\D/g, '');
    if (digitsQ.length >= 3) {
      const cleanDoc = (card.documentNumber || '').replace(/\D/g, '');
      const cleanPhone = (card.phone || '').replace(/\D/g, '');
      const cleanId = (card.customerId || '').replace(/\D/g, '');
      const cleanCode = (card.memberCode || '').replace(/\D/g, '');

      if (
        cleanDoc.includes(digitsQ) ||
        cleanPhone.includes(digitsQ) ||
        cleanId.includes(digitsQ) ||
        cleanCode.includes(digitsQ)
      ) {
        return true;
      }
    }

    return false;
  });

  return {
    cards: filteredCards,
    allCards: cards,
    totalCardsCount: cards.length,
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
    // Concurrencia y Acciones
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
    clearAllHistory: handleClearAllHistory,
    loadAllCards: () => loadAllCards(true),
  };
}
