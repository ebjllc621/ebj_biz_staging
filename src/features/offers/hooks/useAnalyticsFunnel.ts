/**
 * useAnalyticsFunnel Hook
 *
 * Fetches analytics funnel data for an offer with conversion tracking
 *
 * @tier ADVANCED
 * @phase Phase 3 - Analytics Dashboard
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnalyticsFunnel } from '@features/offers/types';

interface DateRange {
  start: Date;
  end: Date;
}

interface UseAnalyticsFunnelReturn {
  funnel: AnalyticsFunnel | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch analytics funnel data for an offer
 *
 * @param offerId - Offer ID
 * @param dateRange - Optional date range filter
 * @returns Funnel data state
 *
 * @example
 * ```tsx
 * const { funnel, isLoading, error, refresh } = useAnalyticsFunnel(123, {
 *   start: new Date('2024-01-01'),
 *   end: new Date('2024-01-31')
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return <FunnelChart data={funnel.stages} />;
 * ```
 */
export function useAnalyticsFunnel(
  offerId: number,
  dateRange?: DateRange
): UseAnalyticsFunnelReturn {
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFunnel = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.start) {
        params.set('startDate', dateRange.start.toISOString());
      }
      if (dateRange?.end) {
        params.set('endDate', dateRange.end.toISOString());
      }

      const response = await fetch(
        `/api/offers/${offerId}/analytics/funnel?${params}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load funnel data');
      }

      const result = await response.json();
      setFunnel(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load funnel data');
    } finally {
      setIsLoading(false);
    }
  }, [offerId, dateRange]);

  useEffect(() => {
    if (offerId) {
      fetchFunnel();
    }
  }, [fetchFunnel, offerId]);

  return {
    funnel,
    isLoading,
    error,
    refresh: fetchFunnel
  };
}
