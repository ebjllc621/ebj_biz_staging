/**
 * useNewsletterAnalyticsDashboard - Fetch newsletter analytics dashboard data
 *
 * @hook
 * @tier SIMPLE
 * @phase Tier 2 Content Types - Phase N8
 * @reference src/features/jobs/hooks/useJobAnalyticsDashboard.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { NewsletterAnalyticsSummary, SubscriberGrowthData, DeliveryStats } from '@core/types/newsletter';

export interface DateRange {
  start: string;
  end: string;
}

export interface NewsletterDashboardData {
  analytics: NewsletterAnalyticsSummary;
  subscriberGrowth: SubscriberGrowthData;
  deliveryStats: DeliveryStats;
  newsletter: {
    id: number;
    title: string;
    status: string;
    sent_at: string | null;
    subscriber_count_at_send: number;
  } | null;
}

export interface UseNewsletterAnalyticsDashboardResult {
  data: NewsletterDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
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

export function useNewsletterAnalyticsDashboard(
  listingId: number | null,
  newsletterId: number | null
): UseNewsletterAnalyticsDashboardResult {
  const [data, setData] = useState<NewsletterDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const fetchData = useCallback(async () => {
    if (!listingId || !newsletterId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      });

      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${listingId}/newsletters/${newsletterId}/analytics?${params}`
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
  }, [listingId, newsletterId, dateRange]);

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
