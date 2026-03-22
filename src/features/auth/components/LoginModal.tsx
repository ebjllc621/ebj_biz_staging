/**
 * LoginModal Component - User Login Interface
 *
 * @authority mandatory-verification-protocol.mdc - httpOnly cookies
 * @pattern BizModal template, React 18 hooks
 * @governance NO localStorage for tokens, client-side validation mandatory
 * @compliance master_build_v_4_4_0.md section 9.2 (BizModal required)
 *
 * FEATURES:
 * - Email/password login form
 * - Client-side validation with real-time feedback
 * - Loading states during authentication
 * - Error display with specific messages
 * - Integration with useAuth hook (Phase 7A)
 * - BizModal template compliance (100%)
 * - Password visibility toggle
 * - Switch to register modal
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import BizModal from '@/components/BizModal';
import BizButton from '@/components/BizButton';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LoginModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Optional callback to switch to register modal */
  onSwitchToRegister?: () => void;
  /** Optional callback to open forgot password flow */
  onForgotPassword?: () => void;
  /** Optional initial email to pre-fill (e.g., from email verification) */
  initialEmail?: string;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format
 */
function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }

  return null;
}

/**
 * Validate password (basic presence check for login)
 */
function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  return null;
}

// ============================================================================
// LOGINMODAL COMPONENT
// ============================================================================

/**
 * LoginModal - BizModal-based login form
 *
 * @example
 * ```tsx
 * <LoginModal
 *   isOpen={showLogin}
 *   onClose={() => setShowLogin(false)}
 *   onSwitchToRegister={() => {
 *     setShowLogin(false);
 *     setShowRegister(true);
 *   }}
 * />
 * ```
 */
export default function LoginModal({
  isOpen,
  onClose,
  onSwitchToRegister,
  onForgotPassword,
  initialEmail = '',
}: LoginModalProps) {
  const { login, loading: authLoading } = useAuth();

  // Form state - initialize email with initialEmail prop if provided
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');

  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ============================================================================
  // INITIAL EMAIL SYNC
  // ============================================================================

  /**
   * Update email field when modal opens with a pre-filled email
   * (e.g., from email verification flow)
   */
  useEffect(() => {
    if (isOpen && initialEmail) {
      setEmail(initialEmail);
    }
  }, [isOpen, initialEmail]);

  // ============================================================================
  // FORM RESET
  // ============================================================================

  /**
   * Reset all form state
   */
  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
    setShowPassword(false);
  }, []);

  // ============================================================================
  // VALIDATION HANDLERS
  // ============================================================================

  /**
   * Validate email and update error state
   */
  const handleValidateEmail = useCallback((value: string): boolean => {
    const error = validateEmail(value);
    setEmailError(error || '');
    return !error;
  }, []);

  /**
   * Validate password and update error state
   */
  const handleValidatePassword = useCallback((value: string): boolean => {
    const error = validatePassword(value);
    setPasswordError(error || '');
    return !error;
  }, []);

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Clear previous general error
      setGeneralError('');

      // Validate all fields
      const emailValid = handleValidateEmail(email);
      const passwordValid = handleValidatePassword(password);

      if (!emailValid || !passwordValid) {
        return;
      }

      try {
        setSubmitting(true);

        const result = await login({ email, password });

        if (result.success) {
          // Login successful - reset form and close modal
          resetForm();
          onClose();
        } else {
          // Login failed - show error
          setGeneralError(result.error || 'Login failed. Please try again.');
        }
      } catch {
        setGeneralError('An unexpected error occurred. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, login, handleValidateEmail, handleValidatePassword, resetForm, onClose]
  );

  // ============================================================================
  // MODAL HANDLERS
  // ============================================================================

  /**
   * Handle switching to register modal
   */
  const handleSwitchToRegister = useCallback(() => {
    if (onSwitchToRegister) {
      resetForm();
      onSwitchToRegister();
    }
  }, [onSwitchToRegister, resetForm]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // ============================================================================
  // COMPUTED STATE
  // ============================================================================

  const isLoading = submitting || authLoading;
  const canSubmit = email && password && !isLoading;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Sign In"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General Error Message */}
        {generalError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{generalError}</p>
          </div>
        )}

        {/* Email Field */}
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) handleValidateEmail(e.target.value);
            }}
            onBlur={() => handleValidateEmail(email)}
            disabled={isLoading}
            className={`
              w-full px-3 py-2 border rounded-lg
              focus:outline-none focus:ring-2
              ${emailError
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-bizconekt-primary'
              }
              disabled:bg-gray-100 disabled:cursor-not-allowed
              transition-colors
            `}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {emailError && (
            <p className="mt-1 text-sm text-red-600">{emailError}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) handleValidatePassword(e.target.value);
              }}
              onBlur={() => handleValidatePassword(password)}
              disabled={isLoading}
              className={`
                w-full px-3 py-2 pr-10 border rounded-lg
                focus:outline-none focus:ring-2
                ${passwordError
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-bizconekt-primary'
                }
                disabled:bg-gray-100 disabled:cursor-not-allowed
                transition-colors
              `}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="
                absolute right-3 top-1/2 -translate-y-1/2
                text-gray-500 hover:text-gray-700
                focus:outline-none focus:text-gray-700
              "
              disabled={isLoading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
          {passwordError && (
            <p className="mt-1 text-sm text-red-600">{passwordError}</p>
          )}
        </div>

        {/* Forgot Password Link */}
        {onForgotPassword && (
          <div className="text-right">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-bizconekt-primary hover:text-bizconekt-primaryDark hover:underline"
              disabled={isLoading}
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <BizButton
            variant="neutral"
            onClick={handleClose}
            disabled={isLoading}
            fullWidth
          >
            Cancel
          </BizButton>

          <BizButton
            type="submit"
            variant="primary"
            disabled={!canSubmit}
            loading={isLoading}
            fullWidth
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </BizButton>
        </div>

        {/* Switch to Register */}
        {onSwitchToRegister && (
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={handleSwitchToRegister}
                disabled={isLoading}
                className="text-bizconekt-primary hover:text-bizconekt-primaryDark hover:underline font-medium"
              >
                Sign Up
              </button>
            </p>
          </div>
        )}
      </form>
    </BizModal>
  );
}
