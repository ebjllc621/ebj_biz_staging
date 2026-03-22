/**
 * RegisterModal Component - User Registration Interface
 *
 * @authority mandatory-verification-protocol.mdc - httpOnly cookies
 * @pattern BizModal template, React 18 hooks
 * @governance Client-side validation, password strength requirements
 * @compliance master_build_v_4_4_0.md section 9.2 (BizModal required)
 * @tier STANDARD
 * @generated 2025-12-23
 * @dna-version v11.0.1
 *
 * FEATURES:
 * - Email/password/name registration form
 * - Password strength validation with visual indicator
 * - Confirm password matching
 * - Client-side validation with real-time feedback
 * - Loading states during registration
 * - Error display with specific messages
 * - Integration with useAuth hook
 * - BizModal template compliance (100%)
 * - SUCCESS STATE: In-modal confirmation after successful registration
 *
 * PASSWORD REQUIREMENTS (Server-Side Enforced):
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * Client-side validation mirrors these for UX
 *
 * MODES:
 * 1. FORM - Default registration form
 * 2. SUCCESS - Post-registration confirmation with next steps
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import BizModal from '@/components/BizModal';
import BizButton from '@/components/BizButton';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RegisterModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Optional callback to switch to login modal */
  onSwitchToLogin?: () => void;
  /** Optional callback when registration succeeds (for email verification flow) */
  onRegistrationSuccess?: (_email: string) => void;
  /** Optional callback when registration succeeds (simplified) */
  onSuccess?: () => void;
  /** Optional referral code from platform invite link */
  referralCode?: string;
}

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
// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate name field
 */
function validateName(name: string): string | null {
  if (!name.trim()) {
    return 'Name is required';
  }

  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }

  if (name.length > 50) {
    return 'Name must be less than 50 characters';
  }

  return null;
}

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
 * Validate username format
 */
function validateUsername(username: string): string | null {
  if (!username.trim()) {
    return 'Username is required';
  }

  if (username.trim().length < 3) {
    return 'Username must be at least 3 characters';
  }

  if (username.length > 30) {
    return 'Username must be 30 characters or less';
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }

  return null;
}

/**
 * Validate password against server requirements
 * Mirrors server-side validation for better UX
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
 * Validate confirm password matches
 */
function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
}

/**
 * Calculate password strength
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

// ============================================================================
// REGISTERMODAL COMPONENT
// ============================================================================

/**
 * RegisterModal - BizModal-based registration form with password strength
 *
 * @example
 * ```tsx
 * <RegisterModal
 *   isOpen={showRegister}
 *   onClose={() => setShowRegister(false)}
 *   onSwitchToLogin={() => {
 *     setShowRegister(false);
 *     setShowLogin(true);
 *   }}
 *   onRegistrationSuccess={(email) => {
 *     setShowRegister(false);
 *     setShowVerification(true);
 *     setVerificationEmail(email);
 *   }}
 * />
 * ```
 */
