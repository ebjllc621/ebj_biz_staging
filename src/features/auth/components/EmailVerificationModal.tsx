/**
 * EmailVerificationModal Component - Email Verification Flow UI
 *
 * @authority mandatory-verification-protocol.mdc
 * @pattern BizModal template, React 18 hooks
 * @governance Client-side validation, CSRF protection via useAuth
 * @compliance master_build_v_4_4_0.md section 9.2 (BizModal required)
 *
 * FEATURES:
 * - Token input for verification
 * - Resend verification email functionality
 * - Success/error state handling
 * - Loading states during API calls
 * - BizModal template compliance (100%)
 *
 * MODES:
 * 1. PENDING - User just registered, waiting to verify
 * 2. INPUT - User entering verification token
 * 3. SUCCESS - Email verified successfully
 *
 * API ENDPOINTS:
 * - POST /api/auth/verify - Verify with token
 * - POST /api/auth/verify/resend - Resend verification email
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal';
import BizButton from '@/components/BizButton';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EmailVerificationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Email address for verification */
  email: string;
  /** Optional callback on successful verification */
  onVerificationSuccess?: () => void;
  /** Initial mode of the modal */
  initialMode?: 'pending' | 'input';
}

type VerificationMode = 'pending' | 'input' | 'success';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch CSRF token for protected API calls
 */
async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if ((data.ok || data.success) && data.data?.csrfToken) {
      return data.data.csrfToken;
    }

    return null;
  } catch (err) {
    return null;
  }
}

// ============================================================================
// EMAILVERIFICATIONMODAL COMPONENT
// ============================================================================

/**
 * EmailVerificationModal - BizModal-based email verification flow
 *
 * @example
 * ```tsx
 * <EmailVerificationModal
 *   isOpen={showVerification}
 *   onClose={() => setShowVerification(false)}
 *   email="user@example.com"
 *   onVerificationSuccess={() => {
 *     setShowVerification(false);
 *     // Redirect to dashboard
 *   }}
 * />
 * ```
 */
