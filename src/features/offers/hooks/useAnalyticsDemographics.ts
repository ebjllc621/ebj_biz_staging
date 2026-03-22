/**
 * useAnalyticsDemographics Hook
 *
 * Fetches audience demographics for an offer (anonymized)
 *
 * @tier ADVANCED
 * @phase Offers Phase 1 - Analytics Dashboard Visualization
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AudienceDemographics } from '@features/offers/types';

interface UseAnalyticsDemographicsReturn {
  demographics: AudienceDemographics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAnalyticsDemographics(offerId: number): UseAnalyticsDemographicsReturn {
  const [demographics, setDemographics] = useState<AudienceDemographics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDemographics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/offers/${offerId}/analytics/demographics`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load demographics');
      }
      const result = await response.json();
      setDemographics(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demographics');
    } finally {
      setIsLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (offerId) fetchDemographics();
  }, [fetchDemographics, offerId]);

  return { demographics, isLoading, error, refresh: fetchDemographics };
}
