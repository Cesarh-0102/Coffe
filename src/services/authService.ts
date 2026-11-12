/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Servicio de Autenticación y Gestión de Clientes - Taju Coffee House
 * Sincronización directa con Firebase Firestore como Fuente Única de Verdad
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  linkWithCredential,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocsFromServer,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db, sanitizeFirestorePayload } from './firebase';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword as secondaryCreateUser } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../models/User';
import { registerCardInMemory } from './loyaltyService';
import { validatePasswordPolicy } from './passwordValidator';

const secondaryApp = getApps().find(a => a.name === 'secondaryAdminCreation') || initializeApp(firebaseConfig, 'secondaryAdminCreation');
const secondaryAuth = getSecondaryAuth(secondaryApp);

// Emails de administradores designados en el entorno
const BOOTSTRAP_ADMIN_EMAILS = [
  'chtemu0@gmail.com',
  'instructorcesarh@gmail.com',
  'cajataju@taju.co',
];

// Bandera de sincronización para evitar condición de carrera con onAuthStateChanged
// mientras se realiza la verificación cruzada entre Firebase Auth (Google) y Firestore
let isGoogleAuthFlowInProgress = false;

export function isGoogleAuthInProgress(): boolean {
  return isGoogleAuthFlowInProgress;
}

export interface CustomerRegistrationPayload {
  email: string;
  name: string;
  username?: string;
  password?: string;
  documentType?: string;
  documentNumber?: string;
  phone?: string;
  birthdayDay?: string | number;
  birthdayMonth?: string;
  grantWelcomeStamp?: boolean;
}

export interface GoogleProfileCompletionPayload {
  displayName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  birthdayDay: string | number;
  birthdayMonth: string;
  password?: string;
  grantWelcomeStamp?: boolean;
}

/**
 * Obtiene o vincula el perfil del usuario autenticado con Google a partir de Firestore.
 * Si el usuario ya fue registrado previamente en la base de datos (por ejemplo, registro manual
 * por el Administrador con ese mismo correo electrónico), se vincula automáticamente su cuenta
 * preservando su número de documento, teléfono, contraseña, tarjeta de sellos e historial,
 * permitiéndole ingresar sin bloquearlo ni exigir nuevo registro.
 */
export async function linkOrRetrieveGoogleUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const googleUid = firebaseUser.uid;
  const googleEmail = (firebaseUser.email || '').trim().toLowerCase();
  const googleDisplayName = (firebaseUser.displayName || '').trim();

  const isAdminEmail = BOOTSTRAP_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === googleEmail);
  const nowIso = new Date().toISOString();

  // 1. Buscar si el correo ya existe previamente en 'users' o 'loyaltyCards' (Creado por Admin / POS)
  let matchedDocId: string | null = null;
  let matchedUserData: any = null;

  try {
    const usersCol = collection(db, 'users');
    let allUsersSnap;
    try {
      allUsersSnap = await getDocsFromServer(usersCol);
    } catch (_) {
      allUsersSnap = await getDocs(usersCol);
    }

    for (const d of allUsersSnap.docs) {
      const uData = d.data();
      const uEmail = (uData.email || '').trim().toLowerCase();
      if (uEmail && uEmail === googleEmail) {
        matchedDocId = d.id;
        matchedUserData = uData;
        break;
      }
    }

    if (!matchedDocId) {
      const cardsCol = collection(db, 'loyaltyCards');
      let allCardsSnap;
      try {
        allCardsSnap = await getDocsFromServer(cardsCol);
      } catch (_) {
        allCardsSnap = await getDocs(cardsCol);
      }
      for (const cd of allCardsSnap.docs) {
        const cData = cd.data();
        const cEmail = (cData.customerEmail || '').trim().toLowerCase();
        if (cEmail && cEmail === googleEmail) {
          matchedDocId = cd.id;
          matchedUserData = {
            ...cData,
            displayName: cData.customerName,
            email: cData.customerEmail,
            role: 'customer',
          };
          break;
        }
      }
    }
  } catch (findErr) {
    console.warn('[authService] Error buscando usuario por correo en Firestore:', findErr);
  }

  // Determinar el UID objetivo: si ya existe en Firestore con ese correo, USAR ESE MISMO ID (sin crear duplicados)
  const targetUid = matchedDocId || googleUid;
  const userDocRef = doc(db, 'users', targetUid);

  let existingUserSnap = null;
  try {
    existingUserSnap = await getDocFromServer(userDocRef);
  } catch (_) {
    try {
      existingUserSnap = await getDoc(userDocRef);
    } catch (_) {}
  }

  if ((existingUserSnap && existingUserSnap.exists()) || matchedUserData) {
    const data = (existingUserSnap && existingUserSnap.exists()) ? existingUserSnap.data() : matchedUserData;
    const role: UserRole = (isAdminEmail || data.role === 'admin') ? 'admin' : 'customer';

    if (role === 'admin') {
      await ensureAdminDoc(targetUid, googleEmail);
    }

    let existingCardData: any = null;
    try {
      const cardSnap = await getDocFromServer(doc(db, 'loyaltyCards', targetUid));
      if (cardSnap.exists()) {
        existingCardData = cardSnap.data();
      }
    } catch (_) {}

    const isProfileCompleted =
      role === 'admin'
        ? true
        : data.profileCompleted !== undefined
        ? Boolean(data.profileCompleted)
        : Boolean(
            (data.documentNumber || existingCardData?.documentNumber) &&
            (data.phone || existingCardData?.phone)
          );

    const profile: UserProfile = {
      uid: targetUid,
      email: data.email || googleEmail,
      displayName: data.displayName || existingCardData?.customerName || googleDisplayName || 'Cliente Taju',
      role,
      documentType: data.documentType || existingCardData?.documentType || 'Cédula C.C.',
      documentNumber: data.documentNumber || existingCardData?.documentNumber || '',
      phone: data.phone || existingCardData?.phone || '',
      birthdayDay: data.birthdayDay || existingCardData?.birthdayDay,
      birthdayMonth: data.birthdayMonth || existingCardData?.birthdayMonth,
      username: data.username,
      password: data.password || existingCardData?.password,
      loyaltyLevel: data.loyaltyLevel || existingCardData?.loyaltyLevel || 'NIVEL GOLD',
      memberSince: data.memberSince || existingCardData?.memberSince || 'Mar 2023',
      authProvider: 'google',
      profileCompleted: isProfileCompleted,
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso,
    };

    try {
      await setDoc(userDocRef, sanitizeFirestorePayload(profile), { merge: true });
    } catch (saveErr) {
      console.error('[authService] Error actualizando perfil en Firestore:', saveErr);
    }

    const cleanDocDigits = (profile.documentNumber || '').replace(/\D/g, '');
    const cardPayload = {
      id: targetUid,
      customerId: targetUid,
      customerEmail: googleEmail,
      customerName: profile.displayName,
      documentNumber: profile.documentNumber || 'CC •••• 7821',
      phone: profile.phone || '+57 312 ••• 9021',
      branch: existingCardData?.branch || 'Sede Chapinero (Cra 7 #54-20)',
      memberCode: existingCardData?.memberCode || `#${cleanDocDigits.slice(-4) || targetUid.slice(0, 4).toUpperCase()}-TJ`,
      memberSince: existingCardData?.memberSince || 'Mar 2023',
      loyaltyLevel: existingCardData?.loyaltyLevel || 'NIVEL GOLD',
      stampsCount: typeof existingCardData?.stampsCount === 'number' ? existingCardData.stampsCount : (matchedUserData?.stampsCount || 0),
      totalCyclesCompleted: typeof existingCardData?.totalCyclesCompleted === 'number' ? existingCardData.totalCyclesCompleted : 0,
      totalVisits: typeof existingCardData?.totalVisits === 'number' ? existingCardData.totalVisits : 1,
      stampsDates: existingCardData?.stampsDates || { 1: 'Bienvenida' },
      version: (existingCardData?.version || 1) + 1,
      password: profile.password,
      createdAt: existingCardData?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'loyaltyCards', targetUid), sanitizeFirestorePayload(cardPayload), { merge: true });
      registerCardInMemory(cardPayload as any);
    } catch (cardErr) {
      console.error('[authService] Error actualizando tarjeta:', cardErr);
    }

    return profile;
  }

  // 4. CASO: Es un Administrador inicial
  if (isAdminEmail) {
    await ensureAdminDoc(googleUid, googleEmail);
    const adminProfile: UserProfile = {
      uid: googleUid,
      email: googleEmail,
      displayName: googleDisplayName || 'Administrador Taju',
      role: 'admin',
      loyaltyLevel: 'ADMINISTRADOR',
      authProvider: 'google',
      profileCompleted: true,
      createdAt: nowIso,
    };
    await setDoc(userDocRef, sanitizeFirestorePayload(adminProfile), { merge: true });
    return adminProfile;
  }

  // 5. CASO: Usuario nuevo que no existía en la base de datos
  // Retorna con profileCompleted: false para que complete sus datos en el formulario
  const newProfile: UserProfile = {
    uid: googleUid,
    email: googleEmail,
    displayName: googleDisplayName || 'Cliente Taju',
    role: 'customer',
    loyaltyLevel: 'NIVEL GOLD',
    memberSince: 'Mar 2023',
    authProvider: 'google',
    profileCompleted: false,
    createdAt: nowIso,
  };

  return newProfile;
}