export default function EmailVerificationModal({
  isOpen,
  onClose,
  email,
  onVerificationSuccess,
  initialMode = 'pending',
}: EmailVerificationModalProps) {
  // Mode state
  const [mode, setMode] = useState<VerificationMode>(initialMode);

  // Form state
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setToken('');
      setTokenError('');
      setGeneralError('');
      setSuccessMessage('');
    }
  }, [isOpen, initialMode]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ============================================================================
  // FORM RESET
  // ============================================================================

  const resetForm = useCallback(() => {
    setMode(initialMode);
    setToken('');
    setTokenError('');
    setGeneralError('');
    setSuccessMessage('');
  }, [initialMode]);

  // ============================================================================
  // VERIFICATION HANDLER
  // ============================================================================

  /**
   * Submit verification token
   */
  const handleVerify = useCallback(async () => {
    // Validate token
    if (!token.trim()) {
      setTokenError('Verification code is required');
      return;
    }

    // Clear errors
    setTokenError('');
    setGeneralError('');

    try {
      setLoading(true);

      // Call verify API
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim() })
      });

      const data = await response.json();

      if (response.ok && (data.ok || data.success)) {
        // Verification successful
        setMode('success');
        setSuccessMessage('Your email has been verified successfully!');

        // Auto-close after 2 seconds and trigger callback
        setTimeout(() => {
          if (onVerificationSuccess) {
            onVerificationSuccess();
          } else {
            onClose();
          }
        }, 2000);
      } else {
        // Verification failed
        const errorMessage = data.message || data.error?.message || 'Invalid or expired verification code';
        setGeneralError(errorMessage);
      }
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, onVerificationSuccess, onClose]);

  // ============================================================================
  // RESEND HANDLER
  // ============================================================================

  /**
   * Resend verification email
   */
  const handleResend = useCallback(async () => {
    // Check cooldown
    if (resendCooldown > 0) {
      return;
    }

    // Clear messages
    setGeneralError('');
    setSuccessMessage('');

    try {
      setResendLoading(true);

      // Call resend API
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/verify/resend', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok && (data.ok || data.success)) {
        setSuccessMessage('Verification email sent! Check your inbox.');
        // Set 60 second cooldown
        setResendCooldown(60);
      } else {
        const errorMessage = data.message || data.error?.message || 'Failed to resend verification email';
        setGeneralError(errorMessage);
      }
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }, [email, resendCooldown]);

  // ============================================================================
  // MODAL HANDLERS
  // ============================================================================

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // ============================================================================
  // RENDER: PENDING MODE
  // ============================================================================

  const renderPendingMode = () => (
    <div className="space-y-4 text-center">
      {/* Email Icon */}
      <div className="mx-auto w-16 h-16 bg-bizconekt-primaryLight rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-bizconekt-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      {/* Message */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Verify Your Email
        </h3>
        <p className="text-sm text-gray-600">
          We&apos;ve sent a verification link to:
        </p>
        <p className="text-sm font-medium text-gray-900 mt-1">{email}</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {generalError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{generalError}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
        <p className="text-sm text-gray-600">
          Please check your email and click the verification link, or enter the verification code below.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2">
        <BizButton
          variant="primary"
          onClick={() => setMode('input')}
          fullWidth
        >
          Enter Verification Code
        </BizButton>

        <BizButton
          variant="outline"
          onClick={handleResend}
          disabled={resendLoading || resendCooldown > 0}
          loading={resendLoading}
          fullWidth
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
        </BizButton>

        <BizButton
          variant="ghost"
          onClick={handleClose}
          fullWidth
        >
          I&apos;ll verify later
        </BizButton>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: INPUT MODE
  // ============================================================================

  const renderInputMode = () => (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setMode('pending')}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Instructions */}
      <p className="text-sm text-gray-600">
        Enter the verification code from your email:
      </p>

      {/* Error Messages */}
      {generalError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{generalError}</p>
        </div>
      )}

      {/* Token Input */}
      <div>
        <label
          htmlFor="verification-token"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Verification Code
        </label>
        <input
          id="verification-token"
          type="text"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            if (tokenError) setTokenError('');
          }}
          disabled={loading}
          className={`
            w-full px-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2
            ${tokenError
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-bizconekt-primary'
            }
            disabled:bg-gray-100 disabled:cursor-not-allowed
            transition-colors text-center text-lg tracking-widest
          `}
          placeholder="Enter code"
          autoComplete="one-time-code"
        />
        {tokenError && (
          <p className="mt-1 text-sm text-red-600">{tokenError}</p>
        )}
      </div>

      {/* Submit Button */}
      <BizButton
        variant="primary"
        onClick={handleVerify}
        disabled={!token.trim()}
        loading={loading}
        fullWidth
      >
        {loading ? 'Verifying...' : 'Verify Email'}
      </BizButton>

      {/* Resend Link */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendLoading || resendCooldown > 0}
          className="text-sm text-bizconekt-primary hover:text-bizconekt-primaryDark hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive the code? Resend"}
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: SUCCESS MODE
  // ============================================================================

  const renderSuccessMode = () => (
    <div className="space-y-4 text-center">
      {/* Success Icon */}
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* Success Message */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Email Verified!
        </h3>
        <p className="text-sm text-gray-600">
          {successMessage || 'Your email has been verified successfully.'}
        </p>
      </div>

      {/* Auto-close notice */}
      <p className="text-xs text-gray-500">
        This window will close automatically...
      </p>
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === 'success'
          ? 'Email Verified'
          : mode === 'input'
          ? 'Enter Verification Code'
          : 'Verify Your Email'
      }
      maxWidth="sm"
      closeOnBackdropClick={mode !== 'success'}
      closeOnEscape={mode !== 'success'}
      showCloseButton={mode !== 'success'}
    >
      {mode === 'pending' && renderPendingMode()}
      {mode === 'input' && renderInputMode()}
      {mode === 'success' && renderSuccessMode()}
    </BizModal>
  );
}
