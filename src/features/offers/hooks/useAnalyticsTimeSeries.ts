/**
 * useAnalyticsTimeSeries Hook
 *
 * Fetches time-series analytics data for offer charts
 *
 * @tier ADVANCED
 * @phase TD-P3-003 - Time-Series Analytics
 * @authority Phase 3 Brain Plan
 */

import { useState, useEffect, useCallback } from 'react';
import type { TimeSeriesData, TimeSeriesGranularity } from '@features/offers/types';

interface UseAnalyticsTimeSeriesParams {
  offerId: number;
  granularity?: TimeSeriesGranularity;
  startDate?: Date;
  endDate?: Date;
  autoFetch?: boolean;
}

interface UseAnalyticsTimeSeriesResult {
  data: TimeSeriesData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setGranularity: (granularity: TimeSeriesGranularity) => void;
  setDateRange: (start: Date | undefined, end: Date | undefined) => void;
}

/**
 * Hook for fetching time-series analytics
 *
 * @example
 * ```tsx
 * const { data, loading, setGranularity } = useAnalyticsTimeSeries({
 *   offerId: 123,
 *   granularity: 'daily'
 * });
 * ```
 */
export function useAnalyticsTimeSeries({
  offerId,
  granularity: initialGranularity = 'daily',
  startDate: initialStartDate,
  endDate: initialEndDate,
  autoFetch = true
}: UseAnalyticsTimeSeriesParams): UseAnalyticsTimeSeriesResult {
  const [data, setData] = useState<TimeSeriesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularityState] = useState<TimeSeriesGranularity>(initialGranularity);
  const [startDate, setStartDate] = useState<Date | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialEndDate);

  const fetchTimeSeries = useCallback(async () => {
    if (!offerId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('granularity', granularity);
      if (startDate) params.set('startDate', startDate.toISOString());
      if (endDate) params.set('endDate', endDate.toISOString());

      const response = await fetch(
        `/api/offers/${offerId}/analytics/timeseries?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch time-series data');
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [offerId, granularity, startDate, endDate]);

  useEffect(() => {
    if (autoFetch && offerId) {
      fetchTimeSeries();
    }
  }, [autoFetch, offerId, fetchTimeSeries]);

  const setGranularity = useCallback((newGranularity: TimeSeriesGranularity) => {
    setGranularityState(newGranularity);
  }, []);

  const setDateRange = useCallback((start: Date | undefined, end: Date | undefined) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchTimeSeries,
    setGranularity,
    setDateRange
  };
}
