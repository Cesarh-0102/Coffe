/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Controlador de Autenticación - Taju Coffee House
 */

import { useState, useEffect, useCallback } from 'react';
import { UserProfile, AuthState } from '../models/User';
import {
  subscribeToAuthChanges,
  getOrCreateUserProfile,
  loginWithEmail,
  registerCustomer,
  loginWithGoogle,
  linkGoogleToExistingEmailAccount,
  logoutUser,
  resetOrSetCustomerPassword,
  sendResetPasswordEmail,
  completeGoogleCustomerProfile,
  cancelIncompleteGoogleRegistration,
  isGoogleAuthInProgress,
  CustomerRegistrationPayload,
  GoogleProfileCompletionPayload,
} from '../services/authService';
import {
  requestNotificationPermissionAndLogin,
  logoutOneSignal,
} from '../services/oneSignalService';

const SESSION_STORAGE_KEY = 'taju_active_session';

function getStoredSession(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid) {
      return parsed as UserProfile;
    }
  } catch (_) {}
  return null;
}

function persistSession(profile: UserProfile | null) {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      const serialized = JSON.stringify(profile);
      sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
      localStorage.setItem(SESSION_STORAGE_KEY, serialized);
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (_) {}
}

export function useAuthController() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = getStoredSession();
    if (stored) {
      return {
        user: stored,
        loading: false,
        error: null,
        isAdmin: stored.role === 'admin',
        isCustomer: stored.role === 'customer',
      };
    }
    return {
      user: null,
      loading: true,
      error: null,
      isAdmin: false,
      isCustomer: false,
    };
  });

  const [authActionLoading, setAuthActionLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      // Si se está ejecutando la validación cruzada de loginWithGoogle (Auth <-> Firestore),
      // ignoramos temporalmente este evento para evitar condiciones de carrera o sesiones fantasma.
      if (isGoogleAuthInProgress()) {
        return;
      }

      if (!firebaseUser) {
        // Si no hay sesión de Firebase Auth, verificar si hay sesión activa guardada (Firestore / Admin)
        const stored = getStoredSession();
        if (stored && stored.authProvider !== 'google') {
          setAuthState((prev) => ({
            user: stored,
            loading: false,
            error: prev.error,
            isAdmin: stored.role === 'admin',
            isCustomer: stored.role === 'customer',
          }));
        } else {
          persistSession(null);
          setAuthState((prev) => ({
            user: null,
            loading: false,
            error: prev.error,
            isAdmin: false,
            isCustomer: false,
          }));
        }
        return;
      }

      try {
        const profile = await getOrCreateUserProfile(firebaseUser);
        persistSession(profile);
        setAuthState({
          user: profile,
          loading: false,
          error: null,
          isAdmin: profile.role === 'admin',
          isCustomer: profile.role === 'customer',
        });
        // Integración OneSignal: sincronizar usuario activo y permisos
        requestNotificationPermissionAndLogin(profile.uid, profile.email).catch(() => {});
      } catch (err: any) {
        console.warn('[useAuthController] Sesión no vinculada en Firestore:', err);
        persistSession(null);
        setAuthState((prev) => ({
          ...prev,
          user: null,
          loading: false,
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = useCallback(async (email: string, pass: string) => {
    setAuthActionLoading(true);
    setAuthState((prev) => ({ ...prev, error: null }));
    try {
      const profile = await loginWithEmail(email, pass);
      persistSession(profile);
      setAuthState({
        user: profile,
        loading: false,
        error: null,
        isAdmin: profile.role === 'admin',
        isCustomer: profile.role === 'customer',
      });

      // Integración OneSignal: Pedir permiso de notificaciones push y vincular usuario con su UID
      requestNotificationPermissionAndLogin(profile.uid, profile.email).catch(() => {});

      return profile;
    } catch (err: any) {
      const message = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
        : err.code === 'auth/user-not-found'
        ? 'Usuario no encontrado en Taju Coffee House.'
        : err.message || 'Error al iniciar sesión.';
      setAuthState((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (payload: CustomerRegistrationPayload) => {
    setAuthActionLoading(true);
    setAuthState((prev) => ({ ...prev, error: null }));
    try {
      const profile = await registerCustomer(payload);
      persistSession(profile);
      setAuthState({
        user: profile,
        loading: false,
        error: null,
        isAdmin: false,
        isCustomer: true,
      });

      // Integración OneSignal: Pedir permiso de notificaciones push y vincular usuario con su UID
      requestNotificationPermissionAndLogin(profile.uid, profile.email).catch(() => {});

      return profile;
    } catch (err: any) {
      const message = err.code === 'auth/email-already-in-use'
        ? 'Este correo ya se encuentra registrado. Inicia sesión.'
        : err.code === 'auth/weak-password'
        ? 'La contraseña debe tener al menos 6 caracteres.'
        : err.message || 'Error al registrar cliente.';
      setAuthState((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  const [googleLinkContext, setGoogleLinkContext] = useState<{ email: string; credential: any } | null>(null);

  /**
   * Controlador MVC para Inicio de Sesión con Google:
   * - Invoca loginWithGoogle() del Service.
   * - Si el correo ya existía en la base de datos (ej. registro manual), se vincula automáticamente
   *   y permite el acceso inmediato a su tarjeta y sellos.
   * - Si es un usuario nuevo, se carga la sesión con profileCompleted: false para que complete sus datos.
   */
  const handleGoogleLogin = useCallback(async () => {
    setAuthActionLoading(true);
    setAuthState((prev) => ({ ...prev, error: null }));
    setGoogleLinkContext(null);
    try {
      const profile = await loginWithGoogle();
      persistSession(profile);
      setAuthState({
        user: profile,
        loading: false,
        error: null,
        isAdmin: profile.role === 'admin',
        isCustomer: profile.role === 'customer',
      });

      // Integración OneSignal: Pedir permiso de notificaciones push y vincular usuario con su UID
      requestNotificationPermissionAndLogin(profile.uid, profile.email).catch(() => {});

      return profile;
    } catch (err: any) {
      persistSession(null);
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setGoogleLinkContext({ email: err.email, credential: err.credential });
      }
      const errorMessage = err?.message || 'Error al iniciar sesión con Google.';
      setAuthState({
        user: null,
        loading: false,
        error: errorMessage,
        isAdmin: false,
        isCustomer: false,
      });
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  const handleLinkGoogleAccount = useCallback(async (password: string) => {
    if (!googleLinkContext) return;
    setAuthActionLoading(true);
    setAuthState((prev) => ({ ...prev, error: null }));
    try {
      const profile = await linkGoogleToExistingEmailAccount(
        googleLinkContext.email,
        password,
        googleLinkContext.credential
      );
      persistSession(profile);
      setGoogleLinkContext(null);
      setAuthState({
        user: profile,
        loading: false,
        error: null,
        isAdmin: profile.role === 'admin',
        isCustomer: profile.role === 'customer',
      });
      requestNotificationPermissionAndLogin(profile.uid, profile.email).catch(() => {});
      return profile;
    } catch (err: any) {
      setAuthState((prev) => ({ ...prev, error: err.message || 'Contraseña incorrecta o error al vincular.' }));
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  }, [googleLinkContext]);

  /**
   * Controlador MVC para completar los datos faltantes de un nuevo cliente de Google (Caso B):
   * Guarda Cédula, Teléfono Móvil y Cumpleaños en Firestore y activa la vista final del cliente.
   */
  const handleCompleteGoogleProfile = useCallback(
    async (payload: GoogleProfileCompletionPayload) => {
      if (!authState.user) {
        throw new Error('No hay una sesión de usuario activa para completar el registro.');
      }
      setAuthActionLoading(true);
      setAuthState((prev) => ({ ...prev, error: null }));
      try {
        const completedProfile = await completeGoogleCustomerProfile(authState.user.uid, payload);
        persistSession(completedProfile);
        setAuthState({
          user: completedProfile,
          loading: false,
          error: null,
          isAdmin: false,
          isCustomer: true,
        });
        // Integración OneSignal: sincronizar nuevo perfil completado
        requestNotificationPermissionAndLogin(completedProfile.uid, completedProfile.email).catch(() => {});
        return completedProfile;
      } catch (err: any) {
        setAuthState((prev) => ({
          ...prev,
          error: err?.message || 'Error al completar el registro del cliente.',
        }));
        throw err;
      } finally {
        setAuthActionLoading(false);
      }
    },
    [authState.user]
  );

  /**
   * Cancela el proceso de registro de un usuario de Google que aún no ha enviado sus datos faltantes,
   * eliminando su documento temporal y cerrando la sesión en Firebase Auth.
   */
  const handleCancelGoogleRegistration = useCallback(async () => {
    const currentUid = authState.user?.uid;
    persistSession(null);
    logoutOneSignal();
    if (currentUid) {
      await cancelIncompleteGoogleRegistration(currentUid);
    } else {
      await logoutUser();
    }
    setAuthState({
      user: null,
      loading: false,
      error: null,
      isAdmin: false,
      isCustomer: false,
    });
  }, [authState.user]);

  const handleLogout = useCallback(async () => {
    try {
      persistSession(null);
      // Integración OneSignal: desvincular dispositivo al cerrar sesión
      logoutOneSignal();
      await logoutUser();
      setAuthState({
        user: null,
        loading: false,
        error: null,
        isAdmin: false,
        isCustomer: false,
      });
    } catch (err: any) {
      console.error('[useAuthController] Error cerrando sesión:', err);
    }
  }, []);

  const handleResetPassword = useCallback(async (identifier: string, newPass: string) => {
    setAuthActionLoading(true);
    setAuthState((prev) => ({ ...prev, error: null }));
    try {
      const res = await resetOrSetCustomerPassword(identifier, newPass);
      return res;
    } catch (err: any) {
      setAuthState((prev) => ({ ...prev, error: err.message || 'Error al actualizar contraseña.' }));
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  const handleSendPasswordResetEmail = useCallback(async (email: string) => {
    setAuthActionLoading(true);
    setAuthState((prev) => ({ ...prev, error: null }));
    try {
      const res = await sendResetPasswordEmail(email);
      return res;
    } catch (err: any) {
      setAuthState((prev) => ({ ...prev, error: err.message || 'Error al enviar el correo de recuperación.' }));
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  return {
    ...authState,
    actionLoading: authActionLoading,
    login: handleLogin,
    register: handleRegister,
    loginWithGoogle: handleGoogleLogin,
    linkGoogleAccount: handleLinkGoogleAccount,
    googleLinkContext,
    completeGoogleProfile: handleCompleteGoogleProfile,
    cancelGoogleRegistration: handleCancelGoogleRegistration,
    logout: handleLogout,
    resetPassword: handleResetPassword,
    sendPasswordResetEmail: handleSendPasswordResetEmail,
  };
}
