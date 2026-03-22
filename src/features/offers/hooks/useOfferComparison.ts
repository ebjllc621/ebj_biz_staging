/**
 * useOfferComparison Hook
 *
 * Fetches offer performance comparison for a listing
 *
 * @tier ADVANCED
 * @phase Phase 3 - Analytics Dashboard
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { OfferComparison } from '@features/offers/types';

interface UseOfferComparisonReturn {
  comparisons: OfferComparison[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch offer performance comparison for a listing
 *
 * @param listingId - Listing ID
 * @returns Offer comparison data state
 *
 * @example
 * ```tsx
 * const { comparisons, isLoading, error, refresh } = useOfferComparison(123);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return <PerformanceTable data={comparisons} />;
 * ```
 */
export function useOfferComparison(listingId: number): UseOfferComparisonReturn {
  const [comparisons, setComparisons] = useState<OfferComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparisons = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/listings/${listingId}/offers/analytics/comparison`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load offer comparison');
      }

      const result = await response.json();
      setComparisons(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offer comparison');
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (listingId) {
      fetchComparisons();
    }
  }, [fetchComparisons, listingId]);

  return {
    comparisons,
    isLoading,
    error,
    refresh: fetchComparisons
  };
}
