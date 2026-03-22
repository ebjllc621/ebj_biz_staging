/**
 * AdminPasswordModal - Password verification gate for destructive admin operations
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @tier STANDARD
 *
 * GOVERNANCE:
 * - BizModal wrapper MANDATORY
 * - Password never logged in plaintext
 * - 3-strike lockout with countdown timer
 * - PII-compliant error messages
 *
 * Features:
 * - Password input with autoFocus
 * - Password visibility toggle (Eye/EyeOff icons)
 * - Failed attempt tracking
 * - Lockout countdown display
 * - Enter key submits password
 * - Password manager guards
 */

'use client';

import { useState, useEffect } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Eye, EyeOff } from 'lucide-react';

export interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  operationDescription: string;
  /** Optional unique ID suffix for input fields (default: 'admin-password') */
  inputIdSuffix?: string;
}

export function AdminPasswordModal({
  isOpen,
  onClose,
  onVerified,
  operationDescription,
  inputIdSuffix = 'admin-password'
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setAttemptsRemaining(null);
      setLockedUntil(null);
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const now = new Date();
      if (now >= lockedUntil) {
        setLockedUntil(null);
        setError(null);
        setAttemptsRemaining(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleVerify = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/admin/verify-password', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        // Success: Password verified
        onVerified();
        onClose();
      } else {
        // Failure: Invalid password or lockout
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Invalid password';
        const details = errorData.error?.details;

        setError(errorMessage);

        // Update attempts remaining if provided
        if (details?.attempts_remaining !== undefined) {
          setAttemptsRemaining(details.attempts_remaining);
        }

        // Update lockout time if provided
        if (details?.locked_until) {
          setLockedUntil(new Date(details.locked_until));
        }
      }
    } catch {
      setError('Failed to verify password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying && !lockedUntil) {
      handleVerify();
    }
  };

  const getRemainingTime = () => {
    if (!lockedUntil) return '';
    const now = new Date();
    const remainingMs = lockedUntil.getTime() - now.getTime();
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const inputId = `${inputIdSuffix}-input`;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Admin Password"
      size="small"
    >
      <div className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-700">
          Enter your admin password to <strong>{operationDescription}</strong>.
        </p>

        {/* Password input with visibility toggle */}
        {/* PASSWORD MANAGER GUARDS: Prevent autofill from interfering with admin confirmation */}
        <div data-form-type="other">
          {/* Hidden honeypot field to confuse password managers */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            Admin Password
          </label>
          <div className="relative">
            <input
              id={inputId}
              name="admin-confirm-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isVerifying || !!lockedUntil}
              autoFocus
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your password"
              aria-label="Admin password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isVerifying || !!lockedUntil}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="polite">
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </p>
            {attemptsRemaining !== null && attemptsRemaining > 0 && (
              <p className="text-xs text-red-600 mt-1">
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>
        )}

        {/* Lockout warning */}
        {lockedUntil && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md" role="alert" aria-live="polite">
            <p className="text-sm text-yellow-700">
              <strong>Account Locked:</strong> Too many failed attempts.
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Try again in {getRemainingTime()}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
            disabled={isVerifying}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="danger"
            onClick={handleVerify}
            disabled={isVerifying || !!lockedUntil || !password.trim()}
          >
            {isVerifying ? 'Verifying...' : 'Verify Password'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

export default AdminPasswordModal;
