/**
 * useGuideAnalyticsDashboard - Fetch guide analytics dashboard data
 *
 * @hook
 * @tier SIMPLE
 * @phase Tier 2 Content Types - Phase G9B
 * @reference src/features/content/hooks/useNewsletterAnalyticsDashboard.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';

export interface GuideAnalyticsDashboardData {
  analytics: {
    totals: {
      views: number;
      completions: number;
      bookmarks: number;
      shares: number;
      usersStarted: number;
      usersCompleted: number;
      completionRate: number;
    };
    progressDistribution: Array<{ range: string; count: number }>;
    sectionCompletionRates: Array<{
      sectionId: number;
      title: string;
      completionRate: number;
      completedCount: number;
    }>;
  };
  guide: {
    id: number;
    title: string;
    status: string;
    published_at: string | null;
  } | null;
}

export interface UseGuideAnalyticsDashboardResult {
  data: GuideAnalyticsDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGuideAnalyticsDashboard(
  listingId: number | null,
  guideId: number | null
): UseGuideAnalyticsDashboardResult {
  const [data, setData] = useState<GuideAnalyticsDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!listingId || !guideId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${listingId}/guides/${guideId}/analytics`
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
  }, [listingId, guideId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
  };
}
