/**
 * AuthButtons Component - Public Auth UI Entry Point
 *
 * @authority mandatory-verification-protocol.mdc - httpOnly cookies
 * @pattern React 18 hooks, modal state management
 * @governance Manages authentication UI state, NO localStorage
 * @compliance master_build_v_4_4_0.md section 9.2 (BizModal required)
 *
 * FEATURES:
 * - Shows Sign In / Sign Up buttons when logged out
 * - Shows UserMenu when logged in
 * - Manages modal open/close state
 * - Handles switching between modals (login <-> register)
 * - Shows RegistrationSuccessModal after successful registration
 * - Loading skeleton during auth check
 * - Responsive design (mobile + desktop)
 */

'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import RegistrationSuccessModal from './RegistrationSuccessModal';
import UserMenu from './UserMenu';
import BizButton from '@/components/BizButton';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AuthButtonsProps {
  /** Optional className for custom styling */
  className?: string;
  /** Variant: full (buttons) or compact (icons only on mobile) */
  variant?: 'full' | 'compact';
}

// ============================================================================
// LOADING SKELETON COMPONENT
// ============================================================================

/**
 * Loading skeleton for auth buttons
 */
function AuthButtonsSkeleton() {
  return (
    <div className="flex items-center space-x-3">
      <div className="w-20 h-9 bg-gray-200 rounded-lg animate-pulse" />
      <div className="w-20 h-9 bg-gray-200 rounded-lg animate-pulse" />
    </div>
  );
}

// ============================================================================
// AUTHBUTTONS COMPONENT
// ============================================================================

/**
 * AuthButtons - Entry point for public authentication UI
 *
 * Displays Sign In/Sign Up buttons when logged out, and UserMenu when logged in.
 * Manages modal state for login/register/success modals with seamless switching.
 *
 * @example
 * ```tsx
 * // In Header component
 * <AuthButtons />
 *
 * // With compact variant for mobile
 * <AuthButtons variant="compact" />
 * ```
 */
export default function AuthButtons({
  className = '',
  variant = 'full',
}: AuthButtonsProps) {
  const { user, loading } = useAuth();

  // Modal state management
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // ============================================================================
  // MODAL SWITCHING HANDLERS
  // ============================================================================

  /**
   * Switch from login to register modal
   */
  const handleSwitchToRegister = useCallback(() => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  }, []);

  /**
   * Switch from register to login modal
   */
  const handleSwitchToLogin = useCallback(() => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  }, []);

  /**
   * Close login modal
   */
  const handleCloseLogin = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  /**
   * Close register modal
   */
  const handleCloseRegister = useCallback(() => {
    setShowRegisterModal(false);
  }, []);

  /**
   * Close success modal
   */
  const handleCloseSuccess = useCallback(() => {
    setShowSuccessModal(false);
    setRegisteredEmail('');
  }, []);

  /**
   * Open login modal
   */
  const handleOpenLogin = useCallback(() => {
    setShowLoginModal(true);
  }, []);

  /**
   * Open register modal
   */
  const handleOpenRegister = useCallback(() => {
    setShowRegisterModal(true);
  }, []);

  /**
   * Handle registration success
   * Called by RegisterModal when registration completes successfully
   * Closes RegisterModal and opens RegistrationSuccessModal
   */
  const handleRegistrationSuccess = useCallback((email: string) => {
    setShowRegisterModal(false);
    setRegisteredEmail(email);
    setShowSuccessModal(true);
  }, []);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return <AuthButtonsSkeleton />;
  }

  // ============================================================================
  // LOGGED IN STATE - SHOW USER MENU
  // ============================================================================

  if (user) {
    return (
      <>
        <UserMenu className={className} />
        {/* Success Modal - shown after registration even when logged in */}
        <RegistrationSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccess}
          email={registeredEmail}
        />
      </>
    );
  }

  // ============================================================================
  // LOGGED OUT STATE - SHOW AUTH BUTTONS
  // ============================================================================

  return (
    <>
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* Sign In Button */}
        <BizButton
          variant="ghost"
          size="sm"
          onClick={handleOpenLogin}
          className={variant === 'compact' ? 'hidden sm:inline-flex' : ''}
        >
          Sign In
        </BizButton>

        {/* Sign Up Button (Primary CTA) */}
        <BizButton
          variant="primary"
          size="sm"
          onClick={handleOpenRegister}
        >
          Sign Up
        </BizButton>

        {/* Compact Variant: Sign In Icon (Mobile Only) */}
        {variant === 'compact' && (
          <button
            onClick={handleOpenLogin}
            className="sm:hidden p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-bizconekt-primary focus:ring-offset-2"
            aria-label="Sign In"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseLogin}
        onSwitchToRegister={handleSwitchToRegister}
      />

      {/* Register Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={handleCloseRegister}
        onSwitchToLogin={handleSwitchToLogin}
        onRegistrationSuccess={handleRegistrationSuccess}
      />

      {/* Success Modal - can appear in logged out state briefly during transition */}
      <RegistrationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccess}
        email={registeredEmail}
      />
    </>
  );
}
