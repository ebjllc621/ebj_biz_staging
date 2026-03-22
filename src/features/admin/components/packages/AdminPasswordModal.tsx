/**
 * AdminPasswordModal - Admin password confirmation for destructive operations
 *
 * GOVERNANCE COMPLIANCE:
 * - BizModal wrapper MANDATORY
 * - Password never logged in plaintext
 * - Reusable for admin operations
 * - Password visibility toggle
 * - TIER: STANDARD
 *
 * Pattern adapted from:
 * - src/app/admin/users/page.tsx (lines 548-672)
 * - src/app/admin/categories/page.tsx (lines 1018-1200)
 *
 * @authority docs/packages/phases/PHASE_2_BRAIN_PLAN.md - Section 2.6
 * @component
 */

'use client';

import { useState, useCallback, FormEvent } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  operationDescription: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminPasswordModal({
  isOpen,
  onClose,
  onVerified,
  operationDescription
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  /**
   * Reset form state
   */
  const resetForm = useCallback(() => {
    setPassword('');
    setShowPassword(false);
    setError(null);
    setIsVerifying(false);
  }, []);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  /**
   * Handle password verification
   */
  const handleVerify = useCallback(async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const data = await response.json();
        // Handle nested error format from apiHandler
        throw new Error(data.error?.message || data.message || 'Password verification failed');
      }

      // Password verified successfully
      resetForm();
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password verification failed');
      setPassword(''); // Clear password on error
    } finally {
      setIsVerifying(false);
    }
  }, [password, onVerified, resetForm]);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Admin Password Required"
    >
      <form onSubmit={handleVerify} className="p-6">
        {/* Warning Banner */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Authentication Required
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              You are about to{' '}
              <span className="font-semibold">{operationDescription}</span>.
              Please verify your admin password to continue.
            </p>
          </div>
        </div>

        {/* Password Input */}
        <div className="mb-4">
          <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
            Admin Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null); // Clear error on input change
              }}
              placeholder="Enter your admin password"
              className={`w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isVerifying}
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isVerifying}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Security Note */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Security Note:</strong> Your password is verified securely and never stored in plaintext.
            This verification is required for all destructive operations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <BizModalButton
            variant="secondary"
            onClick={handleClose}
            disabled={isVerifying}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            type="submit"
            disabled={isVerifying || !password.trim()}
          >
            {isVerifying ? 'Verifying...' : 'Verify Password'}
          </BizModalButton>
        </div>
      </form>
    </BizModal>
  );
}
