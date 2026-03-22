'use client';

/**
 * useSocialAnalyticsDashboard Hook
 *
 * Fetches social analytics data with date range control and manual sync trigger.
 * Follows useAnalyticsTimeSeries canon pattern.
 *
 * @phase Tier 5A Social Media Manager - Phase 9
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier5A_Phases/PHASE_9_POST_ANALYTICS_DASHBOARD.md
 * @reference src/features/offers/hooks/useAnalyticsTimeSeries.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { SocialAnalyticsData } from '@core/types/social-media';

interface UseSocialAnalyticsDashboardParams {
  listingId: number;
  autoFetch?: boolean;
}

interface UseSocialAnalyticsDashboardResult {
  data: SocialAnalyticsData | null;
  loading: boolean;
  error: string | null;
  dateRange: { start: string; end: string };
  setDateRange: (start: string, end: string) => void;
  refetch: () => Promise<void>;
  syncMetrics: () => Promise<void>;
  isSyncing: boolean;
}

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0]!,
    end: end.toISOString().split('T')[0]!,
  };
}

export function useSocialAnalyticsDashboard({
  listingId,
  autoFetch = true,
}: UseSocialAnalyticsDashboardParams): UseSocialAnalyticsDashboardResult {
  const [data, setData] = useState<SocialAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRangeState] = useState(getDefaultDateRange);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!listingId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        listingId: String(listingId),
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      const response = await fetch(
        `/api/social/analytics?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [listingId, dateRange.start, dateRange.end]);

  useEffect(() => {
    if (autoFetch && listingId) {
      void fetchAnalytics();
    }
  }, [autoFetch, listingId, fetchAnalytics]);

  const setDateRange = useCallback((start: string, end: string) => {
    setDateRangeState({ start, end });
  }, []);

  const syncMetrics = useCallback(async () => {
    if (!listingId) return;

    setIsSyncing(true);

    try {
      const response = await fetchWithCsrf('/api/social/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to sync metrics');
      }

      // Refresh analytics data after sync
      await fetchAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync metrics');
    } finally {
      setIsSyncing(false);
    }
  }, [listingId, fetchAnalytics]);

  // Fire-and-forget analytics tracking
  useEffect(() => {
    if (data && listingId) {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventName: 'social_analytics_viewed',
          eventData: { listingId },
        }),
      }).catch(() => {});
    }
  }, [data, listingId]);

  return {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
    refetch: fetchAnalytics,
    syncMetrics,
    isSyncing,
  };
}
