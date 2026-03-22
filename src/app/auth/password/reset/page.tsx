'use client';

// Force dynamic rendering - required for React Context
export const dynamic = 'force-dynamic';

/**
 * Password Reset Page
 *
 * Handles password reset/setup when user clicks link from email.
 * URL: /auth/password/reset?token=...
 *
 * Used for:
 * - Admin-created users setting initial password
 * - Password reset requests
 *
 * Features:
 * - Password visibility toggle
 * - Password strength indicator
 * - Requirements checklist (matching RegisterModal)
 *
 * @governance httpOnly cookies for session management
 * @authority mandatory-verification-protocol.mdc
 */

import { useEffect, useState, useMemo, FormEvent, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/core/context/AuthContext';

type ResetStatus = 'form' | 'loading' | 'success' | 'redirecting' | 'error' | 'no-token';

interface PasswordStrength {
  score: number;
  strength: 'weak' | 'medium' | 'strong';
  color: string;
  label: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

/**
 * Calculate password strength (matches RegisterModal)
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  let score = 0;
  if (requirements.length) score++;
  if (password.length >= 12) score++;
  if (requirements.uppercase) score++;
  if (requirements.lowercase) score++;
  if (requirements.number) score++;
  if (requirements.special) score++;

  let strength: 'weak' | 'medium' | 'strong';
  let color: string;
  let label: string;

  if (score <= 2) {
    strength = 'weak';
    color = 'bg-red-500';
    label = 'Weak';
  } else if (score <= 4) {
    strength = 'medium';
    color = 'bg-yellow-500';
    label = 'Medium';
  } else {
    strength = 'strong';
    color = 'bg-green-500';
    label = 'Strong';
  }

  return { score, strength, color, label, requirements };
}

/**
 * Validate password against server requirements
 */
function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }

  return null;
}

/**
 * Fetch CSRF token for form submission
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
    if (data.ok && data.data?.csrfToken) {
      return data.data.csrfToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract error message from API response
 */
function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return 'Password reset failed. The token may be invalid or expired.';
  }

  const response = data as Record<string, unknown>;

  if (typeof response.message === 'string') {
    return response.message;
  }

  if (typeof response.error === 'string') {
    return response.error;
  }

  if (response.error && typeof response.error === 'object') {
    const errorObj = response.error as Record<string, unknown>;
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }

  if (typeof response.details === 'string') {
    return response.details;
  }

  return 'Password reset failed. The token may be invalid or expired.';
}

