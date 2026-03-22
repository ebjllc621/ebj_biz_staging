/**
 * useProfileAnalyticsDashboard - Fetch creator profile analytics dashboard data
 *
 * @hook
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 8C
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_8C_PROFILE_ANALYTICS_SEO_PREVIEW.md
 *
 * Provides:
 * - Profile analytics data (KPIs, contact funnel, view/contact trends)
 * - Date range filtering
 * - Replicates useContentAnalyticsDashboard pattern
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DateRange {
  start: string;
  end: string;
}

export interface ProfileAnalyticsData {
  kpis: {
    viewCount: number;
    contactCount: number;
    ratingAverage: number;
    ratingCount: number;
    recommendationCount: number;
    responseRate: number;
  };
  contactFunnel: Array<{ stage: string; count: number; conversionRate: number | null }>;
  viewTrend: Array<{ date: string; views: number }>;
  contactTrend: Array<{ date: string; contacts: number }>;
}

export interface UseProfileAnalyticsDashboardResult {
  data: ProfileAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dateRange: DateRange;
  setDateRange: (_range: DateRange) => void;
}

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0] || '',
    end: end.toISOString().split('T')[0] || ''
  };
}

export function useProfileAnalyticsDashboard(
  listingId: number | null,
  profileType: 'affiliate_marketer' | 'internet_personality',
  profileId: number | null
): UseProfileAnalyticsDashboardResult {
  const [data, setData] = useState<ProfileAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const fetchData = useCallback(async () => {
    if (!listingId || !profileId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type: profileType,
        profileId: String(profileId),
        start: dateRange.start,
        end: dateRange.end,
      });

      const response = await fetch(
        `/api/dashboard/listings/${listingId}/creator-profiles/analytics?${params}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to load analytics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [listingId, profileType, profileId, dateRange]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
    dateRange,
    setDateRange,
  };
}
