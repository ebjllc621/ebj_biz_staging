/**
 * PasswordStrengthIndicator - Visual password strength feedback
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 */

'use client';

import { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthConfig {
  level: StrengthLevel;
  label: string;
  color: string;
  bgColor: string;
  width: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo((): StrengthConfig => {
    if (!password || password.length < 8) {
      return {
        level: 'weak',
        label: 'Weak',
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        width: 'w-1/4'
      };
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLong = password.length >= 12;

    const score = [hasUppercase, hasLowercase, hasNumber, hasSpecial, isLong].filter(Boolean).length;

    if (score >= 4) {
      return {
        level: 'strong',
        label: 'Strong',
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        width: 'w-full'
      };
    } else if (score >= 3) {
      return {
        level: 'good',
        label: 'Good',
        color: 'text-orange-600',
        bgColor: 'bg-orange-500',
        width: 'w-3/4'
      };
    } else if (score >= 1) {
      return {
        level: 'fair',
        label: 'Fair',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        width: 'w-1/2'
      };
    }

    return {
      level: 'weak',
      label: 'Weak',
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      width: 'w-1/4'
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Password strength:</span>
        <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${strength.bgColor} ${strength.width} transition-all duration-300`}
        />
      </div>
    </div>
  );
}

export default PasswordStrengthIndicator;
