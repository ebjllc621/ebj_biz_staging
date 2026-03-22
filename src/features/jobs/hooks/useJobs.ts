/**
 * useJobs - Job data fetching hook
 *
 * @hook
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @governance Build Map v2.1 ENHANCED
 *
 * Provides job data fetching with filters and pagination
 */

import { useState, useEffect, useCallback } from 'react';
import type { Job, JobFilters, PaginationParams } from '@features/jobs/types';

interface UseJobsOptions {
  filters?: JobFilters;
  pagination?: PaginationParams;
  autoFetch?: boolean;
}

interface UseJobsReturn {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  total: number;
  totalPages: number;
}

/**
 * Custom hook for fetching and managing job data
 *
 * @param options - Fetch options including filters and pagination
 * @returns Job data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { jobs, isLoading, error, refetch } = useJobs({
 *   filters: { employmentType: 'full_time', city: 'Austin' },
 *   pagination: { page: 1, limit: 20 }
 * });
 * ```
 */
export function useJobs(options: UseJobsOptions = {}): UseJobsReturn {
  const { filters, pagination, autoFetch = true } = options;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();

      if (pagination) {
        params.set('page', pagination.page.toString());
        params.set('limit', pagination.limit.toString());
      }

      if (filters) {
        if (filters.listingId) params.set('listing_id', filters.listingId.toString());
        if (filters.employmentType) params.set('employment_type', filters.employmentType);
        if (filters.compensationType) params.set('compensation_type', filters.compensationType);
        if (filters.workLocationType) params.set('work_location_type', filters.workLocationType);
        if (filters.status) params.set('status', filters.status);
        if (filters.isFeatured !== undefined) params.set('is_featured', filters.isFeatured.toString());
        if (filters.searchQuery) params.set('q', filters.searchQuery);
        if (filters.city) params.set('city', filters.city);
        if (filters.state) params.set('state', filters.state);
        if (filters.minCompensation) params.set('min_compensation', filters.minCompensation.toString());
        if (filters.maxCompensation) params.set('max_compensation', filters.maxCompensation.toString());
        if (filters.postedWithinDays) params.set('posted_within_days', filters.postedWithinDays.toString());
      }

      const response = await fetch(`/api/jobs?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs || []);
        if (data.pagination) {
          setTotal(data.pagination.total || 0);
          setTotalPages(data.pagination.totalPages || 0);
        }
      } else {
        throw new Error(data.error?.message || 'Failed to fetch jobs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
      setJobs([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  useEffect(() => {
    if (autoFetch) {
      fetchJobs();
    }
  }, [autoFetch, fetchJobs]);

  return {
    jobs,
    isLoading,
    error,
    refetch: fetchJobs,
    total,
    totalPages
  };
}

export default useJobs;
