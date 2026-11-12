/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Controlador de Tarjeta de Cliente - Taju Coffee House
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  LoyaltyCard,
  MAX_STAMPS_PER_CYCLE,
  StampSlot,
} from '../models/LoyaltyCard';
import { StampHistoryEntry } from '../models/StampHistory';
import {
  fetchCardFromServer,
  fetchCustomerHistory,
} from '../services/loyaltyService';
import { handleFirestoreError, OperationType } from '../services/errorService';

export function useCustomerCardController(customerId?: string) {
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [history, setHistory] = useState<StampHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);

  const prevCyclesRef = useRef<number | null>(null);

  const loadFreshData = useCallback(async (isManualRefresh = false) => {
    if (!customerId) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const freshCard = await fetchCardFromServer(customerId);
      setCard(freshCard);

      const freshHistory = await fetchCustomerHistory(customerId);
      setHistory(freshHistory);

      if (freshCard) {
        if (prevCyclesRef.current !== null && freshCard.totalCyclesCompleted > prevCyclesRef.current) {
          setShowRewardModal(true);
        }
        prevCyclesRef.current = freshCard.totalCyclesCompleted;
      }
    } catch (err: any) {
      console.error('[useCustomerCardController] Error cargando datos del servidor:', err);
      setError('No se pudo sincronizar la tarjeta con Firebase. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadFreshData(false);
  }, [loadFreshData]);

  // Auto-sync on window focus and periodic interval (every 3 seconds) for instant updates without manual refresh
  useEffect(() => {
    if (!customerId) return;

    const handleFocus = () => {
      loadFreshData(false);
    };
    window.addEventListener('focus', handleFocus);

    const intervalId = setInterval(() => {
      loadFreshData(false);
    }, 3000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [customerId, loadFreshData]);

  // Suscripción reactiva en tiempo real a la tarjeta del cliente
  useEffect(() => {
    if (!customerId) return;

    const cardRef = doc(db, 'loyaltyCards', customerId);
    const unsubscribeCard = onSnapshot(
      cardRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const updatedCard: LoyaltyCard = {
            id: snapshot.id,
            customerId: data.customerId || snapshot.id,
            customerEmail: data.customerEmail || '',
            customerName: data.customerName || 'Valentina Ríos',
            documentNumber: data.documentNumber || 'CC •••• 7821',
            phone: data.phone || '+57 312 ••• 9021',
            branch: data.branch || 'Sede Chapinero',
            memberCode: data.memberCode || `#${snapshot.id.slice(0, 4).toUpperCase()}-TJ`,
            memberSince: data.memberSince || 'Mar 2023',
            loyaltyLevel: data.loyaltyLevel || 'NIVEL GOLD',
            stampsCount: typeof data.stampsCount === 'number' ? data.stampsCount : 0,
            totalCyclesCompleted: typeof data.totalCyclesCompleted === 'number' ? data.totalCyclesCompleted : 0,
            totalVisits: typeof data.totalVisits === 'number' ? data.totalVisits : 1,
            favoriteDrinkNotes: data.favoriteDrinkNotes,
            lastStampNotes: data.lastStampNotes || 'Americano Doble',
            lastStampTime: data.lastStampTime || 'Hoy 10:24 AM',
            stampsDates: data.stampsDates || {
              1: '12 Feb',
              2: '18 Feb',
              3: '24 Feb',
              4: '01 Mar',
              5: 'Hoy',
            },
            version: typeof data.version === 'number' ? data.version : 1,
            updatedAt: data.updatedAt || new Date().toISOString(),
            createdAt: data.createdAt || new Date().toISOString(),
          };

          setCard(updatedCard);

          if (prevCyclesRef.current !== null && updatedCard.totalCyclesCompleted > prevCyclesRef.current) {
            setShowRewardModal(true);
          }
          prevCyclesRef.current = updatedCard.totalCyclesCompleted;
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `loyaltyCards/${customerId}`);
      }
    );

    // Suscripción reactiva en tiempo real al historial de compras/sellos del cliente (refresco instantáneo en milisegundos)
    const historyColRef = collection(db, 'stampHistory');
    const q = query(historyColRef, where('customerId', '==', customerId));
    const unsubscribeHistory = onSnapshot(
      q,
      (snapshot) => {
        const liveHistory: StampHistoryEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          liveHistory.push({
            id: docSnap.id,
            cardId: data.cardId || customerId,
            customerId: data.customerId || customerId,
            customerName: data.customerName,
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
        liveHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setHistory(liveHistory);
      },
      (err) => {
        console.warn('[useCustomerCardController] Error en snapshot de historial:', err);
      }
    );

    return () => {
      unsubscribeCard();
      unsubscribeHistory();
    };
  }, [customerId]);

  /**
   * Generación precisa de los 8 slots según el diseño de Taju Coffee House
   */
  const stampSlots: StampSlot[] = Array.from({ length: MAX_STAMPS_PER_CYCLE }, (_, i) => {
    const slotIndex = i + 1;
    const stampsCount = card ? card.stampsCount : 0;
    const isFilled = stampsCount >= slotIndex;
    const isToday = isFilled && slotIndex === stampsCount;
    const isRewardSlot = slotIndex === MAX_STAMPS_PER_CYCLE;

    let dateLabel = '';
    if (isFilled) {
      if (card?.stampsDates && card.stampsDates[slotIndex]) {
        dateLabel = card.stampsDates[slotIndex];
      } else if (isToday) {
        dateLabel = '¡Hoy!';
      } else {
        dateLabel = `${slotIndex * 4} Feb`;
      }
    } else if (isRewardSlot) {
      dateLabel = 'Premio';
    } else {
      const remainingToSlot = slotIndex - stampsCount;
      dateLabel = `Faltan ${remainingToSlot}`;
    }

    return {
      index: slotIndex,
      isFilled,
      isToday,
      isRewardSlot,
      dateLabel,
    };
  });

  const progressPercent = card ? Math.min(100, Math.round((card.stampsCount / MAX_STAMPS_PER_CYCLE) * 100)) : 0;
  const stampsRemaining = card ? Math.max(0, MAX_STAMPS_PER_CYCLE - card.stampsCount) : MAX_STAMPS_PER_CYCLE;

  return {
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
    refreshFromServer: () => loadFreshData(true),
  };
}