export default function RegisterModal({
  isOpen,
  onClose,
  onSwitchToLogin,
  onRegistrationSuccess,
  onSuccess,
  referralCode,
}: RegisterModalProps) {
  const { register, loading: authLoading } = useAuth();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validation state
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Username availability state
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength calculation
  const passwordStrength = useMemo(
    () => (password ? calculatePasswordStrength(password) : null),
    [password]
  );

  // ============================================================================
  // FORM RESET
  // ============================================================================

  /**
   * Reset all form state
   */
  const resetForm = useCallback(() => {
    setName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setNameError('');
    setEmailError('');
    setUsernameError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUsernameAvailable(null);
  }, []);

  // ============================================================================
  // VALIDATION HANDLERS
  // ============================================================================

  const handleValidateName = useCallback((value: string): boolean => {
    const error = validateName(value);
    setNameError(error || '');
    return !error;
  }, []);

  const handleValidateEmail = useCallback((value: string): boolean => {
    const error = validateEmail(value);
    setEmailError(error || '');
    return !error;
  }, []);

  const handleValidateUsername = useCallback((value: string): boolean => {
    const error = validateUsername(value);
    setUsernameError(error || '');
    return !error;
  }, []);

  // Check username availability via API
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck.trim() || usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Validate format first
    const formatError = validateUsername(usernameToCheck);
    if (formatError) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    try {
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(usernameToCheck)}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsernameAvailable(data.data?.available ?? data.available ?? false);
        if (!data.data?.available && !data.available) {
          setUsernameError('Username is already taken');
        } else {
          setUsernameError('');
        }
      }
    } catch {
      // Silent fail - form validation will catch on submit
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  }, []);

  // Handle email change with username auto-population
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (emailError) handleValidateEmail(newEmail);

    // Auto-generate username from email prefix if username hasn't been manually edited
    // or if current username matches the old email prefix
    const oldEmailPrefix = email.split('@')[0] || '';
    const newEmailPrefix = newEmail.split('@')[0] || '';

    if (!username || username === oldEmailPrefix) {
      setUsername(newEmailPrefix);
      setUsernameAvailable(null); // Reset availability check for new username
      setUsernameError('');
    }
  }, [email, username, emailError, handleValidateEmail]);

  const handleValidatePassword = useCallback((value: string): boolean => {
    const error = validatePassword(value);
    setPasswordError(error || '');
    return !error;
  }, []);

  const handleValidateConfirmPassword = useCallback(
    (value: string): boolean => {
      const error = validateConfirmPassword(password, value);
      setConfirmPasswordError(error || '');
      return !error;
    },
    [password]
  );

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
      const nameValid = handleValidateName(name);
      const emailValid = handleValidateEmail(email);
      const usernameValid = handleValidateUsername(username);
      const passwordValid = handleValidatePassword(password);
      const confirmValid = handleValidateConfirmPassword(confirmPassword);

      if (!nameValid || !emailValid || !usernameValid || !passwordValid || !confirmValid) {
        return;
      }

      // Check username availability if not already checked
      if (usernameAvailable === false) {
        setUsernameError('Username is already taken. Please choose a different one.');
        return;
      }

      try {
        setSubmitting(true);

        const result = await register({
          name,
          email,
          username,
          password,
          confirmPassword,
          referralCode, // Include referral code from platform invite
        });

        if (result.success) {
          // Registration successful - notify parent to show success modal
          const successEmail = email;

          // Reset form state
          resetForm();

          // Call parent callbacks
          // onSuccess is simplified callback (e.g., from /join page)
          if (onSuccess) {
            onSuccess();
          }
          // onRegistrationSuccess is for email verification flow (from AuthButtons)
          if (onRegistrationSuccess) {
            onRegistrationSuccess(successEmail);
          }
        } else {
          // Registration failed - show error
          setGeneralError(result.error || 'Registration failed. Please try again.');
        }
      } catch {
        setGeneralError('An unexpected error occurred. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [
      name,
      email,
      username,
      password,
      confirmPassword,
      usernameAvailable,
      register,
      resetForm,
      onRegistrationSuccess,
      onSuccess,
      referralCode,
      handleValidateName,
      handleValidateEmail,
      handleValidateUsername,
      handleValidatePassword,
      handleValidateConfirmPassword,
    ]
  );

  // ============================================================================
  // MODAL HANDLERS
  // ============================================================================

  const handleSwitchToLogin = useCallback(() => {
    if (onSwitchToLogin) {
      resetForm();
      onSwitchToLogin();
    }
  }, [onSwitchToLogin, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // ============================================================================
  // COMPUTED STATE
  // ============================================================================

  const isLoading = submitting || authLoading;
  const hasValidationErrors = !!(nameError || emailError || usernameError || passwordError || confirmPasswordError);
  const canSubmit = name && email && username && password && confirmPassword && !isLoading && !hasValidationErrors && usernameAvailable !== false;

  // ============================================================================
  // RENDER HELPER: Password Strength Indicator
  // ============================================================================

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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Account"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General Error Message */}
        {generalError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{generalError}</p>
          </div>
        )}

        {/* Name Field */}
        <div>
          <label
            htmlFor="register-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full Name
          </label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) handleValidateName(e.target.value);
            }}
            onBlur={() => handleValidateName(name)}
            disabled={isLoading}
            className={`
              w-full px-3 py-2 border rounded-lg
              focus:outline-none focus:ring-2
              ${nameError
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-bizconekt-primary'
              }
              disabled:bg-gray-100 disabled:cursor-not-allowed
              transition-colors
            `}
            placeholder="John Doe"
            autoComplete="name"
          />
          {nameError && (
            <p className="mt-1 text-sm text-red-600">{nameError}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="register-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={handleEmailChange}
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

        {/* Username Field */}
        <div>
          <label
            htmlFor="register-username"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">@</span>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => {
                const newUsername = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                setUsername(newUsername);
                if (usernameError) handleValidateUsername(newUsername);
                setUsernameAvailable(null); // Reset availability when typing
              }}
              onBlur={() => {
                handleValidateUsername(username);
                if (username.length >= 3) {
                  checkUsernameAvailability(username);
                }
              }}
              disabled={isLoading}
              className={`
                w-full pl-7 pr-10 py-2 border rounded-lg
                focus:outline-none focus:ring-2
                ${usernameError
                  ? 'border-red-300 focus:ring-red-500'
                  : usernameAvailable === true
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-gray-300 focus:ring-bizconekt-primary'
                }
                disabled:bg-gray-100 disabled:cursor-not-allowed
                transition-colors
              `}
              placeholder="yourusername"
              autoComplete="username"
            />
            {usernameChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-bizconekt-primary border-t-transparent rounded-full" />
              </div>
            )}
            {usernameAvailable === true && !usernameChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {usernameAvailable === false && !usernameChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          {usernameError && (
            <p className="mt-1 text-sm text-red-600">{usernameError}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Letters, numbers, and underscores only. Auto-generated from email but you can change it.
          </p>
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="register-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
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
              placeholder="Create a strong password"
              autoComplete="new-password"
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

          {/* Password Strength Indicator */}
          {renderPasswordStrength()}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="register-confirm-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmPasswordError) handleValidateConfirmPassword(e.target.value);
              }}
              onBlur={() => handleValidateConfirmPassword(confirmPassword)}
              disabled={isLoading}
              className={`
                w-full px-3 py-2 pr-10 border rounded-lg
                focus:outline-none focus:ring-2
                ${confirmPasswordError
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-bizconekt-primary'
                }
                disabled:bg-gray-100 disabled:cursor-not-allowed
                transition-colors
              `}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="
                absolute right-3 top-1/2 -translate-y-1/2
                text-gray-500 hover:text-gray-700
                focus:outline-none focus:text-gray-700
              "
              disabled={isLoading}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
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
          {confirmPasswordError && (
            <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>
          )}
        </div>

        {/* Terms Agreement Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-600">
            By creating an account, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-bizconekt-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-bizconekt-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>

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
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </BizButton>
        </div>

        {/* Switch to Login */}
        {onSwitchToLogin && (
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleSwitchToLogin}
                disabled={isLoading}
                className="text-bizconekt-primary hover:text-bizconekt-primaryDark hover:underline font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </form>
    </BizModal>
  );
}
