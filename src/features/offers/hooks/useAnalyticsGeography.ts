/**
 * useAnalyticsGeography Hook
 *
 * Fetches geographic distribution data for an offer
 *
 * @tier ADVANCED
 * @phase Offers Phase 1 - Analytics Dashboard Visualization
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GeographicDistribution } from '@features/offers/types';

interface UseAnalyticsGeographyReturn {
  geography: GeographicDistribution | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAnalyticsGeography(offerId: number): UseAnalyticsGeographyReturn {
  const [geography, setGeography] = useState<GeographicDistribution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGeography = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/offers/${offerId}/analytics/geography`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load geography data');
      }
      const result = await response.json();
      setGeography(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load geography data');
    } finally {
      setIsLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (offerId) fetchGeography();
  }, [fetchGeography, offerId]);

  return { geography, isLoading, error, refresh: fetchGeography };
}