export default function PasswordResetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<ResetStatus>('form');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get token from URL
  const token = searchParams.get('token');

  // Password strength calculation
  const passwordStrength = useMemo(
    () => (password ? calculatePasswordStrength(password) : null),
    [password]
  );

  // Check for missing token on mount
  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      setMessage('No reset token provided.');
    }
  }, [token]);

  const handleValidatePassword = (value: string): boolean => {
    const error = validatePassword(value);
    setPasswordError(error || '');
    return !error;
  };

  const handleValidateConfirmPassword = (value: string): boolean => {
    if (!value) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (password !== value) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate fields
    const passwordValid = handleValidatePassword(password);
    const confirmValid = handleValidateConfirmPassword(confirmPassword);

    if (!passwordValid || !confirmValid) {
      return;
    }

    if (!token) {
      setStatus('no-token');
      return;
    }

    // Prevent double-submission
    setIsSubmitting(true);
    setStatus('loading');
    setMessage('');

    try {
      // Get CSRF token first
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) {
        setStatus('error');
        setMessage('Failed to get security token. Please refresh and try again.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/auth/password/reset', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok && (data.success || data.ok)) {
        // Check if auto-login was successful
        const responseData = data.data || data;
        if (responseData.autoLogin && responseData.user) {
          // Show welcome modal and trigger redirect
          setShowWelcomeModal(true);
          setStatus('redirecting');

          // Refresh user context to update auth state
          await refreshUser();

          // Wait 2 seconds for user to see the message, then redirect to homepage
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          // Fallback to manual login flow if auto-login failed
          setStatus('success');
          setMessage('Your password has been set successfully!');
        }
      } else {
        setStatus('error');
        setMessage(extractErrorMessage(data));
        setIsSubmitting(false);
      }
    } catch (err) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/');
  };

  const handleRetry = () => {
    setStatus('form');
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setConfirmPasswordError('');
    setMessage('');
    setIsSubmitting(false);
  };

  // Password strength indicator component
  const renderPasswordStrength = () => {
    if (!password || !passwordStrength) return null;

    return (
      <div className="mt-2">
        {/* Strength Bar */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
              style={{
                width:
                  passwordStrength.strength === 'weak'
                    ? '33%'
                    : passwordStrength.strength === 'medium'
                    ? '66%'
                    : '100%',
              }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600 min-w-[50px]">
            {passwordStrength.label}
          </span>
        </div>

        {/* Requirements Checklist */}
        <div className="text-xs text-gray-500 space-y-1 mt-2">
          <div className={passwordStrength.requirements.length ? 'text-green-600' : ''}>
            {passwordStrength.requirements.length ? '✓' : '○'} At least 8 characters
          </div>
          <div className={passwordStrength.requirements.uppercase ? 'text-green-600' : ''}>
            {passwordStrength.requirements.uppercase ? '✓' : '○'} One uppercase letter
          </div>
          <div className={passwordStrength.requirements.lowercase ? 'text-green-600' : ''}>
            {passwordStrength.requirements.lowercase ? '✓' : '○'} One lowercase letter
          </div>
          <div className={passwordStrength.requirements.number ? 'text-green-600' : ''}>
            {passwordStrength.requirements.number ? '✓' : '○'} One number
          </div>
        </div>
      </div>
    );
  };

  // Eye icon for show password
  const EyeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  // Eye off icon for hide password
  const EyeOffIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Bizconekt</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">
            Set Your Password
          </h2>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg">
          {status === 'form' && token && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) handleValidatePassword(e.target.value);
                      // Re-validate confirm if it has a value
                      if (confirmPassword) {
                        handleValidateConfirmPassword(confirmPassword);
                      }
                    }}
                    onBlur={() => handleValidatePassword(password)}
                    className={`
                      w-full px-3 py-2 pr-10 border rounded-lg
                      focus:outline-none focus:ring-2
                      ${passwordError
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                      }
                      transition-colors
                    `}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                )}
                {/* Password Strength Indicator */}
                {renderPasswordStrength()}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) handleValidateConfirmPassword(e.target.value);
                    }}
                    onBlur={() => handleValidateConfirmPassword(confirmPassword)}
                    className={`
                      w-full px-3 py-2 pr-10 border rounded-lg
                      focus:outline-none focus:ring-2
                      ${confirmPasswordError
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                      }
                      transition-colors
                    `}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !password || !confirmPassword || !!passwordError || !!confirmPasswordError}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set Password
              </button>
            </form>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Setting your password...</p>
            </div>
          )}

          {status === 'redirecting' && showWelcomeModal && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
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
              <h3 className="mt-4 text-xl font-semibold text-gray-900">
                Welcome!
              </h3>
              <p className="mt-3 text-base text-gray-600">
                Your email has been verified.
              </p>
              <p className="mt-2 text-base text-gray-600">
                You are now being logged in...
              </p>
              <div className="mt-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
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
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Password Set!
              </h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <p className="mt-2 text-sm text-gray-500">
                Your email has been verified. You can now sign in.
              </p>
              <button
                onClick={handleGoToLogin}
                className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continue to Login
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Reset Failed
              </h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
                <button
                  onClick={handleGoToLogin}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Home
                </button>
              </div>
            </div>
          )}

          {status === 'no-token' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Missing Token
              </h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <button
                onClick={handleGoToLogin}
                className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
