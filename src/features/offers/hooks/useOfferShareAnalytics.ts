/**
 * useOfferShareAnalytics - Hook for offer share analytics
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
import type { ShareAnalytics } from '@features/offers/types';

interface UseOfferShareAnalyticsReturn {
  analytics: ShareAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching offer share analytics
 *
 * @param offerId Offer ID
 * @returns Share analytics data and actions
 */
export function useOfferShareAnalytics(offerId: number): UseOfferShareAnalyticsReturn {
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/offers/${offerId}/shares`, {
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
          throw new Error('Offer not found');
        }
        throw new Error('Failed to fetch share analytics');
      }

      const data = await response.json();
      setAnalytics(data.data?.analytics || null);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(message);
      ErrorService.capture('[useOfferShareAnalytics] fetchAnalytics failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (offerId) {
      fetchAnalytics();
    }
  }, [offerId, fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refresh: fetchAnalytics
  };
}

export default useOfferShareAnalytics;
