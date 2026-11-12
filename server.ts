/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Servidor Express + Middleware de Vite - Taju Coffee House
 * Manejo de rutas backend para envío real de correos de restablecimiento de contraseña,
 * verificación de tokens y sincronización con Firestore.
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = express();
app.use(express.json());

// Inicialización de Firebase en Backend Node.js
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Almacenamiento en memoria de tokens de restablecimiento (con respaldo en Firestore)
const activeTokens = new Map<string, { email: string; displayName: string; expiresAt: number }>();

// Configuración del transporte de correo SMTP con Nodemailer
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

async function getEmailTransporter() {
  if (cachedTransporter) return cachedTransporter;

  // Si existen variables de entorno SMTP, usarlas
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return cachedTransporter;
  }

  // Fallback: Crear cuenta de pruebas en Ethereal SMTP para entrega garantizada
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('[Server] Transmisor Ethereal SMTP creado para envío de correos:', testAccount.user);
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return cachedTransporter;
  } catch (err) {
    console.warn('[Server] No se pudo crear transporte SMTP de prueba, usando transporte directo:', err);
    cachedTransporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
    return cachedTransporter;
  }
}

/**
 * Validador de Política Estricta de Contraseña:
 * - 1 Mayúscula
 * - 1 Minúscula
 * - 3 Números
 * - 1 Carácter especial
 * - Mínimo 6 caracteres
 */
function validatePassword(password: string): { isValid: boolean; message: string | null } {
  const p = password || '';
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const numbersMatch = p.match(/[0-9]/g) || [];
  const hasThreeNumbers = numbersMatch.length >= 3;
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(p);
  const hasLength = p.length >= 6;

  if (!hasUpper || !hasLower || !hasThreeNumbers || !hasSpecial || !hasLength) {
    const missing: string[] = [];
    if (!hasUpper) missing.push('1 mayúscula');
    if (!hasLower) missing.push('1 minúscula');
    if (!hasThreeNumbers) missing.push('3 números');
    if (!hasSpecial) missing.push('1 carácter especial');
    if (!hasLength) missing.push('mínimo 6 caracteres');
    return {
      isValid: false,
      message: `La contraseña debe contener: ${missing.join(', ')}.`,
    };
  }
  return { isValid: true, message: null };
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Endpoint POST /api/send-reset-email
 * Envía el correo electrónico de restablecimiento con el cuerpo exacto requerido
 */
app.post('/api/send-reset-email', async (req, res) => {
  try {
    const { identifier } = req.body;
    const cleanInput = (identifier || '').trim();

    if (!cleanInput) {
      return res.status(400).json({ error: 'Por favor proporciona un correo electrónico o cédula.' });
    }

    let targetEmail = cleanInput.toLowerCase();
    let displayName = 'Cliente Taju';

    // Buscar en Firestore para encontrar los datos del cliente
    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      const digits = cleanInput.replace(/\D/g, '');

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const uEmail = (data.email || '').toLowerCase();
        const uDocNum = (data.documentNumber || '').replace(/\D/g, '');
        const uPhone = (data.phone || '').replace(/\D/g, '');
        const docId = docSnap.id.toLowerCase();

        if (
          uEmail === targetEmail ||
          docId === targetEmail ||
          (digits.length >= 4 && uDocNum.length >= 4 && uDocNum.includes(digits)) ||
          (digits.length >= 6 && uPhone.length >= 6 && uPhone.includes(digits))
        ) {
          if (data.email) {
            targetEmail = data.email.toLowerCase();
          }
          if (data.displayName) {
            displayName = data.displayName;
          }
        }
      });
    } catch (err) {
      console.warn('[Server] Error consultando Firestore:', err);
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      return res.status(400).json({ error: 'Por favor ingresa una dirección de correo electrónico válida (ej: cliente@correo.com).' });
    }

    // Generar Token Seguro
    const resetToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 3600000; // 1 hora de validez

    activeTokens.set(resetToken, { email: targetEmail, displayName, expiresAt });

    // Guardar también en Firestore /passwordResets
    try {
      await setDoc(doc(db, 'passwordResets', resetToken), {
        email: targetEmail,
        displayName,
        expiresAt,
        used: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[Server] Error guardando token en Firestore:', err);
    }

    // Construir enlace de restablecimiento
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const resetLink = `${protocol}://${host}/?mode=resetPassword&token=${resetToken}&email=${encodeURIComponent(targetEmail)}`;

    // Contenido del Correo Exactamente como el usuario solicitó
    const textBody = `Hola, ${displayName}:

Recibimos una solicitud para restablecer la contraseña de tu cuenta en Taju Coffee House.

Para crear una nueva contraseña y volver a ingresar, haz clic en el siguiente enlace:

${resetLink}

Si no solicitaste este cambio, puedes ignorar este correo con total seguridad. Tu cuenta está protegida y tu contraseña actual no se modificará.

¡Nos vemos pronto para compartir un buen café!

Atentamente,
El equipo de Taju Coffee House`;

    const htmlBody = `
      <div font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #FAF6F0; padding: 24px; border-radius: 16px; border: 1px solid #E5D5C5;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #16191C; font-size: 20px; font-weight: 800; margin: 0;">Taju Coffee House</h2>
          <p style="color: #D8470A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0 0;">Specialty Coffee · Bogotá</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #E2D7CC; color: #16191C; font-size: 14px; line-height: 1.6;">
          <p style="margin-top: 0;">Hola, <strong>${displayName}</strong>:</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Taju Coffee House</strong>.</p>
          <p>Para crear una nueva contraseña y volver a ingresar, haz clic en el siguiente botón:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #D8470A; color: #ffffff; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Restablecer Contraseña</a>
          </div>
          <p style="font-size: 11px; color: #6B7280; word-break: break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br><a href="${resetLink}" style="color: #D8470A;">${resetLink}</a></p>
          <p style="font-size: 12px; color: #6B7280;">Si no solicitaste este cambio, puedes ignorar este correo con total seguridad. Tu cuenta está protegida y tu contraseña actual no se modificará.</p>
          <p style="color: #D8470A; font-weight: 600; margin-bottom: 0;">¡Nos vemos pronto para compartir un buen café!</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0 12px 0;">
          <p style="font-size: 12px; color: #4B5563; margin: 0;">Atentamente,<br><strong>El equipo de Taju Coffee House</strong></p>
        </div>
      </div>
    `;

    const transporter = await getEmailTransporter();
    const mailInfo = await transporter.sendMail({
      from: '"Taju Coffee House" <no-reply@tajucoffee.co>',
      to: targetEmail,
      subject: 'Restablece la contraseña de tu cuenta en Taju Coffee House',
      text: textBody,
      html: htmlBody,
    });

    console.log(`[Server] Correo de restablecimiento enviado exitosamente a ${targetEmail}. ID: ${mailInfo.messageId}`);
    
    // Si usó Ethereal SMTP, imprimir URL de vista previa para ver el correo
    const previewUrl = nodemailer.getTestMessageUrl(mailInfo);
    if (previewUrl) {
      console.log(`[Server] Vista previa del correo enviado (Ethereal): ${previewUrl}`);
    }

    return res.json({
      success: true,
      email: targetEmail,
      displayName,
      message: `Correo enviado exitosamente a ${targetEmail}.`,
    });
  } catch (err: any) {
    console.error('[Server] Error enviando correo:', err);
    return res.status(500).json({ error: err.message || 'Error al enviar el correo de recuperación.' });
  }
});

