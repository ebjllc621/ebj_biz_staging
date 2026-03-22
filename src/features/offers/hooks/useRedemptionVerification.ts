/**
 * useRedemptionVerification Hook
 *
 * Manages redemption code verification and completion workflow
 *
 * @tier ADVANCED
 * @phase Phase 3 - Redemption Verification
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useState } from 'react';
import {
  RedemptionVerification,
  RedemptionResult,
  RedemptionMethod
} from '@features/offers/types';

interface UseRedemptionVerificationReturn {
  verification: RedemptionVerification | null;
  isLoading: boolean;
  error: string | null;
  verifyCode: (code: string) => Promise<RedemptionVerification>;
  completeRedemption: (claimId: number, method: RedemptionMethod) => Promise<RedemptionResult>;
  reset: () => void;
}

/**
 * Verify and complete offer redemptions
 *
 * @param offerId - Offer ID for redemption
 * @returns Verification state and methods
 *
 * @example
 * ```tsx
 * const { verification, verifyCode, completeRedemption, reset } = useRedemptionVerification(123);
 *
 * // Verify code
 * const result = await verifyCode('PROMO-123');
 * if (result.valid) {
 *   // Complete redemption
 *   await completeRedemption(result.claim.id, 'qr_scan');
 * }
 * ```
 */
export function useRedemptionVerification(
  offerId: number
): UseRedemptionVerificationReturn {
  const [verification, setVerification] = useState<RedemptionVerification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyCode = async (code: string): Promise<RedemptionVerification> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/offers/verify?code=${encodeURIComponent(code)}&offerId=${offerId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify code');
      }

      const result = await response.json();
      const verificationResult = result.data as RedemptionVerification;
      setVerification(verificationResult);

      if (!verificationResult.valid && verificationResult.error) {
        setError(verificationResult.error);
      }

      return verificationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      const failedVerification: RedemptionVerification = {
        valid: false,
        claim: null,
        error: errorMessage,
        offer: null,
        user: null
      };
      setVerification(failedVerification);
      return failedVerification;
    } finally {
      setIsLoading(false);
    }
  };

  const completeRedemption = async (
    claimId: number,
    method: RedemptionMethod
  ): Promise<RedemptionResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/offers/${offerId}/complete-redemption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ claimId, method })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete redemption');
      }

      const result = await response.json();
      const redemptionResult = result.data as RedemptionResult;

      // Reset verification after successful redemption
      setVerification(null);

      return redemptionResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Redemption failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setVerification(null);
    setError(null);
    setIsLoading(false);
  };

  return {
    verification,
    isLoading,
    error,
    verifyCode,
    completeRedemption,
    reset
  };
}
