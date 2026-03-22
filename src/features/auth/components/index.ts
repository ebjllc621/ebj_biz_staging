/**
 * Authentication Components Barrel File
 *
 * @authority mandatory-verification-protocol.mdc
 * @compliance master_build_v_4_4_0.md section 9.2 (BizModal required)
 * @pattern Single export point for auth UI components
 *
 * All authentication UI components using BizModal template.
 * These components integrate with useAuth hook from Phase 7A.
 *
 * COMPONENTS:
 * - LoginModal: User sign-in form with validation
 * - RegisterModal: User registration with password strength
 * - EmailVerificationModal: Email verification flow
 * - UserMenu: Logged-in user dropdown menu (Phase 7C)
 * - AuthButtons: Public auth UI entry point (Phase 7C)
 *
 * GOVERNANCE:
 * - 100% BizModal template compliance
 * - NO localStorage for auth tokens
 * - Client-side validation mirrors server requirements
 * - CSRF protection via useAuth hook
 */

// Export all auth modal components
export { default as LoginModal } from './LoginModal';
export { default as RegisterModal } from './RegisterModal';
export { default as EmailVerificationModal } from './EmailVerificationModal';
export { default as RegistrationSuccessModal } from './RegistrationSuccessModal';

// Export navigation components (Phase 7C)
export { default as UserMenu } from './UserMenu';
export { default as AuthButtons } from './AuthButtons';

// Export component props types
export type { LoginModalProps } from './LoginModal';
export type { RegisterModalProps } from './RegisterModal';
export type { EmailVerificationModalProps } from './EmailVerificationModal';
export type { RegistrationSuccessModalProps } from './RegistrationSuccessModal';
export type { UserMenuProps } from './UserMenu';
export type { AuthButtonsProps } from './AuthButtons';
