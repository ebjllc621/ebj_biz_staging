/**
 * useCampaignAnalyticsDashboard - Fetch affiliate marketer campaign analytics data
 *
 * @hook
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 9A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9A_AFFILIATE_MARKETER_CAMPAIGN_ANALYTICS.md
 *
 * Provides:
 * - Campaign analytics data (KPIs, campaigns, conversion trend, network breakdown, traffic sources, benchmark)
 * - Date range filtering
 * - Replicates useProfileAnalyticsDashboard pattern
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DateRange } from './useProfileAnalyticsDashboard';

export type { DateRange };

export interface CampaignAnalyticsData {
  campaignKpis: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    avgConversionRate: number;
    avgROI: number;
    activeCampaigns: number;
  };
  campaigns: Array<{
    id: number;
    campaignName: string;
    network: string | null;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
    periodStart: string | null;
    periodEnd: string | null;
  }>;
  conversionTrend: Array<{ date: string; conversions: number; revenue: number }>;
  networkBreakdown: Array<{ network: string; campaigns: number; conversions: number; revenue: number }>;
  trafficSources: Array<{ source: string; count: number; percentage: number }>;
  categoryBenchmark: {
    avgConversionRate: number;
    avgRating: number;
    avgContactCount: number;
    marketerRank: number;
    totalInCategory: number;
  };
}

export interface UseCampaignAnalyticsDashboardResult {
  data: CampaignAnalyticsData | null;
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

export function useCampaignAnalyticsDashboard(
  listingId: number | null,
  profileId: number | null
): UseCampaignAnalyticsDashboardResult {
  const [data, setData] = useState<CampaignAnalyticsData | null>(null);
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
        profileId: String(profileId),
        start: dateRange.start,
        end: dateRange.end,
      });

      const response = await fetch(
        `/api/dashboard/listings/${listingId}/creator-profiles/campaign-analytics?${params}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch campaign analytics: ${response.status}`);
      }

      const result = await response.json() as { success: boolean; data?: CampaignAnalyticsData; error?: { message?: string } };
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to load campaign analytics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign analytics');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [listingId, profileId, dateRange]);

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
