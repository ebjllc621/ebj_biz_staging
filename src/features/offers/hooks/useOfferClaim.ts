/**
 * useOfferClaim - Hook for claiming offers with eligibility checking
 *
 * @tier STANDARD
 * @phase Offers Phase 1 - Core CRUD & Display
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_1_CORE_CRUD_BRAIN_PLAN.md
 */

import { useState, useCallback } from 'react';
import type { ClaimResult, ClaimEligibility } from '@features/offers/types';

interface UseOfferClaimOptions {
  /** Offer ID to claim */
  offerId: number;
  /** Callback on successful claim */
  onSuccess?: (result: ClaimResult) => void;
  /** Callback on claim error */
  onError?: (error: string) => void;
}

interface UseOfferClaimReturn {
  /** Whether claim is in progress */
  isLoading: boolean;
  /** Error message if claim failed */
  error: string | null;
  /** Claim eligibility status */
  eligibility: ClaimEligibility | null;
  /** Result of successful claim */
  claimResult: ClaimResult | null;
  /** Check if user can claim the offer */
  checkEligibility: () => Promise<ClaimEligibility | null>;
  /** Execute the claim */
  claimOffer: (source?: string) => Promise<ClaimResult | null>;
  /** Reset state for retry */
  reset: () => void;
}

/**
 * Hook for managing offer claim flow
 *
 * @example
 * ```tsx
 * const { claimOffer, isLoading, claimResult } = useOfferClaim({
 *   offerId: offer.id,
 *   onSuccess: (result) => openShareModal(result.promoCode)
 * });
 * ```
 */
export function useOfferClaim({
  offerId,
  onSuccess,
  onError
}: UseOfferClaimOptions): UseOfferClaimReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<ClaimEligibility | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  const checkEligibility = useCallback(async (): Promise<ClaimEligibility | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/offers/${offerId}/eligibility`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          setEligibility({
            canClaim: false,
            reason: 'Please sign in to claim offers',
            remainingClaims: 0,
            userClaimCount: 0
          });
          return null;
        }
        throw new Error('Failed to check eligibility');
      }

      const data = await response.json();
      const elig = data.data as ClaimEligibility;
      setEligibility(elig);
      return elig;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check eligibility';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [offerId]);

  const claimOffer = useCallback(async (source: string = 'offer_detail'): Promise<ClaimResult | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/offers/${offerId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source })
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to claim offers');
          onError?.('Please sign in to claim offers');
          return null;
        }

        const errorData = await response.json();
        const message = errorData.error?.userMessage || errorData.message || 'Failed to claim offer';
        setError(message);
        onError?.(message);
        return null;
      }

      const data = await response.json();
      const result: ClaimResult = {
        success: true,
        claimId: data.data.claimId,
        promoCode: data.data.promoCode,
        expiresAt: new Date(data.data.expiresAt),
        redemptionInstructions: data.data.redemptionInstructions
      };

      setClaimResult(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim offer';
      setError(message);
      onError?.(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [offerId, onSuccess, onError]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setClaimResult(null);
  }, []);

  return {
    isLoading,
    error,
    eligibility,
    claimResult,
    checkEligibility,
    claimOffer,
    reset
  };
}

export default useOfferClaim;
