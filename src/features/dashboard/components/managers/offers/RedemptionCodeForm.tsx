/**
 * RedemptionCodeForm Component
 *
 * Manual promo code entry form for redemption verification
 *
 * @tier STANDARD
 * @phase Phase 3 - Redemption Verification
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useState } from 'react';
import { RedemptionVerification } from '@features/offers/types';

interface RedemptionCodeFormProps {
  offerId: number;
  onVerify: (verification: RedemptionVerification) => void;
  isLoading?: boolean;
}

/**
 * Manual promo code entry form
 *
 * Features:
 * - Code input with auto-uppercase
 * - Verify button
 * - Loading state
 * - Error display
 * - Success state with claim details
 *
 * @example
 * ```tsx
 * <RedemptionCodeForm
 *   offerId={123}
 *   onVerify={(verification) => handleVerification(verification)}
 * />
 * ```
 */
export function RedemptionCodeForm({
  offerId,
  onVerify,
  isLoading = false
}: RedemptionCodeFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Please enter a promo code');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const response = await fetch(
        `/api/offers/verify?code=${encodeURIComponent(code.toUpperCase())}&offerId=${offerId}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify code');
      }

      const result = await response.json();
      const verification = result.data as RedemptionVerification;

      if (!verification.valid) {
        setError(verification.error || 'Invalid code');
      } else {
        onVerify(verification);
        setCode(''); // Clear input on success
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCode(value);
    if (error) setError(null); // Clear error on input
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-sm text-gray-700">
          Enter the customer's promo code to verify their offer claim.
        </p>
      </div>

      {/* Code Input */}
      <div>
        <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700 mb-2">
          Promo Code
        </label>
        <input
          type="text"
          id="promoCode"
          value={code}
          onChange={handleCodeChange}
          placeholder="ENTER-CODE-HERE"
          disabled={isLoading || isVerifying}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          autoComplete="off"
          autoFocus
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Verify Button */}
      <button
        type="submit"
        disabled={isLoading || isVerifying || !code.trim()}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        {isVerifying || isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Verifying...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verify Code
          </>
        )}
      </button>

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center">
        The customer should show you their promo code from their Bizconekt account
      </p>
    </form>
  );
}
