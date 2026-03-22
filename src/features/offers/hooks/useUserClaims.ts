/**
 * useUserClaims - Hook for fetching user's claimed offers
 *
 * @tier STANDARD
 * @phase Offers Phase 1 - Core CRUD & Display
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_1_CORE_CRUD_BRAIN_PLAN.md
 */

import { useState, useEffect, useCallback } from 'react';
import type { Claim, ClaimStatus } from '@features/offers/types';

interface UseUserClaimsOptions {
  /** Filter by claim status */
  status?: ClaimStatus;
  /** Whether to fetch on mount (default: true) */
  fetchOnMount?: boolean;
}

interface UseUserClaimsReturn {
  /** User's claims */
  claims: Claim[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refetch claims */
  refetch: () => Promise<void>;
  /** Active (not expired, not redeemed) claims count */
  activeCount: number;
  /** Redeemed claims count */
  redeemedCount: number;
  /** Expired claims count */
  expiredCount: number;
}

/**
 * Hook for fetching user's claimed offers
 *
 * @example
 * ```tsx
 * const { claims, isLoading, activeCount } = useUserClaims();
 *
 * // Filter by status
 * const { claims } = useUserClaims({ status: 'claimed' });
 * ```
 */
export function useUserClaims({
  status,
  fetchOnMount = true
}: UseUserClaimsOptions = {}): UseUserClaimsReturn {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchClaims = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }

      const url = `/api/user/offers/claims${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view your claims');
        }
        throw new Error('Failed to fetch claims');
      }

      const data = await response.json();

      // Map response data to Claim interface
      const claimsData = (data.data?.claims || data.data || []).map((item: Record<string, unknown>) => ({
        id: item.id as number,
        offer_id: item.offer_id as number,
        user_id: item.user_id as number,
        promo_code: item.promo_code as string,
        claimed_at: new Date(item.claimed_at as string),
        redeemed_at: item.redeemed_at ? new Date(item.redeemed_at as string) : null,
        status: item.status as ClaimStatus,
        redemption_method: item.redemption_method as Claim['redemption_method'],
        offer_title: item.offer_title as string,
        offer_image: item.offer_image as string | null,
        offer_type: item.offer_type as string,
        business_name: item.business_name as string,
        end_date: new Date(item.end_date as string)
      }));

      setClaims(claimsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claims');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchClaims();
    }
  }, [fetchOnMount, fetchClaims]);

  // Computed counts
  const now = new Date();
  const activeCount = claims.filter(c =>
    c.status === 'claimed' && new Date(c.end_date) > now
  ).length;

  const redeemedCount = claims.filter(c => c.status === 'redeemed').length;

  const expiredCount = claims.filter(c =>
    c.status === 'expired' || (c.status === 'claimed' && new Date(c.end_date) <= now)
  ).length;

  return {
    claims,
    isLoading,
    error,
    refetch: fetchClaims,
    activeCount,
    redeemedCount,
    expiredCount
  };
}

export default useUserClaims;
