/**
 * useEventAnalyticsData - Fetch Event Analytics Data
 *
 * @description Fetches analytics funnel, shares, and referral data from event analytics API
 * @component Hook
 * @tier SIMPLE
 * @phase Phase 4 - Event Owner Analytics Dashboard
 * @authority docs/pages/layouts/events/build/3-10-26/phases/PHASE_4_EVENT_OWNER_ANALYTICS.md
 *
 * Provides:
 * - Analytics funnel data (impressions, page_views, saves, shares, rsvps)
 * - Share platform breakdown
 * - Referral count
 * - Event metadata
 *
 * NOTE: Named useEventAnalyticsData (NOT useEventAnalytics) to avoid collision
 * with the existing tracking hook useEventAnalytics.
 */

import { useState, useEffect, useCallback } from 'react';
import type { EventAnalyticsFunnel, EventSharePlatformData } from '@features/events/types';

// ============================================================================
// TYPES
// ============================================================================

export interface EventAnalyticsData {
  funnel: EventAnalyticsFunnel;
  shares: EventSharePlatformData[];
  referrals: number;
  event: {
    id: number;
    title: string;
    status: string;
    created_at: string;
  };
}

export interface UseEventAnalyticsDataResult {
  /** Analytics data */
  analytics: EventAnalyticsData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh analytics data */
  refreshAnalytics: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useEventAnalyticsData - Fetch event analytics funnel and share data
 *
 * @param eventId - The event ID to fetch analytics for (null = no-op)
 * @returns Analytics data, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { analytics, isLoading, error } = useEventAnalyticsData(eventId);
 * ```
 */
export function useEventAnalyticsData(eventId: number | null): UseEventAnalyticsDataResult {
  const [analytics, setAnalytics] = useState<EventAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!eventId) {
      setAnalytics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/events/${eventId}/analytics`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const result = await response.json();

      // API returns { data: { funnel, shares, referrals, event } }
      const analyticsData = result.data as EventAnalyticsData | undefined;

      if (!analyticsData) {
        throw new Error('Analytics data not found');
      }

      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Fetch on mount and when eventId changes
  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const refreshAnalytics = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refreshAnalytics
  };
}

export default useEventAnalyticsData;
