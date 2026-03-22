/**
 * useJobAnalyticsDashboard - Fetch job analytics dashboard data
 *
 * @hook
 * @tier SIMPLE
 * @phase Jobs Analytics Dashboard
 * @authority docs/pages/layouts/job_ops/build/phases/JOBS_ANALYTICS_DASHBOARD_BRAIN_PLAN.md
 *
 * Provides:
 * - Job analytics funnel data
 * - Social share performance
 * - Hire reports
 * - Date range filtering
 */

import { useState, useEffect, useCallback } from 'react';
import type { JobAnalyticsDashboardData } from '@features/jobs/types';

export interface DateRange {
  start: string;
  end: string;
}

export interface UseJobAnalyticsDashboardResult {
  data: JobAnalyticsDashboardData | null;
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

export function useJobAnalyticsDashboard(jobId: number | null): UseJobAnalyticsDashboardResult {
  const [data, setData] = useState<JobAnalyticsDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const fetchData = useCallback(async () => {
    if (!jobId) {
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

      const response = await fetch(`/api/jobs/${jobId}/analytics?${params}`, {
        credentials: 'include'
      });

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
  }, [jobId, dateRange]);

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