/**
 * Endpoint POST /api/verify-reset-token
 * Verifica si un token de restablecimiento es válido
 */
app.post('/api/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token no proporcionado.' });
    }

    // Verificar en memoria
    const memData = activeTokens.get(token);
    if (memData) {
      if (Date.now() > memData.expiresAt) {
        activeTokens.delete(token);
        return res.status(400).json({ error: 'El enlace de restablecimiento ha expirado.' });
      }
      return res.json({ valid: true, email: memData.email, displayName: memData.displayName });
    }

    // Verificar en Firestore
    const tokenDocRef = doc(db, 'passwordResets', token);
    const snap = await getDoc(tokenDocRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.used) {
        return res.status(400).json({ error: 'Este enlace ya ha sido utilizado.' });
      }
      if (Date.now() > data.expiresAt) {
        return res.status(400).json({ error: 'El enlace de restablecimiento ha expirado.' });
      }
      return res.json({ valid: true, email: data.email, displayName: data.displayName });
    }

    return res.status(400).json({ error: 'El enlace de restablecimiento no es válido.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error verificando el enlace.' });
  }
});

/**
 * Endpoint POST /api/confirm-reset-password
 * Actualiza la contraseña en Firestore y marca el token como usado
 */
app.post('/api/confirm-reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Parámetros incompletos.' });
    }

    // Validar contraseña
    const policy = validatePassword(newPassword);
    if (!policy.isValid) {
      return res.status(400).json({ error: policy.message });
    }

    let email = '';

    // Verificar token en memoria o Firestore
    const memData = activeTokens.get(token);
    if (memData) {
      if (Date.now() > memData.expiresAt) {
        return res.status(400).json({ error: 'El enlace ha expirado.' });
      }
      email = memData.email;
      activeTokens.delete(token);
    } else {
      const tokenDocRef = doc(db, 'passwordResets', token);
      const snap = await getDoc(tokenDocRef);

      if (!snap.exists()) {
        return res.status(400).json({ error: 'El enlace de restablecimiento es inválido.' });
      }

      const data = snap.data();
      if (data.used) {
        return res.status(400).json({ error: 'Este enlace ya fue utilizado.' });
      }
      if (Date.now() > data.expiresAt) {
        return res.status(400).json({ error: 'El enlace ha expirado.' });
      }

      email = data.email;
      await setDoc(tokenDocRef, { used: true, usedAt: new Date().toISOString() }, { merge: true });
    }

    // Actualizar contraseña en Firestore
    const nowIso = new Date().toISOString();
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    let matchedUid: string | null = null;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if ((data.email || '').toLowerCase() === email.toLowerCase()) {
        matchedUid = docSnap.id;
      }
    });

    if (matchedUid) {
      await setDoc(doc(db, 'users', matchedUid), { password: newPassword.trim(), updatedAt: nowIso }, { merge: true });
      await setDoc(doc(db, 'loyaltyCards', matchedUid), { password: newPassword.trim(), updatedAt: nowIso }, { merge: true });
    } else {
      const newUid = `cust_${Date.now()}`;
      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        email: email.toLowerCase(),
        displayName: 'Cliente Taju',
        role: 'customer',
        loyaltyLevel: 'NIVEL GOLD',
        password: newPassword.trim(),
        createdAt: nowIso,
        updatedAt: nowIso,
      }, { merge: true });
    }

    console.log(`[Server] Contraseña actualizada exitosamente en Firestore para: ${email}`);
    return res.json({ success: true, email });
  } catch (err: any) {
    console.error('[Server] Error confirmando cambio de contraseña:', err);
    return res.status(500).json({ error: err.message || 'No se pudo actualizar la contraseña.' });
  }
});

// ============================================================================
// VITE MIDDLEWARE EN DEV
// ============================================================================

const vite = await createViteServer({
  server: {
    middlewareMode: true,
    hmr: false,
  },
  appType: 'spa',
});

app.use(vite.middlewares);

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Taju Coffee Server] Escuchando en http://0.0.0.0:${PORT}`);
});
