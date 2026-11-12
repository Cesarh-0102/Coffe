/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Validador Oficial de Políticas de Contraseñas - Taju Coffee House
 * 
 * Reglas estrictas requeridas:
 * 1. Al menos una letra mayúscula (A-Z)
 * 2. Al menos una letra minúscula (a-z)
 * 3. Al menos 3 números (0-9)
 * 4. Al menos un carácter especial (!@#$%^&*()_+-=[]{};':"|,.<>/?`~)
 * 5. Mínimo 6 caracteres
 */

export interface PasswordRuleCheck {
  id: 'uppercase' | 'lowercase' | 'numbers' | 'special' | 'length';
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasThreeNumbers: boolean;
  hasSpecialChar: boolean;
  hasMinLength: boolean;
  rules: PasswordRuleCheck[];
  errorMessage: string | null;
}

/**
 * Valida si una contraseña cumple con todas las políticas requeridas:
 * - Una mayúscula
 * - Una minúscula
 * - 3 números
 * - Un carácter especial
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const p = password || '';

  const hasUppercase = /[A-Z]/.test(p);
  const hasLowercase = /[a-z]/.test(p);
  const numbersMatch = p.match(/[0-9]/g) || [];
  const hasThreeNumbers = numbersMatch.length >= 3;
  // Caracteres especiales: símbolos o puntuación no alfanuméricos
  const hasSpecialChar = /[^a-zA-Z0-9\s]/.test(p);
  const hasMinLength = p.length >= 6;

  const rules: PasswordRuleCheck[] = [
    {
      id: 'uppercase',
      label: 'Al menos 1 letra mayúscula (A-Z)',
      met: hasUppercase,
    },
    {
      id: 'lowercase',
      label: 'Al menos 1 letra minúscula (a-z)',
      met: hasLowercase,
    },
    {
      id: 'numbers',
      label: 'Al menos 3 números (ej. 123)',
      met: hasThreeNumbers,
    },
    {
      id: 'special',
      label: 'Al menos 1 carácter especial (ej. !@#$*.-)',
      met: hasSpecialChar,
    },
    {
      id: 'length',
      label: 'Mínimo 6 caracteres',
      met: hasMinLength,
    },
  ];

  const pendingRules: string[] = [];
  if (!hasUppercase) pendingRules.push('1 mayúscula');
  if (!hasLowercase) pendingRules.push('1 minúscula');
  if (!hasThreeNumbers) pendingRules.push('3 números');
  if (!hasSpecialChar) pendingRules.push('1 carácter especial');
  if (!hasMinLength) pendingRules.push('mínimo 6 caracteres');

  const isValid = hasUppercase && hasLowercase && hasThreeNumbers && hasSpecialChar && hasMinLength;

  let errorMessage: string | null = null;
  if (!isValid) {
    errorMessage = `La contraseña debe contener: ${pendingRules.join(', ')}.`;
  }

  return {
    isValid,
    hasUppercase,
    hasLowercase,
    hasThreeNumbers,
    hasSpecialChar,
    hasMinLength,
    rules,
    errorMessage,
  };
}
