/**
 * useContentAnalyticsDashboard - Fetch content analytics dashboard data
 *
 * @hook
 * @tier SIMPLE
 * @phase Content Phase 5B
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_5B_CONTENT_ANALYTICS_SEO_PREVIEW.md
 *
 * Provides:
 * - Content analytics data for a listing
 * - Views trend, engagement breakdown, top content
 * - Date range filtering
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DateRange {
  start: string;
  end: string;
}

export interface ContentAnalyticsDashboardData {
  totalViews: number;
  totalEngagements: number;
  totalComments: number;
  totalRecommendations: number;
  engagementRate: number;
  viewsTrend: Array<{ date: string; views: number }>;
  engagementBreakdown: Array<{ type: string; count: number }>;
  topContent: Array<{ id: number; title: string; type: string; views: number }>;
  contentTypeCounts: { articles: number; podcasts: number; videos: number };
}

export interface UseContentAnalyticsDashboardResult {
  data: ContentAnalyticsDashboardData | null;
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

export function useContentAnalyticsDashboard(listingId: number | null): UseContentAnalyticsDashboardResult {
  const [data, setData] = useState<ContentAnalyticsDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const fetchData = useCallback(async () => {
    if (!listingId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end
      });

      const response = await fetch(
        `/api/dashboard/listings/${listingId}/content/analytics?${params}`,
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
  }, [listingId, dateRange]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
    dateRange,
    setDateRange
  };
}
