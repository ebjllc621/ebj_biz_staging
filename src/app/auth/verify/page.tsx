'use client';

// Force dynamic rendering - required for React Context (useAuth, etc.)
// Prevents 'Cannot read properties of null (reading useContext)' in production build
export const dynamic = 'force-dynamic';

/**
 * Email Verification Page
 *
 * Handles email verification when user clicks link from verification email.
 * URL: /auth/verify?token=...
 *
 * @governance httpOnly cookies for session management
 * @authority mandatory-verification-protocol.mdc
 */

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import LoginModal from '@/features/auth/components/LoginModal';

type VerificationStatus = 'loading' | 'success' | 'error' | 'no-token';

/**
 * Extract error message from API response
 * Handles both string messages and error objects with message property
 */
function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return 'Verification failed. The token may be invalid or expired.';
  }

  const response = data as Record<string, unknown>;

  // Check for string message first
  if (typeof response.message === 'string') {
    return response.message;
  }

  // Check for string error
  if (typeof response.error === 'string') {
    return response.error;
  }

  // Check for nested error object with message
  if (response.error && typeof response.error === 'object') {
    const errorObj = response.error as Record<string, unknown>;
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }

  // Check for details string
  if (typeof response.details === 'string') {
    return response.details;
  }

  return 'Verification failed. The token may be invalid or expired.';
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Ref to prevent double API calls in React Strict Mode
  const verificationAttempted = useRef(false);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('no-token');
      setMessage('No verification token provided.');
      return;
    }

    // Prevent duplicate calls from React Strict Mode
    if (verificationAttempted.current) {
      return;
    }
    verificationAttempted.current = true;

    // Verify the email token
    async function verifyEmail() {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          setEmail(data.data?.email || '');
        } else {
          setStatus('error');
          setMessage(extractErrorMessage(data));
        }
      } catch (err) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    }

    verifyEmail();
  }, [searchParams]);

  const handleGoToLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginModalClose = () => {
    setShowLoginModal(false);
    router.push('/');
  };

  const handleResendVerification = () => {
    // Redirect to home where they can request a new verification email
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Logo - matches SiteHeader branding */}
          <div className="flex justify-center mb-6">
            <Image
              src="/uploads/site/branding/namelogo-horizontal.png"
              alt="Bizconekt"
              width={200}
              height={40}
              priority
              style={{ height: 'auto', maxHeight: '40px', width: 'auto' }}
            />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Email Verification
          </h2>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Verifying your email...</p>
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
                Email Verified!
              </h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              {email && (
                <p className="mt-1 text-sm text-gray-500">
                  Verified email: <strong>{email}</strong>
                </p>
              )}
              <button
                onClick={handleGoToLogin}
                className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bizconekt-primary hover:bg-bizconekt-primaryDark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bizconekt-primary"
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
                Verification Failed
              </h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleResendVerification}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Request New Verification Email
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

      {/* Login Modal - pre-filled with verified email */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleLoginModalClose}
        initialEmail={email}
      />
    </div>
  );
}
