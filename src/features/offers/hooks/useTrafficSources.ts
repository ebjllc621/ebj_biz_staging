/**
 * useTrafficSources Hook
 *
 * Fetches traffic source breakdown analytics for an offer
 *
 * @tier ADVANCED
 * @phase Phase 3 - Analytics Dashboard
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrafficSourceBreakdown } from '@features/offers/types';

interface UseTrafficSourcesReturn {
  sources: TrafficSourceBreakdown | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch traffic source breakdown for an offer
 *
 * @param offerId - Offer ID
 * @returns Traffic source data state
 *
 * @example
 * ```tsx
 * const { sources, isLoading, error, refresh } = useTrafficSources(123);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return <SourceChart data={sources.sources} topSource={sources.topSource} />;
 * ```
 */
export function useTrafficSources(offerId: number): UseTrafficSourcesReturn {
  const [sources, setSources] = useState<TrafficSourceBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/offers/${offerId}/analytics/sources`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load traffic sources');
      }

      const result = await response.json();
      setSources(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load traffic sources');
    } finally {
      setIsLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (offerId) {
      fetchSources();
    }
  }, [fetchSources, offerId]);

  return {
    sources,
    isLoading,
    error,
    refresh: fetchSources
  };
}