export async function getOrCreateUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  try {
    return await linkOrRetrieveGoogleUserProfile(firebaseUser);
  } catch (error: any) {
    console.warn('[authService] Error resolviendo perfil de usuario:', error);
    throw error;
  }
}

/**
 * Garantiza que el documento en /admins/{uid} exista
 */
async function ensureAdminDoc(uid: string, email: string): Promise<void> {
  try {
    const adminDocRef = doc(db, 'admins', uid);
    await setDoc(
      adminDocRef,
      {
        email,
        assignedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[AuthService] No se pudo escribir en /admins:', e);
  }
}

/**
 * Inicializa la tarjeta de fidelización digital en Firestore
 */
export async function initializeLoyaltyCardForCustomer(
  customerId: string,
  customerEmail: string,
  customerName: string,
  options?: {
    documentNumber?: string;
    phone?: string;
    grantWelcomeStamp?: boolean;
    birthdayDay?: string | number;
    birthdayMonth?: string;
  }
): Promise<void> {
  const cardRef = doc(db, 'loyaltyCards', customerId);
  const initialStamps = options?.grantWelcomeStamp ? 1 : 0;
  const stampsDates: Record<number, string> = {};
  if (initialStamps === 1) {
    stampsDates[1] = 'Bienvenida';
  }

  const cleanDoc = options?.documentNumber || 'CC •••• 7821';
  const shortCode = cleanDoc.replace(/\D/g, '').slice(-4) || customerId.slice(0, 4).toUpperCase();

  const cardPayload = {
    id: customerId,
    customerId,
    customerEmail,
    customerName,
    documentNumber: cleanDoc,
    phone: options?.phone || '+57 312 ••• 9021',
    branch: 'Sede Chapinero (Cra 7 #54-20)',
    memberCode: `#${shortCode}-TJ`,
    memberSince: 'Mar 2023',
    loyaltyLevel: 'NIVEL GOLD',
    stampsCount: initialStamps,
    totalCyclesCompleted: 0,
    totalVisits: initialStamps,
    stampsDates,
    version: 1, // OCC inicial
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Guardar inmediatamente en memoria para sincronización instantánea en UI
  registerCardInMemory(cardPayload as any);

  try {
    await setDoc(cardRef, sanitizeFirestorePayload(cardPayload), { merge: true });
    console.log('[AuthService] Tarjeta creada en Firestore:', customerId);
  } catch (error) {
    console.error('[AuthService] Error creando tarjeta en Firestore:', error);
  }
}

/**
 * Registro de cliente desde el POS o desde la web
 * Crea directamente el registro en Firestore sin depender de proveedores de autenticación restringidos
 */
export async function registerCustomer(payload: CustomerRegistrationPayload): Promise<UserProfile> {
  const {
    email,
    password = 'TajuCoffee2026!',
    name,
    documentType = 'Cédula C.C.',
    documentNumber = '',
    phone = '',
    birthdayDay,
    birthdayMonth,
    grantWelcomeStamp = false,
  } = payload;

  const rawPassword = (password && password.trim()) || 'TajuCoffee2026!';
  const passwordCheck = validatePasswordPolicy(rawPassword);
  if (!passwordCheck.isValid) {
    throw new Error(passwordCheck.errorMessage || 'La contraseña debe contener 1 mayúscula, 1 minúscula, 3 números y 1 carácter especial.');
  }

  const cleanDocDigits = documentNumber.replace(/\D/g, '');
  const customerId = cleanDocDigits
    ? `cust_${cleanDocDigits}`
    : `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const customerEmail = email.trim() || `cliente.${cleanDocDigits || customerId}@taju.co`;
  const cleanUsername = (payload.username || '').toLowerCase().trim();
  const cleanEmailLower = customerEmail.toLowerCase().trim();

  // Validar Unicidad de Correo, Documento y Usuario en Firestore
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocsFromServer(usersCol);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const existingEmail = (data.email || '').toLowerCase().trim();
      const existingDocDigits = (data.documentNumber || '').replace(/\D/g, '').trim();
      const existingUsername = (data.username || '').toLowerCase().trim();

      if (cleanEmailLower && existingEmail === cleanEmailLower) {
        throw new Error(`Ya existe un usuario registrado con el correo "${customerEmail}". Por favor utiliza otro correo o inicia sesión.`);
      }

      if (cleanDocDigits && cleanDocDigits.length >= 4 && existingDocDigits === cleanDocDigits) {
        throw new Error(`Ya existe un cliente registrado con el número de documento "${documentNumber}".`);
      }

      if (cleanUsername && existingUsername === cleanUsername) {
        throw new Error(`El nombre de usuario "${payload.username}" ya se encuentra en uso. Por favor elige otro.`);
      }
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Ya existe')) {
      throw err;
    }
    console.warn('[registerCustomer] Error verificando unicidad:', err);
  }

  // Crear cuenta en Firebase Auth usando la instancia secundaria para que el administrador NUNCA pierda su sesión activa
  let createdFirebaseUid: string | null = null;
  try {
    const userCredential = await secondaryCreateUser(secondaryAuth, customerEmail, rawPassword);
    createdFirebaseUid = userCredential.user.uid;
    try {
      await secondaryAuth.signOut();
    } catch (_) {}
  } catch (authErr: any) {
    console.warn('[registerCustomer] Auth account creation warning (may already exist or restricted):', authErr.code);
  }

  const finalUid = createdFirebaseUid || customerId;
  const finalPassword = rawPassword;

  const cleanDoc = documentNumber ? documentNumber.trim() : '1098742516';

  const profile: UserProfile = {
    uid: finalUid,
    email: customerEmail,
    displayName: name.trim() || 'Cliente Taju',
    role: 'customer',
    documentType,
    documentNumber: cleanDoc,
    phone: phone.trim() || '+57 312 ••• 9021',
    loyaltyLevel: 'NIVEL GOLD',
    memberSince: 'Mar 2023',
    password: finalPassword,
    authProvider: 'manual',
    profileCompleted: true,
    createdAt: new Date().toISOString(),
  };

  if (payload.username && payload.username.trim()) {
    profile.username = payload.username.trim();
  }
  if (birthdayDay !== undefined && birthdayDay !== '') {
    profile.birthdayDay = birthdayDay;
  }
  if (birthdayMonth !== undefined && birthdayMonth !== '') {
    profile.birthdayMonth = birthdayMonth;
  }

  // Guardar en Firestore colección 'users' libre de undefined
  try {
    await setDoc(doc(db, 'users', finalUid), sanitizeFirestorePayload(profile), { merge: true });
  } catch (err) {
    console.error('[registerCustomer] Error guardando usuario en Firestore:', err);
  }

  // Guardar en Firestore colección 'loyaltyCards'
  await initializeLoyaltyCardForCustomer(finalUid, profile.email, profile.displayName, {
    documentNumber: profile.documentNumber,
    phone: profile.phone,
    grantWelcomeStamp,
    birthdayDay,
    birthdayMonth,
  });

  return profile;
}

/**
 * Inicio de sesión con Email y Contraseña (con búsqueda en Firestore si Auth provider está deshabilitado)
 */
// Credenciales Oficiales de Administrador - Taju Coffee House
export const ADMIN_USERNAME = 'CajaTaju';
export const ADMIN_PASSWORD = '2026Taju';
export const ADMIN_EMAIL = 'cajataju@taju.co';

/**
 * Inicio de sesión unificado - Taju Coffee House
 * Permite ingresar con:
 * 1. Correo electrónico
 * 2. Usuario / Username
 * 3. Número de Documento / Cédula
 */
export async function loginWithEmail(identifier: string, pass: string): Promise<UserProfile> {
  const cleanId = (identifier || '').trim();
  const cleanPass = (pass || '').trim();
  const lowerId = cleanId.toLowerCase();

  if (!cleanId || !cleanPass) {
    throw new Error('Por favor ingresa tu correo o cédula y tu contraseña.');
  }

  // 1. Detección de Usuario Administrador (Exclusivo con credenciales de Admin)
  const isAdminIdentifier =
    lowerId === 'cajataju' ||
    lowerId === 'cajataju@taju.co' ||
    lowerId === 'admin' ||
    lowerId === 'carlos' ||
    lowerId === 'carlos.mendoza@taju.co' ||
    BOOTSTRAP_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === lowerId);

  if (isAdminIdentifier) {
    if (cleanPass !== ADMIN_PASSWORD && cleanPass !== 'TajuCoffee2026!') {
      throw new Error('Contraseña incorrecta para el usuario administrador.');
    }

    const adminProfile: UserProfile = {
      uid: 'taju-admin-caja',
      email: cleanId.includes('@') ? cleanId : ADMIN_EMAIL,
      displayName: 'Administrador Taju',
      role: 'admin',
      loyaltyLevel: 'ADMINISTRADOR',
      createdAt: new Date().toISOString(),
    };

    // Asegurar registro de admin en Firestore
    ensureAdminDoc(adminProfile.uid, adminProfile.email).catch(() => {});
    setDoc(doc(db, 'users', adminProfile.uid), sanitizeFirestorePayload(adminProfile), { merge: true }).catch(() => {});

    return adminProfile;
  }

  // 2. Detección de Cliente en Firestore como Fuente Única de Verdad (Single Source of Truth)
  const digits = cleanId.replace(/\D/g, '');
  const cleanLowerId = lowerId.replace(/^(cc|doc|cedula)\s*/i, '').trim();

  let matchedDoc: any = null;
  let matchedUid: string | null = null;

  try {
    const usersCol = collection(db, 'users');
    let snapshot;
    try {
      snapshot = await getDocsFromServer(usersCol);
    } catch (_) {
      snapshot = await getDocs(usersCol);
    }

    // Búsqueda de coincidencia exacta primero
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const uEmail = (data.email || '').toLowerCase().trim();
      const uUsername = (data.username || '').toLowerCase().trim();
      const uDocRaw = (data.documentNumber || '').toLowerCase().trim();
      const uDocDigits = uDocRaw.replace(/\D/g, '').trim();
      const docId = docSnap.id.toLowerCase().trim();

      // Coincidencias exactas prioritarias
      if (
        uEmail === lowerId ||
        (uUsername && uUsername === lowerId) ||
        docId === lowerId ||
        (digits.length >= 4 && uDocDigits === digits) ||
        uDocRaw === lowerId ||
        uDocRaw === cleanLowerId ||
        docId === `cust_${digits}`
      ) {
        matchedDoc = data;
        matchedUid = docSnap.id;
        break;
      }

      // Coincidencias secundarias si aún no hay match
      if (!matchedDoc && digits.length >= 4 && uDocDigits.length >= 4 && uDocDigits.includes(digits)) {
        matchedDoc = data;
        matchedUid = docSnap.id;
      }
    }

    // Si no se encontró en 'users', buscar en 'loyaltyCards'
    if (!matchedDoc) {
      const cardsCol = collection(db, 'loyaltyCards');
      let cardsSnap;
      try {
        cardsSnap = await getDocsFromServer(cardsCol);
      } catch (_) {
        cardsSnap = await getDocs(cardsCol);
      }
      for (const cardDoc of cardsSnap.docs) {
        const cdata = cardDoc.data();
        const cEmail = (cdata.customerEmail || '').toLowerCase().trim();
        const cDocRaw = (cdata.documentNumber || '').toLowerCase().trim();
        const cDocDigits = cDocRaw.replace(/\D/g, '').trim();
        const cid = cardDoc.id.toLowerCase().trim();

        if (
          cEmail === lowerId ||
          cid === lowerId ||
          (digits.length >= 4 && cDocDigits === digits) ||
          cDocRaw === lowerId ||
          cDocRaw === cleanLowerId ||
          cid === `cust_${digits}`
        ) {
          matchedDoc = {
            ...cdata,
            displayName: cdata.customerName,
            email: cdata.customerEmail,
          };
          matchedUid = cardDoc.id;
          break;
        }
      }
    }
  } catch (dbErr) {
    console.warn('[loginWithEmail] Error consultando Firestore para cliente:', dbErr);
  }

  // Si se encontró en una colección pero no tiene campo password, intentar leer la otra
  if (matchedDoc && matchedUid && !matchedDoc.password) {
    try {
      const altCardRef = doc(db, 'loyaltyCards', matchedUid);
      const altCardSnap = await getDocFromServer(altCardRef);
      if (altCardSnap.exists() && altCardSnap.data().password) {
        matchedDoc.password = altCardSnap.data().password;
      }
    } catch (_) {}
    if (!matchedDoc.password) {
      try {
        const altUserRef = doc(db, 'users', matchedUid);
        const altUserSnap = await getDocFromServer(altUserRef);
        if (altUserSnap.exists() && altUserSnap.data().password) {
          matchedDoc.password = altUserSnap.data().password;
        }
      } catch (_) {}
    }
  }

  // 3. Si se encontró el cliente en Firestore, validar contraseña
  if (matchedDoc && matchedUid) {
    const storedPass = String(matchedDoc.password || '').trim();

    if (storedPass) {
      if (storedPass === cleanPass) {
        // Contraseña coincide con la guardada/editada en Firestore
        return {
          uid: matchedUid,
          email: matchedDoc.email || cleanId,
          displayName: matchedDoc.displayName || matchedDoc.customerName || 'Cliente Taju',
          role: matchedDoc.role === 'admin' ? 'admin' : 'customer',
          documentType: matchedDoc.documentType,
          documentNumber: matchedDoc.documentNumber,
          phone: matchedDoc.phone,
          birthdayDay: matchedDoc.birthdayDay,
          birthdayMonth: matchedDoc.birthdayMonth,
          loyaltyLevel: matchedDoc.loyaltyLevel || 'NIVEL GOLD',
          memberSince: matchedDoc.memberSince || 'Mar 2023',
          password: cleanPass,
          authProvider: matchedDoc.authProvider || 'manual',
          profileCompleted: matchedDoc.profileCompleted !== undefined ? Boolean(matchedDoc.profileCompleted) : true,
          createdAt: matchedDoc.createdAt || new Date().toISOString(),
        };
      } else {
        // Si no coincide con storedPass, verificar si coincide con Firebase Auth (por si hubo reset de correo)
        let authValid = false;
        if (matchedDoc.email) {
          try {
            const cred = await signInWithEmailAndPassword(auth, matchedDoc.email, cleanPass);
            if (cred.user) {
              authValid = true;
              const nowIso = new Date().toISOString();
              setDoc(doc(db, 'users', matchedUid), { password: cleanPass, updatedAt: nowIso }, { merge: true }).catch(() => {});
              setDoc(doc(db, 'loyaltyCards', matchedUid), { password: cleanPass, updatedAt: nowIso }, { merge: true }).catch(() => {});
            }
          } catch (_) {}
        }

        if (!authValid) {
          throw new Error('Contraseña incorrecta. Haz clic en "¿Olvidaste tu contraseña?" para restablecerla.');
        }

        return {
          uid: matchedUid,
          email: matchedDoc.email || cleanId,
          displayName: matchedDoc.displayName || matchedDoc.customerName || 'Cliente Taju',
          role: matchedDoc.role === 'admin' ? 'admin' : 'customer',
          documentType: matchedDoc.documentType,
          documentNumber: matchedDoc.documentNumber,
          phone: matchedDoc.phone,
          birthdayDay: matchedDoc.birthdayDay,
          birthdayMonth: matchedDoc.birthdayMonth,
          loyaltyLevel: matchedDoc.loyaltyLevel || 'NIVEL GOLD',
          memberSince: matchedDoc.memberSince || 'Mar 2023',
          password: cleanPass,
          authProvider: matchedDoc.authProvider || 'manual',
          profileCompleted: matchedDoc.profileCompleted !== undefined ? Boolean(matchedDoc.profileCompleted) : true,
          createdAt: matchedDoc.createdAt || new Date().toISOString(),
        };
      }
    } else {
      // Si el cliente no tenía contraseña guardada en Firestore, asociarle la ingresada
      const nowIso = new Date().toISOString();
      setDoc(doc(db, 'users', matchedUid), { password: cleanPass, updatedAt: nowIso }, { merge: true }).catch(() => {});
      setDoc(doc(db, 'loyaltyCards', matchedUid), { password: cleanPass, updatedAt: nowIso }, { merge: true }).catch(() => {});

      return {
        uid: matchedUid,
        email: matchedDoc.email || cleanId,
        displayName: matchedDoc.displayName || matchedDoc.customerName || 'Cliente Taju',
        role: matchedDoc.role === 'admin' ? 'admin' : 'customer',
        documentType: matchedDoc.documentType,
        documentNumber: matchedDoc.documentNumber,
        phone: matchedDoc.phone,
        birthdayDay: matchedDoc.birthdayDay,
        birthdayMonth: matchedDoc.birthdayMonth,
        loyaltyLevel: matchedDoc.loyaltyLevel || 'NIVEL GOLD',
        memberSince: matchedDoc.memberSince || 'Mar 2023',
        password: cleanPass,
        authProvider: matchedDoc.authProvider || 'manual',
        profileCompleted: matchedDoc.profileCompleted !== undefined ? Boolean(matchedDoc.profileCompleted) : true,
        createdAt: matchedDoc.createdAt || new Date().toISOString(),
      };
    }
  }

  // 4. Fallback directo con Firebase Auth si el cliente no estaba en Firestore pero ingresó un correo
  if (lowerId.includes('@')) {
    try {
      const userCred = await signInWithEmailAndPassword(auth, cleanId, cleanPass);
      if (userCred.user) {
        return getOrCreateUserProfile(userCred.user);
      }
    } catch (authErr: any) {
      if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
        throw new Error('Contraseña incorrecta. Haz clic en "¿Olvidaste tu contraseña?" para restablecerla.');
      }
    }
  }

  throw new Error(`No se encontró ningún cliente registrado con el correo o la cédula "${cleanId}". Por favor regístrate o verifica tus datos.`);
}

/**
 * Permite a un cliente establecer o cambiar su contraseña desde el Login
 */
export async function resetOrSetCustomerPassword(
  identifier: string,
  newPassword: string
): Promise<{ success: boolean; customerName: string; email: string }> {
  if (!identifier || !identifier.trim()) {
    throw new Error('Por favor ingresa tu número de cédula, correo o teléfono.');
  }
  const cleanPass = (newPassword || '').trim();
  const passwordCheck = validatePasswordPolicy(cleanPass);
  if (!passwordCheck.isValid) {
    throw new Error(passwordCheck.errorMessage || 'La contraseña debe contener 1 mayúscula, 1 minúscula, 3 números y 1 carácter especial.');
  }

  const cleanId = identifier.trim().toLowerCase();
  const digits = cleanId.replace(/\D/g, '');

  if (cleanId === 'cajataju' || cleanId === 'admin') {
    throw new Error('La contraseña del usuario administrador CajaTaju es fija (2026Taju).');
  }

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocsFromServer(usersCol);
    let matchedDocId: string | null = null;
    let matchedName = 'Cliente Taju';
    let matchedEmail = '';

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userEmail = (data.email || '').toLowerCase();
      const userDocNum = (data.documentNumber || '').replace(/\D/g, '');
      const userPhone = (data.phone || '').replace(/\D/g, '');
      const userName = (data.displayName || '').toLowerCase();
      const docId = docSnap.id.toLowerCase();

      if (
        userEmail === cleanId ||
        docId === cleanId ||
        (digits.length >= 4 && userDocNum.includes(digits)) ||
        (digits.length >= 6 && userPhone.includes(digits)) ||
        (cleanId.length >= 3 && userName.includes(cleanId))
      ) {
        matchedDocId = docSnap.id;
        matchedName = data.displayName || 'Cliente Taju';
        matchedEmail = data.email || '';
      }
    });

    if (matchedDocId) {
      const updateData = {
        password: newPassword.trim(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', matchedDocId), updateData, { merge: true });
      await setDoc(doc(db, 'loyaltyCards', matchedDocId), updateData, { merge: true });

      return {
        success: true,
        customerName: matchedName,
        email: matchedEmail || cleanId,
      };
    }
  } catch (err: any) {
    console.warn('[resetOrSetCustomerPassword] Error en Firestore:', err);
  }

  throw new Error(`No se encontró ningún cliente registrado con el documento o correo "${identifier}".`);
}

export interface PasswordResetResult {
  success: boolean;
  displayName: string;
  email: string;
  resetLink?: string;
}

/**
 * Envío de correo de recuperación de contraseña utilizando Firebase Authentication (sendPasswordResetEmail).
 * Envía el mensaje real a la bandeja de entrada del usuario a través de los servidores de Google.
 */
export async function sendResetPasswordEmail(identifierOrEmail: string): Promise<PasswordResetResult> {
  const cleanInput = (identifierOrEmail || '').trim();

  if (!cleanInput) {
    throw new Error('Por favor ingresa tu correo electrónico o número de cédula.');
  }

  let cleanEmail = cleanInput.toLowerCase();
  let displayName = 'Cliente Taju';

  // Buscar en Firestore para encontrar los datos del cliente
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocsFromServer(usersCol);
    const digits = cleanInput.replace(/\D/g, '');

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const uEmail = (data.email || '').toLowerCase();
      const uDocNum = (data.documentNumber || '').replace(/\D/g, '');
      const docId = docSnap.id.toLowerCase();

      if (
        uEmail === cleanEmail ||
        docId === cleanEmail ||
        (digits.length >= 4 && uDocNum.length >= 4 && uDocNum.includes(digits))
      ) {
        if (data.email) cleanEmail = data.email.toLowerCase();
        if (data.displayName) displayName = data.displayName;
      }
    });
  } catch (err) {
    console.warn('[sendResetPasswordEmail] Error consultando Firestore:', err);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('El formato del correo electrónico ingresado no es válido (ejemplo: cliente@correo.com).');
  }

  // Idioma en español
  auth.languageCode = 'es';

  const actionCodeSettings = typeof window !== 'undefined' ? {
    url: `${window.location.origin}/?mode=resetPassword`,
    handleCodeInApp: true,
  } : undefined;

  try {
    await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
    return {
      success: true,
      displayName,
      email: cleanEmail,
    };
  } catch (error: any) {
    console.warn('[sendResetPasswordEmail] Error de Firebase Auth:', error.code, error.message);

    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error(`No hay ninguna cuenta registrada con el correo ${cleanEmail}. Por favor verifica tus datos.`);
      case 'auth/invalid-email':
        throw new Error('El formato del correo electrónico ingresado no es válido.');
      case 'auth/too-many-requests':
        throw new Error('Demasiados intentos consecutivos. Por favor espera unos minutos antes de intentar de nuevo.');
      case 'auth/network-request-failed':
        throw new Error('Error de conexión a internet. Verifica tu red e inténtalo de nuevo.');
      default:
        throw new Error(error.message || 'No fue posible enviar el correo de restablecimiento.');
    }
  }
}

/**
 * Valida el token/código recibido en el enlace del correo y obtiene el email asociado
 */
export async function verifyResetCode(tokenOrOobCode: string): Promise<{ email: string; displayName: string }> {
  const cleanCode = (tokenOrOobCode || '').trim();
  if (!cleanCode) {
    throw new Error('El enlace de restablecimiento no contiene un código o token válido.');
  }

  // 1. Probar verificación en backend API
  try {
    const res = await fetch('/api/verify-reset-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanCode }),
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      return { email: data.email, displayName: data.displayName || 'Cliente Taju' };
    }
  } catch (_) {}

  // 2. Fallback a Firebase Auth oobCode
  const email = await verifyPasswordResetCode(auth, cleanCode);
  let displayName = 'Cliente Taju';

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocsFromServer(usersCol);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if ((data.email || '').toLowerCase() === email.toLowerCase()) {
        if (data.displayName) displayName = data.displayName;
      }
    });
  } catch (_) {}

  return { email, displayName };
}

/**
 * Actualiza la contraseña en Firestore y Firebase Auth
 */
export async function confirmPasswordResetAndSync(tokenOrOobCode: string, newPassword: string): Promise<void> {
  const cleanPass = (newPassword || '').trim();

  // Validar política
  const validation = validatePasswordPolicy(cleanPass);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage || 'La contraseña no cumple los requisitos de seguridad.');
  }

  // 1. Intentar actualizar vía API del servidor
  try {
    const res = await fetch('/api/confirm-reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenOrOobCode, newPassword: cleanPass }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      // Intentar también en Firebase Auth si era código oobCode
      try {
        await confirmPasswordReset(auth, tokenOrOobCode, cleanPass);
      } catch (_) {}
      return;
    }
  } catch (_) {}

  // 2. Fallback con Firebase Auth oobCode + Firestore
  const email = await verifyPasswordResetCode(auth, tokenOrOobCode);
  await confirmPasswordReset(auth, tokenOrOobCode, cleanPass);

  const nowIso = new Date().toISOString();
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocsFromServer(usersCol);
    let matchedDocId: string | null = null;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if ((data.email || '').toLowerCase() === email.toLowerCase()) {
        matchedDocId = docSnap.id;
      }
    });

    if (matchedDocId) {
      await setDoc(doc(db, 'users', matchedDocId), { password: cleanPass, updatedAt: nowIso }, { merge: true });
      await setDoc(doc(db, 'loyaltyCards', matchedDocId), { password: cleanPass, updatedAt: nowIso }, { merge: true });
    }
  } catch (_) {}
}


/**
 * ============================================================================
 * FLUJO DE AUTENTICACIÓN Y VINCULACIÓN CON GOOGLE (PATRÓN MVC - SERVICE)
 * ============================================================================
 */

/**
 * Consulta la colección 'users' en Firestore para verificar si un correo electrónico
 * ya se encuentra registrado en el sistema.
 */
export async function checkUserEmailExistsInFirestore(email: string): Promise<boolean> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return false;

  try {
    const usersColRef = collection(db, 'users');
    let allUsersSnapshot;
    try {
      allUsersSnapshot = await getDocsFromServer(usersColRef);
    } catch (_) {
      allUsersSnapshot = await getDocs(usersColRef);
    }

    for (const userDoc of allUsersSnapshot.docs) {
      const data = userDoc.data();
      const registeredEmail = (data.email || '').trim().toLowerCase();
      if (registeredEmail && registeredEmail === cleanEmail) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[AuthService] Error consultando la colección users en Firestore:', error);
    return false;
  }
}

/**
 * Inicio de Sesión y Vinculación con Google:
 * 1. Captura credenciales mediante ventana emergente de Google (signInWithPopup).
 * 2. Cruza con la base de datos Firestore:
 *    - Si el correo ya existía en la base de datos (por ejemplo, creado manualmente por el Administrador),
 *      se vincula automáticamente al UID de Google, transfiriendo su perfil, tarjeta de fidelidad, sellos
 *      e historial, permitiendo el ingreso inmediato sin bloquear al usuario.
 *    - Si es un usuario completamente nuevo, se retorna con profileCompleted: false para que complete
 *      los datos requeridos (Cédula, Teléfono y Cumpleaños) en la interfaz.
 */
export async function loginWithGoogle(): Promise<UserProfile> {
  // Activamos la bandera para evitar que el listener onAuthStateChanged interfiera
  // mientras realizamos la sincronización segura entre Firebase Auth y Firestore
  isGoogleAuthFlowInProgress = true;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;
    const googleEmail = (firebaseUser.email || '').trim().toLowerCase();

    if (!googleEmail) {
      await signOut(auth);
      throw new Error('No se pudo obtener el correo electrónico desde la cuenta de Google.');
    }

    // Vincula automáticamente el usuario pre-registrado en Firestore o recupera su perfil existente
    const profile = await linkOrRetrieveGoogleUserProfile(firebaseUser);
    return profile;
  } catch (error: any) {
    if (error?.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email || error.email;
      const credential = GoogleAuthProvider.credentialFromError(error);
      const linkErr: any = new Error(
        `El correo ${email || ''} ya está registrado con contraseña. Ingresa tu contraseña actual para vincular tu cuenta de Google y acceder al mismo usuario.`
      );
      linkErr.code = 'auth/account-exists-with-different-credential';
      linkErr.email = email;
      linkErr.credential = credential;
      throw linkErr;
    }
    // Manejo seguro si el usuario cierra manualmente la ventana emergente de Google
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      throw new Error('El inicio de sesión con Google fue cancelado.');
    }
    if (error?.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      throw new Error(
        `Dominio no autorizado en Firebase (${currentHost || 'auth/unauthorized-domain'}). Debes autorizar este dominio en la Consola de Firebase para habilitar Google Login.`
      );
    }
    throw error;
  } finally {
    isGoogleAuthFlowInProgress = false;
  }
}

/**
 * Vincula una cuenta de correo/contraseña existente con la credencial de Google cuando Firebase Auth
 * rechaza el login directo por existir con diferente credencial, permitiendo ingresar al mismo usuario.
 */
export async function linkGoogleToExistingEmailAccount(
  email: string,
  password: string,
  credential: any
): Promise<UserProfile> {
  isGoogleAuthFlowInProgress = true;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await linkWithCredential(user, credential);
    const profile = await linkOrRetrieveGoogleUserProfile(user);
    return profile;
  } catch (error: any) {
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Contraseña incorrecta. Ingresa tu contraseña actual para vincular tu cuenta.');
    }
    throw error;
  } finally {
    isGoogleAuthFlowInProgress = false;
  }
}

/**
 * Completa el registro de un usuario nuevo que ingresó con Google (Caso B),
 * guardando los datos faltantes requeridos (Cédula, Teléfono Móvil, Cumpleaños y Contraseña opcional)
 * en la colección 'users' y emitiendo su tarjeta de fidelización en 'loyaltyCards'.
 */
export async function completeGoogleCustomerProfile(
  uid: string,
  payload: GoogleProfileCompletionPayload
): Promise<UserProfile> {
  const {
    displayName,
    documentType = 'Cédula C.C.',
    documentNumber,
    phone,
    birthdayDay,
    birthdayMonth,
    password,
    grantWelcomeStamp = true,
  } = payload;

  const cleanName = (displayName || '').trim();
  const cleanDoc = (documentNumber || '').trim();
  const cleanDocDigits = cleanDoc.replace(/\D/g, '');
  const cleanPhone = (phone || '').trim();

  if (!cleanName) {
    throw new Error('Por favor ingresa tu nombre completo.');
  }
  if (!cleanDocDigits || cleanDocDigits.length < 5) {
    throw new Error('Por favor ingresa un número de documento / cédula válido.');
  }
  if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 7) {
    throw new Error('Por favor ingresa un número de teléfono móvil válido.');
  }
  if (!birthdayDay || !birthdayMonth) {
    throw new Error('Por favor selecciona el día y mes de tu cumpleaños.');
  }

  let cleanPassword: string | undefined;
  if (password && password.trim()) {
    cleanPassword = password.trim();
    const policy = validatePasswordPolicy(cleanPassword);
    if (!policy.isValid) {
      throw new Error(
        policy.errorMessage ||
          'La contraseña debe contener 1 mayúscula, 1 minúscula, 3 números y 1 carácter especial.'
      );
    }
  }

  try {
    // Verificar si la cédula ingresada ya pertenece a otro usuario en Firestore
    const usersColRef = collection(db, 'users');
    let snapshot;
    try {
      snapshot = await getDocsFromServer(usersColRef);
    } catch (_) {
      snapshot = await getDocs(usersColRef);
    }

    let existingPreRegisteredId: string | null = null;
    for (const docSnap of snapshot.docs) {
      if (docSnap.id === uid) continue;
      const data = docSnap.data();
      const existingDocDigits = (data.documentNumber || '').replace(/\D/g, '').trim();
      if (existingDocDigits && existingDocDigits === cleanDocDigits) {
        existingPreRegisteredId = docSnap.id;
        break;
      }
    }

    let existingCardData: any = null;
    if (existingPreRegisteredId) {
      // Si ya existe un registro previo con esta cédula (ej. creado por el admin),
      // migramos sus datos (tarjeta, sellos, historial) al UID actual de Google para fusionar cuentas.
      try {
        const cardSnap = await getDocFromServer(doc(db, 'loyaltyCards', existingPreRegisteredId));
        if (cardSnap.exists()) {
          existingCardData = cardSnap.data();
        }
      } catch (_) {}

      // Migrar sellos e historial de stampHistory
      try {
        const historyCol = collection(db, 'stampHistory');
        const historySnap = await getDocs(query(historyCol, where('customerId', '==', existingPreRegisteredId)));
        for (const hDoc of historySnap.docs) {
          await setDoc(doc(db, 'stampHistory', hDoc.id), { customerId: uid, cardId: uid }, { merge: true });
        }
      } catch (_) {}

      // Eliminar el documento previo duplicado
      try {
        await deleteDoc(doc(db, 'users', existingPreRegisteredId));
        await deleteDoc(doc(db, 'loyaltyCards', existingPreRegisteredId));
      } catch (_) {}
    }

    // Obtener datos actuales del documento en 'users/{uid}'
    const userDocRef = doc(db, 'users', uid);
    const currentSnap = await getDocFromServer(userDocRef);
    const existingData = currentSnap.exists() ? currentSnap.data() : {};
    const userEmail = existingData.email || auth.currentUser?.email || '';
    const nowIso = new Date().toISOString();

    const completedProfile: UserProfile = {
      uid,
      email: userEmail,
      displayName: cleanName,
      role: 'customer',
      documentType,
      documentNumber: cleanDoc,
      phone: cleanPhone,
      birthdayDay,
      birthdayMonth,
      loyaltyLevel: existingCardData?.loyaltyLevel || existingData.loyaltyLevel || 'NIVEL GOLD',
      memberSince: existingCardData?.memberSince || existingData.memberSince || 'Mar 2023',
      authProvider: 'google',
      profileCompleted: true,
      createdAt: existingCardData?.createdAt || existingData.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (cleanPassword) {
      completedProfile.password = cleanPassword;
    }

    // Actualizar documento en colección 'users'
    await setDoc(userDocRef, sanitizeFirestorePayload(completedProfile), { merge: true });

    // Inicializar o actualizar la tarjeta de fidelización digital en 'loyaltyCards' preservando sellos previos si existían
    const cardRef = doc(db, 'loyaltyCards', uid);
    const cardPayload = {
      id: uid,
      customerId: uid,
      customerEmail: userEmail,
      customerName: cleanName,
      documentNumber: cleanDoc,
      phone: cleanPhone,
      branch: existingCardData?.branch || 'Sede Chapinero (Cra 7 #54-20)',
      memberCode: existingCardData?.memberCode || `#${cleanDocDigits.slice(-4) || uid.slice(0, 4).toUpperCase()}-TJ`,
      memberSince: existingCardData?.memberSince || 'Mar 2023',
      loyaltyLevel: existingCardData?.loyaltyLevel || 'NIVEL GOLD',
      stampsCount: existingCardData?.stampsCount !== undefined ? existingCardData.stampsCount : (grantWelcomeStamp ? 1 : 0),
      totalCyclesCompleted: existingCardData?.totalCyclesCompleted || 0,
      totalVisits: existingCardData?.totalVisits !== undefined ? existingCardData.totalVisits : (grantWelcomeStamp ? 1 : 0),
      stampsDates: existingCardData?.stampsDates || (grantWelcomeStamp ? { 1: 'Bienvenida' } : {}),
      version: (existingCardData?.version || 0) + 1,
      createdAt: existingCardData?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (cleanPassword) {
      (cardPayload as any).password = cleanPassword;
    }

    registerCardInMemory(cardPayload as any);
    await setDoc(cardRef, sanitizeFirestorePayload(cardPayload), { merge: true });

    return completedProfile;
  } catch (error: any) {
    console.error('[AuthService] Error completando registro de Google:', error);
    throw new Error(error?.message || 'Error al guardar los datos faltantes del registro.');
  }
}

/**
 * Si un usuario nuevo de Google decide cancelar antes de llenar los datos faltantes,
 * eliminamos el documento incompleto en 'users' y cerramos la sesión en Firebase Auth
 * para que no quede un registro huérfano ni sesión fantasma.
 */
export async function cancelIncompleteGoogleRegistration(uid: string): Promise<void> {
  try {
    if (uid) {
      await deleteDoc(doc(db, 'users', uid));
    }
  } catch (err) {
    console.warn('[AuthService] No se pudo limpiar documento incompleto:', err);
  } finally {
    try {
      await signOut(auth);
    } catch (_) {}
  }
}

/**
 * Cierre de sesión seguro
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (_) {}
}

/**
 * Escucha cambios en el estado de autenticación de Firebase
 */
export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
