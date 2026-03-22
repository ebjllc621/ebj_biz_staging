/**
 * RegistrationSuccessModal Component - Post-Registration Success Display
 *
 * @authority mandatory-verification-protocol.mdc - httpOnly cookies
 * @pattern BizModal template, React 18 hooks
 * @governance Stateless display component, receives data via props
 * @compliance master_build_v_4_4_0.md section 9.2 (BizModal required)
 * @tier SIMPLE
 * @generated 2025-12-23
 * @dna-version v11.0.1
 *
 * FEATURES:
 * - Displays registration success message
 * - Shows verification email notice
 * - Lists capabilities while unverified vs after verification
 * - "Continue Browsing" dismisses modal
 * - BizModal template compliance (100%)
 *
 * USAGE:
 * Shown by AuthButtons after RegisterModal successfully completes.
 * User is already logged in when this modal appears.
 */

'use client';

import BizModal from '@/components/BizModal';
import BizButton from '@/components/BizButton';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RegistrationSuccessModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Email address the verification was sent to */
  email: string;
  /** Optional callback to open email verification modal */
  onOpenVerification?: () => void;
}

// ============================================================================
// REGISTRATIONSUCCESSMODAL COMPONENT
// ============================================================================

/**
 * RegistrationSuccessModal - Displays success message after registration
 *
 * @example
 * ```tsx
 * <RegistrationSuccessModal
 *   isOpen={showSuccess}
 *   onClose={() => setShowSuccess(false)}
 *   email="user@example.com"
 * />
 * ```
 */
export default function RegistrationSuccessModal({
  isOpen,
  onClose,
  email,
  onOpenVerification,
}: RegistrationSuccessModalProps) {
  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Created"
      maxWidth="md"
    >
      <div className="space-y-4 text-center">
        {/* Success Icon - Green Checkmark */}
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
            Welcome to Bizconekt!
          </h3>
          <p className="text-sm text-gray-600">
            We&apos;ve sent a verification email to:
          </p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {email}
          </p>
        </div>

        {/* Instructions Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <p className="text-sm text-blue-800">
            <strong>Next step:</strong> Check your email and click the verification
            link to activate your account. Don&apos;t forget to check your spam folder!
          </p>
        </div>

        {/* Limitations Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
          <p className="text-sm font-medium text-amber-800 mb-2">
            While unverified, you can:
          </p>
          <ul className="text-sm text-amber-700 space-y-1 ml-4 list-disc">
            <li>Browse all listings and content</li>
            <li>Save bookmarks and favorites</li>
            <li>Update your profile</li>
          </ul>
          <p className="text-sm font-medium text-amber-800 mt-3 mb-2">
            After verification, you&apos;ll unlock:
          </p>
          <ul className="text-sm text-amber-700 space-y-1 ml-4 list-disc">
            <li>Contact listing owners</li>
            <li>Leave reviews and ratings</li>
            <li>Create your own listings</li>
            <li>Access premium features</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <BizButton
            variant="primary"
            onClick={onClose}
            fullWidth
          >
            Continue Browsing
          </BizButton>

          {onOpenVerification && (
            <button
              type="button"
              onClick={onOpenVerification}
              className="text-sm text-bizconekt-primary hover:text-bizconekt-primaryDark hover:underline"
            >
              Didn&apos;t receive the email? Enter verification code
            </button>
          )}
        </div>
      </div>
    </BizModal>
  );
}
