/**
 * useBusinessSharePerformance - Hook for business-level share performance
 *
 * @tier STANDARD
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorService } from '@core/services/ErrorService';
import type { BusinessSharePerformance } from '@features/offers/types';

interface UseBusinessSharePerformanceReturn {
  performance: BusinessSharePerformance | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching business-level share performance analytics
 *
 * @param listingId Listing ID to get share performance for
 * @returns Share performance data and actions
 */
export function useBusinessSharePerformance(listingId: number): UseBusinessSharePerformanceReturn {
  const [performance, setPerformance] = useState<BusinessSharePerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = useCallback(async () => {
    if (!listingId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/listings/${listingId}/offers/share-analytics`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 403) {
          throw new Error('Unauthorized to view analytics');
        }
        if (response.status === 404) {
          throw new Error('Listing not found');
        }
        throw new Error('Failed to fetch share performance');
      }

      const data = await response.json();
      setPerformance(data.data?.performance || null);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch performance';
      setError(message);
      ErrorService.capture('[useBusinessSharePerformance] fetchPerformance failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (listingId) {
      fetchPerformance();
    }
  }, [listingId, fetchPerformance]);

  return {
    performance,
    isLoading,
    error,
    refresh: fetchPerformance
  };
}

export default useBusinessSharePerformance;
