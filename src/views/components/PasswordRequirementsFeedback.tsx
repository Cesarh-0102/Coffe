/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Componente visual de retroalimentación de requisitos de contraseña
 * Taju Coffee House
 */

import React from 'react';
import { Check, X } from 'lucide-react';
import { validatePasswordPolicy } from '../../services/passwordValidator';

interface PasswordRequirementsFeedbackProps {
  password: string;
  showAlways?: boolean;
}

export const PasswordRequirementsFeedback: React.FC<PasswordRequirementsFeedbackProps> = ({
  password,
  showAlways = false,
}) => {
  if (!showAlways && !password) return null;

  const result = validatePasswordPolicy(password);

  return (
    <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-2.5 text-[11px] font-sans space-y-1 mt-1.5 animate-in fade-in">
      <p className="font-bold uppercase tracking-wider text-amber-900 text-[10px] mb-1">
        Requisitos obligatorios de contraseña:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
        {result.rules.map((rule) => (
          <div
            key={rule.id}
            className={`flex items-center space-x-1.5 transition-colors ${
              rule.met ? 'text-emerald-700 font-medium' : 'text-gray-500'
            }`}
          >
            {rule.met ? (
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              </div>
            )}
            <span className="leading-tight">{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
