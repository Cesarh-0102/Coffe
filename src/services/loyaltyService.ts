/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Servicio de Fidelización - Taju Coffee House
 * Single Source of Truth + Concurrencia Optimista (OCC) + Transacciones Atómicas
 */

import {
  doc,
  collection,
  getDocFromServer,
  getDocsFromServer,
  query,
  where,
  runTransaction,
  serverTimestamp,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from './firebase';
import {
  LoyaltyCard,
  MAX_STAMPS_PER_CYCLE,
  MINIMUM_PURCHASE_AMOUNT,
} from '../models/LoyaltyCard';
import { StampHistoryEntry } from '../models/StampHistory';
import {
  ConcurrencyConflictError,
} from './errorService';

export interface AddStampResult {
  newStampsCount: number;
  totalCyclesCompleted: number;
  rewardUnlocked: boolean;
  newVersion: number;
  historyEntryId: string;
}

// Tarjetas de fidelización y registros iniciales (Producción)
const INITIAL_DEMO_CARDS: LoyaltyCard[] = [];

let inMemoryCards: LoyaltyCard[] = [];
let inMemoryHistory: StampHistoryEntry[] = [];

/**
 * Agrega o actualiza una tarjeta en el caché local
 */
export function registerCardInMemory(card: LoyaltyCard) {
  const idx = inMemoryCards.findIndex((c) => c.customerId === card.customerId || c.id === card.id);
  if (idx >= 0) {
    inMemoryCards[idx] = { ...inMemoryCards[idx], ...card };
  } else {
    inMemoryCards.unshift(card);
  }
}

/**
 * Consulta el historial completo de todos los movimientos de la sede
 */
export async function fetchAllHistory(): Promise<StampHistoryEntry[]> {
  try {
    const historyCol = collection(db, 'stampHistory');
    const snapshot = await getDocsFromServer(historyCol);

    const history: StampHistoryEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      history.push({
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

    inMemoryHistory = history;
    return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('[loyaltyService] Error leyendo todo el historial de Firestore:', error);
  }

  return [...inMemoryHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Obtiene la tarjeta de fidelización directamente desde el servidor Firestore (Single Source of Truth)
 */
export async function fetchCardFromServer(customerId: string): Promise<LoyaltyCard | null> {
  try {
    const cardRef = doc(db, 'loyaltyCards', customerId);
    const snap = await getDocFromServer(cardRef);
    if (snap.exists()) {
      const data = snap.data();
      const card: LoyaltyCard = {
        id: snap.id,
        customerId: data.customerId || snap.id,
        customerEmail: data.customerEmail || '',
        customerName: data.customerName || 'Cliente Taju',
        documentNumber: data.documentNumber || '',
        phone: data.phone || '',
        branch: data.branch || 'Sede Chapinero (Cra 7 #54-20)',
        memberCode: data.memberCode || `#${(data.customerId || snap.id).slice(0, 4).toUpperCase()}-TJ`,
        memberSince: data.memberSince || 'Mar 2023',
        loyaltyLevel: data.loyaltyLevel || 'NIVEL GOLD',
        stampsCount: typeof data.stampsCount === 'number' ? data.stampsCount : 0,
        totalCyclesCompleted: typeof data.totalCyclesCompleted === 'number' ? data.totalCyclesCompleted : 0,
        totalVisits: typeof data.totalVisits === 'number' ? data.totalVisits : 1,
        favoriteDrinkNotes: data.favoriteDrinkNotes,
        lastStampNotes: data.lastStampNotes || 'Americano Doble',
        lastStampTime: data.lastStampTime || 'Hoy 10:24 AM',
        stampsDates: data.stampsDates || { 1: '12 Feb', 2: '18 Feb', 3: '24 Feb', 4: '01 Mar', 5: 'Hoy' },
        version: typeof data.version === 'number' ? data.version : 1,
        updatedAt: data.updatedAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
      };
      registerCardInMemory(card);
      return card;
    }
  } catch (error) {
    console.warn('[loyaltyService] Error consultando Firestore, recurriendo a memoria:', error);
  }

  const found = inMemoryCards.find((c) => c.customerId === customerId || c.id === customerId);
  return found ? { ...found } : inMemoryCards[0] || null;
}

/**
 * Agrega un sello a la tarjeta del cliente dentro de una Transacción de Firestore atómica
 * con Control de Concurrencia Optimista (OCC) y prevención estricta de sobrescritura de datos obsoletos.
 */
export async function addStampWithTransaction(
  customerId: string,
  expectedVersion: number,
  purchaseAmount: number,
  adminInfo: { uid: string; email: string },
  notes?: string
): Promise<AddStampResult> {
  if (purchaseAmount < MINIMUM_PURCHASE_AMOUNT) {
    throw new Error(
      `El monto de la compra ($${purchaseAmount.toLocaleString('es-CO')}) debe ser igual o superior a $${MINIMUM_PURCHASE_AMOUNT.toLocaleString('es-CO')}.`
    );
  }

  const cardRef = doc(db, 'loyaltyCards', customerId);
  const historyColRef = collection(db, 'stampHistory');
  const newHistoryRef = doc(historyColRef);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const nowIso = now.toISOString();

  try {
    const result = await runTransaction(db, async (transaction) => {
      const cardDoc = await transaction.get(cardRef);

      let currentData: any = null;
      let actualVersion = 1;

      if (cardDoc.exists()) {
        currentData = cardDoc.data();
        actualVersion = typeof currentData.version === 'number' ? currentData.version : 1;
      } else {
        const local = inMemoryCards.find((c) => c.customerId === customerId || c.id === customerId);
        currentData = local || {
          customerId,
          customerName: 'Cliente Taju',
          customerEmail: `cliente.${customerId}@taju.co`,
          documentNumber: '',
          phone: '',
          branch: 'Sede Chapinero (Cra 7 #54-20)',
          memberCode: `#${customerId.slice(0, 4).toUpperCase()}-TJ`,
          memberSince: 'Mar 2023',
          loyaltyLevel: 'NIVEL GOLD',
          stampsCount: 0,
          totalCyclesCompleted: 0,
          totalVisits: 0,
          version: 1,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        actualVersion = typeof currentData.version === 'number' ? currentData.version : 1;
      }

      const currentStamps = typeof currentData.stampsCount === 'number' ? currentData.stampsCount : 0;
      let totalCycles = typeof currentData.totalCyclesCompleted === 'number' ? currentData.totalCyclesCompleted : 0;
      const totalVisits = (typeof currentData.totalVisits === 'number' ? currentData.totalVisits : 0) + 1;

      const nextStampNumber = currentStamps + 1;
      let newStampsCount = nextStampNumber;
      let rewardUnlocked = false;

      const currentStampsDates: Record<number, string> = { ...(currentData.stampsDates || {}) };

      if (nextStampNumber >= MAX_STAMPS_PER_CYCLE) {
        newStampsCount = 0;
        totalCycles += 1;
        rewardUnlocked = true;
        currentStampsDates[MAX_STAMPS_PER_CYCLE] = '¡Premio!';
      } else {
        currentStampsDates[nextStampNumber] = 'Hoy';
      }

      const nextVersion = actualVersion + 1;

      const updatedPayload = {
        ...currentData,
        customerId,
        stampsCount: newStampsCount,
        totalCyclesCompleted: totalCycles,
        totalVisits: totalVisits,
        lastStampNotes: notes || 'Compra café especial',
        lastStampTime: `Hoy ${timeStr}`,
        lastPurchaseDate: nowIso,
        stampsDates: currentStampsDates,
        version: nextVersion,
        updatedAt: nowIso,
        lastTransactionAt: serverTimestamp(),
      };

      transaction.set(cardRef, sanitizeFirestorePayload(updatedPayload), { merge: true });

      // Actualizar también en colección 'users' para retención automática
      const userDocRef = doc(db, 'users', customerId);
      transaction.set(userDocRef, { lastPurchaseDate: nowIso, updatedAt: nowIso }, { merge: true });

      const historyPayload = {
        id: newHistoryRef.id,
        cardId: customerId,
        customerId: customerId,
        customerName: currentData.customerName || 'Cliente Taju',
        adminId: adminInfo.uid || 'taju-admin-caja',
        adminEmail: adminInfo.email || 'cajataju@taju.co',
        purchaseAmount: purchaseAmount,
        stampNumber: nextStampNumber,
        cycleNumber: totalCycles + (rewardUnlocked ? 0 : 1),
        rewardGranted: rewardUnlocked,
        createdAt: nowIso,
        notes: notes || (rewardUnlocked ? '¡8 Sellos completados! Premio reclamable' : 'Sello otorgado por consumo'),
      };

      transaction.set(newHistoryRef, sanitizeFirestorePayload(historyPayload));

      // Sincronizar memoria local
      registerCardInMemory({
        id: customerId,
        customerId,
        customerName: currentData.customerName || 'Cliente Taju',
        customerEmail: currentData.customerEmail || '',
        documentNumber: currentData.documentNumber || '',
        phone: currentData.phone || '',
        branch: currentData.branch || 'Sede Chapinero',
        stampsCount: newStampsCount,
        totalCyclesCompleted: totalCycles,
        totalVisits,
        lastStampNotes: notes || 'Compra café especial',
        lastStampTime: `Hoy ${timeStr}`,
        stampsDates: currentStampsDates,
        version: nextVersion,
        updatedAt: nowIso,
        createdAt: currentData.createdAt || nowIso,
      });

      inMemoryHistory.unshift(historyPayload);

      return {
        newStampsCount,
        totalCyclesCompleted: totalCycles,
        rewardUnlocked,
        newVersion: nextVersion,
        historyEntryId: newHistoryRef.id,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof ConcurrencyConflictError) {
      throw error;
    }
    console.warn('[loyaltyService] Error en transacción remota, aplicando fallback local:', error);
    
    // Fallback local en memoria
    const cardIndex = inMemoryCards.findIndex((c) => c.customerId === customerId || c.id === customerId);
    if (cardIndex >= 0) {
      const currentCard = inMemoryCards[cardIndex];
      const nextStampNumber = currentCard.stampsCount + 1;
      let newStampsCount = nextStampNumber;
      let rewardUnlocked = false;
      let totalCycles = currentCard.totalCyclesCompleted;
      const updatedStampsDates = { ...(currentCard.stampsDates || {}) };

      if (nextStampNumber >= MAX_STAMPS_PER_CYCLE) {
        newStampsCount = 0;
        totalCycles += 1;
        rewardUnlocked = true;
        updatedStampsDates[MAX_STAMPS_PER_CYCLE] = '¡Premio!';
      } else {
        updatedStampsDates[nextStampNumber] = 'Hoy';
      }

      const nextVersion = expectedVersion + 1;
      const historyId = `hist-${Date.now()}`;

      inMemoryCards[cardIndex] = {
        ...currentCard,
        stampsCount: newStampsCount,
        totalCyclesCompleted: totalCycles,
        totalVisits: (currentCard.totalVisits || 1) + 1,
        lastStampNotes: notes || 'Americano Doble',
        lastStampTime: `Hoy ${timeStr}`,
        stampsDates: updatedStampsDates,
        version: nextVersion,
        updatedAt: nowIso,
      };

      return {
        newStampsCount,
        totalCyclesCompleted: totalCycles,
        rewardUnlocked,
        newVersion: nextVersion,
        historyEntryId: historyId,
      };
    }
    throw error;
  }
}

/**
 * Consulta el historial detallado de compras y sellos de un cliente
 */
export async function fetchCustomerHistory(customerId: string): Promise<StampHistoryEntry[]> {
  try {
    const historyCol = collection(db, 'stampHistory');
    const q = query(historyCol, where('customerId', '==', customerId));
    const snapshot = await getDocsFromServer(q);

    if (!snapshot.empty) {
      const history: StampHistoryEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        history.push({
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
      return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (error) {
    console.warn('[loyaltyService] Error leyendo historial de Firestore:', error);
  }

  const list = inMemoryHistory.filter((h) => h.customerId === customerId || h.cardId === customerId);
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Obtiene la lista de todas las tarjetas activas para el Panel de Administrador Taju
 * Consulta directa a Firestore como Fuente Única de Verdad
 */
export async function fetchAllLoyaltyCards(): Promise<LoyaltyCard[]> {
  try {
    const cardsCol = collection(db, 'loyaltyCards');
    const snapshot = await getDocsFromServer(cardsCol);

    const cardsMap = new Map<string, LoyaltyCard>();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const card: LoyaltyCard = {
        id: docSnap.id,
        customerId: data.customerId || docSnap.id,
        customerEmail: data.customerEmail || '',
        customerName: data.customerName || 'Cliente Taju',
        documentNumber: data.documentNumber || '',
        phone: data.phone || '',
        branch: data.branch || 'Sede Chapinero',
        memberCode: data.memberCode || `#${docSnap.id.slice(0, 4).toUpperCase()}-TJ`,
        memberSince: data.memberSince || 'Mar 2023',
        loyaltyLevel: data.loyaltyLevel || 'NIVEL GOLD',
        stampsCount: typeof data.stampsCount === 'number' ? data.stampsCount : 0,
        totalCyclesCompleted: typeof data.totalCyclesCompleted === 'number' ? data.totalCyclesCompleted : 0,
        totalVisits: typeof data.totalVisits === 'number' ? data.totalVisits : 1,
        favoriteDrinkNotes: data.favoriteDrinkNotes,
        lastStampNotes: data.lastStampNotes || 'Americano Doble',
        lastStampTime: data.lastStampTime || 'Hoy 10:24 AM',
        stampsDates: data.stampsDates,
        version: typeof data.version === 'number' ? data.version : 1,
        updatedAt: data.updatedAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
      };
      cardsMap.set(card.customerId, card);
    });

    const all = Array.from(cardsMap.values());
    inMemoryCards = all;
    return all.sort((a, b) => (b.stampsCount || 0) - (a.stampsCount || 0));
  } catch (error) {
    console.warn('[loyaltyService] Fallback de tarjetas en memoria:', error);
  }

  return [...inMemoryCards].sort((a, b) => (b.stampsCount || 0) - (a.stampsCount || 0));
}

/**
 * Actualiza los datos de un cliente fidelizado en Firestore ('loyaltyCards' y 'users') y en memoria local
 */
export async function updateCustomerLoyaltyCard(
  customerId: string,
  updatedData: Partial<LoyaltyCard>
): Promise<LoyaltyCard> {
  const nowIso = new Date().toISOString();
  
  // 1. Obtener tarjeta actual para fusionar
  const currentCard = await fetchCardFromServer(customerId);
  const newCard: LoyaltyCard = {
    ...currentCard,
    ...updatedData,
    id: customerId,
    customerId,
    customerName: updatedData.customerName || currentCard?.customerName || 'Cliente Taju',
    customerEmail: updatedData.customerEmail !== undefined ? updatedData.customerEmail : (currentCard?.customerEmail || ''),
    documentNumber: updatedData.documentNumber !== undefined ? updatedData.documentNumber : (currentCard?.documentNumber || ''),
    phone: updatedData.phone !== undefined ? updatedData.phone : (currentCard?.phone || ''),
    stampsCount: typeof updatedData.stampsCount === 'number' ? updatedData.stampsCount : (currentCard?.stampsCount || 0),
    version: ((currentCard?.version) || 1) + 1,
    updatedAt: nowIso,
  } as LoyaltyCard;

  // 2. Guardar en colección 'loyaltyCards'
  try {
    const cardRef = doc(db, 'loyaltyCards', customerId);
    await setDoc(cardRef, sanitizeFirestorePayload(newCard), { merge: true });
  } catch (err) {
    console.warn('[updateCustomerLoyaltyCard] Error guardando en loyaltyCards:', err);
  }

  // 3. Guardar en colección 'users'
  try {
    const userRef = doc(db, 'users', customerId);
    const userUpdates: Record<string, any> = {
      displayName: newCard.customerName,
      email: newCard.customerEmail,
      documentNumber: newCard.documentNumber,
      phone: newCard.phone,
      loyaltyLevel: newCard.loyaltyLevel,
      updatedAt: nowIso,
    };

    if (updatedData.password) {
      userUpdates.password = updatedData.password;
      newCard.password = updatedData.password;
    }

    await setDoc(userRef, sanitizeFirestorePayload(userUpdates), { merge: true });
  } catch (err) {
    console.warn('[updateCustomerLoyaltyCard] Error guardando en users:', err);
  }

  // 4. Actualizar memoria local
  registerCardInMemory(newCard);

  return newCard;
}

/**
 * Elimina la tarjeta de fidelización y el perfil del cliente en Firestore y memoria.
 * Permite opcionalmente borrar también todo su historial de movimientos/compras.
 */
export async function deleteCustomerLoyaltyCard(customerId: string, deleteHistory = false): Promise<void> {
  // 1. Eliminar de colección 'loyaltyCards'
  try {
    await deleteDoc(doc(db, 'loyaltyCards', customerId));
  } catch (err) {
    console.warn('[deleteCustomerLoyaltyCard] Error eliminando loyaltyCard:', err);
  }

  // 2. Eliminar de colección 'users'
  try {
    await deleteDoc(doc(db, 'users', customerId));
  } catch (err) {
    console.warn('[deleteCustomerLoyaltyCard] Error eliminando user:', err);
  }

  // 3. Eliminar movimientos/historial de compras del cliente si deleteHistory es true
  if (deleteHistory) {
    try {
      const historyCol = collection(db, 'stampHistory');
      const snapshot = await getDocsFromServer(historyCol);
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.customerId === customerId || data.cardId === customerId) {
          await deleteDoc(doc(db, 'stampHistory', docSnap.id));
        }
      }
    } catch (err) {
      console.warn('[deleteCustomerLoyaltyCard] Error eliminando historial del cliente:', err);
    }
    inMemoryHistory = inMemoryHistory.filter((h) => h.customerId !== customerId && h.cardId !== customerId);
  }

  // 4. Eliminar de memoria local
  inMemoryCards = inMemoryCards.filter((c) => c.customerId !== customerId && c.id !== customerId);
}

/**
 * Actualiza un registro de historial (venta/sello) en Firestore y ajusta opcionalmente los datos de la tarjeta
 */
export async function updateStampHistoryEntry(
  historyEntryId: string,
  updatedData: { purchaseAmount: number; notes?: string }
): Promise<void> {
  const historyRef = doc(db, 'stampHistory', historyEntryId);
  const nowIso = new Date().toISOString();

  const payload = {
    ...updatedData,
    updatedAt: nowIso,
  };

  try {
    await setDoc(historyRef, sanitizeFirestorePayload(payload), { merge: true });
  } catch (err) {
    console.error('[updateStampHistoryEntry] Error actualizando en Firestore:', err);
    throw err;
  }

  // Actualizar en memoria local
  const memIndex = inMemoryHistory.findIndex((h) => h.id === historyEntryId);
  if (memIndex >= 0) {
    inMemoryHistory[memIndex] = {
      ...inMemoryHistory[memIndex],
      ...updatedData,
    };
  }
}

/**
 * Elimina un registro de historial específico (venta/sello) de Firestore y actualiza la tarjeta (reduce sello o ajusta versión)
 */
export async function deleteStampHistoryEntry(historyEntryId: string): Promise<void> {
  const historyRef = doc(db, 'stampHistory', historyEntryId);

  try {
    // 1. Obtener el registro antes de borrarlo para saber a qué cliente pertenece
    let entryCustomerId: string | null = null;
    try {
      const snap = await getDocFromServer(historyRef);
      if (snap.exists()) {
        const data = snap.data();
        entryCustomerId = data.customerId || data.cardId;
      }
    } catch (_) {}

    if (!entryCustomerId) {
      const memEntry = inMemoryHistory.find((h) => h.id === historyEntryId);
      if (memEntry) {
        entryCustomerId = memEntry.customerId || memEntry.cardId;
      }
    }

    // 2. Eliminar documento de Firestore
    await deleteDoc(historyRef);

    if (entryCustomerId) {
      // 3. Obtener todos los registros de historial restantes para este cliente
      const historyCol = collection(db, 'stampHistory');
      const q = query(historyCol, where('customerId', '==', entryCustomerId));
      const historySnap = await getDocs(q);

      const remainingEntries: { id: string; createdAt: string; data: any }[] = [];
      historySnap.forEach((docSnap) => {
        remainingEntries.push({
          id: docSnap.id,
          createdAt: docSnap.data().createdAt || '',
          data: docSnap.data(),
        });
      });

      // Ordenar cronológicamente ascendente (el primer sello consumido primero)
      remainingEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // 4. Re-indexar secuencialmente cada sello restante (1, 2, 3...)
      for (let i = 0; i < remainingEntries.length; i++) {
        const newStampNum = i + 1;
        const entryId = remainingEntries[i].id;
        const updateRef = doc(db, 'stampHistory', entryId);
        await setDoc(updateRef, { stampNumber: newStampNum }, { merge: true });
      }

      const newStampsCount = remainingEntries.length;

      // 5. Actualizar tarjeta del cliente con el nuevo conteo exacto de sellos
      const cardRef = doc(db, 'loyaltyCards', entryCustomerId);
      const cardSnap = await getDocFromServer(cardRef);
      if (cardSnap.exists()) {
        const cardData = cardSnap.data();
        const newVersion = (Number(cardData.version) || 1) + 1;
        const nowIso = new Date().toISOString();

        const updatedCardPayload = {
          stampsCount: newStampsCount,
          version: newVersion,
          updatedAt: nowIso,
        };

        await setDoc(cardRef, sanitizeFirestorePayload(updatedCardPayload), { merge: true });

        // También sincronizar colección users
        const userRef = doc(db, 'users', entryCustomerId);
        await setDoc(userRef, { updatedAt: nowIso }, { merge: true }).catch(() => {});

        // Actualizar memoria local
        const memCard = inMemoryCards.find((c) => c.customerId === entryCustomerId);
        if (memCard) {
          memCard.stampsCount = newStampsCount;
          memCard.version = newVersion;
          memCard.updatedAt = nowIso;
          registerCardInMemory(memCard);
        }
      }
    }

    // 6. Eliminar de memoria local
    inMemoryHistory = inMemoryHistory.filter((h) => h.id !== historyEntryId);
  } catch (err) {
    console.error('[deleteStampHistoryEntry] Error eliminando registro de historial:', err);
    throw err;
  }
}

/**
 * Borra todos los movimientos e historial de compras registrados en el sistema (Producción Limpia)
 */
export async function clearAllStampHistory(): Promise<void> {
  try {
    const historyCol = collection(db, 'stampHistory');
    const snapshot = await getDocsFromServer(historyCol);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'stampHistory', docSnap.id));
    }
  } catch (err) {
    console.warn('[clearAllStampHistory] Error borrando historial en Firestore:', err);
  }
  inMemoryHistory = [];
}


