/**
 * useListingAnalytics - Fetch Listing Analytics Data
 *
 * @description Fetches analytics data from InternalAnalyticsService for a listing
 * @component Hook
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features (extended in Phase 2A)
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2A_BRAIN_PLAN.md
 *
 * Provides:
 * - Views trend data (daily aggregates)
 * - Traffic sources breakdown
 * - Engagement metrics
 * - Date range filtering
 * - Phase 2A: Funnel data (parallel fetch)
 * - Phase 2A: Multi-metric trend data (parallel fetch)
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ViewsTrendData {
  date: string;
  views: number;
}

export interface SourceData {
  source: string;
  views: number;
  percentage: number;
}

export interface EngagementData {
  clicks: number;
  averageTimeOnPage: number;
  bounceRate: number;
  conversions: number;
}

export interface ClickByTypeData {
  eventName: string;
  count: number;
}

// Phase 2A: Funnel types
export interface FunnelStage {
  stage: string;
  count: number;
  conversion_rate: number | null;
}

export interface FunnelData {
  stages: FunnelStage[];
  overall_conversion_rate: number;
  total_events: number;
}

// Phase 2A: Trend types
export interface TrendDataPoint {
  date: string;
  page_views: number;
  engagements: number;
  conversions: number;
  shares: number;
}

export interface AnalyticsData {
  viewsTrend: ViewsTrendData[];
  sources: SourceData[];
  engagement: EngagementData;
  clicksByType: ClickByTypeData[];
  totalViews: number;
  last30DaysViews: number;
  // Phase 2A extensions
  funnel: FunnelData | null;
  trends: TrendDataPoint[];
}

export interface DateRange {
  start: string; // ISO date
  end: string;   // ISO date
}

export interface UseListingAnalyticsResult {
  /** Analytics data */
  analytics: AnalyticsData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh analytics data */
  refreshAnalytics: () => Promise<void>;
  /** Update date range */
  setDateRange: (range: DateRange) => void;
  /** Current date range */
  dateRange: DateRange;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default date range (last 30 days)
 */
function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start: start.toISOString().split('T')[0] || '',
    end: end.toISOString().split('T')[0] || ''
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useListingAnalytics - Fetch listing analytics with date range filtering
 *
 * Phase 2A: Uses Promise.allSettled() to fetch analytics, funnel, and trends
 * in parallel. If funnel or trends fail, they degrade gracefully (null/[]).
 *
 * @param listingId - The listing ID to fetch analytics for
 * @returns Analytics data, loading state, error, and control functions
 *
 * @example
 * ```tsx
 * const { analytics, isLoading, setDateRange } = useListingAnalytics(listingId);
 *
 * // Change date range
 * setDateRange({ start: '2026-01-01', end: '2026-02-01' });
 * ```
 */
export function useListingAnalytics(listingId: number | null): UseListingAnalyticsResult {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const fetchAnalytics = useCallback(async () => {
    if (!listingId) {
      setAnalytics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build query string with date range
      const params = new URLSearchParams({
        start: dateRange.start || '',
        end: dateRange.end || ''
      });

      const baseUrl = `/api/listings/${listingId}/analytics`;
      const qs = params.toString();

      // Phase 2A: Fetch analytics, funnel, and trends in parallel
      const [analyticsResult, funnelResult, trendsResult] = await Promise.allSettled([
        fetch(`${baseUrl}?${qs}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${baseUrl}/funnel?${qs}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${baseUrl}/trends?${qs}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      // Process primary analytics (required — fail loudly)
      if (analyticsResult.status === 'rejected') {
        throw new Error('Failed to fetch analytics');
      }
      const analyticsResponse = analyticsResult.value;
      if (!analyticsResponse.ok) {
        throw new Error(`Failed to fetch analytics: ${analyticsResponse.status}`);
      }
      const analyticsJson = await analyticsResponse.json();
      const analyticsData = analyticsJson.data;
      if (!analyticsData) {
        throw new Error('Analytics data not found');
      }

      // Process funnel (graceful degradation)
      let funnelData: FunnelData | null = null;
      if (funnelResult.status === 'fulfilled' && funnelResult.value.ok) {
        try {
          const funnelJson = await funnelResult.value.json();
          const raw = funnelJson.data;
          if (raw && typeof raw.overall_conversion_rate === 'number') {
            funnelData = {
              stages: raw.stages ?? [],
              overall_conversion_rate: raw.overall_conversion_rate,
              total_events: raw.total_events ?? 0
            };
          }
        } catch {
          funnelData = null;
        }
      }

      // Process trends (graceful degradation)
      let trendsData: TrendDataPoint[] = [];
      if (trendsResult.status === 'fulfilled' && trendsResult.value.ok) {
        try {
          const trendsJson = await trendsResult.value.json();
          trendsData = trendsJson.data?.trends ?? [];
        } catch {
          trendsData = [];
        }
      }

      setAnalytics({
        ...analyticsData,
        funnel: funnelData,
        trends: trendsData
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [listingId, dateRange]);

  // Fetch on mount and when dependencies change
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
    refreshAnalytics,
    setDateRange,
    dateRange
  };
}

export default useListingAnalytics;
