/**
 * useBizWireThreads - Hook for fetching paginated BizWire thread lists
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.1
 * @tier STANDARD
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { BizWireThread, BizWireStatus } from '../types';

interface UseBizWireThreadsOptions {
  /** Listing ID for listing-scoped view (listing owner inbox) */
  listingId?: number;
  /** If true, fetch user's own threads instead of listing threads */
  userView?: boolean;
  /** Initial page */
  page?: number;
  /** Items per page */
  limit?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UseBizWireThreadsReturn {
  threads: BizWireThread[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  fetchPage: (page: number) => Promise<void>;
  refresh: () => Promise<void>;
  setSearch: (query: string) => void;
  setStatusFilter: (status: BizWireStatus | 'all') => void;
  search: string;
  statusFilter: BizWireStatus | 'all';
}

export function useBizWireThreads(options: UseBizWireThreadsOptions = {}): UseBizWireThreadsReturn {
  const { listingId, userView = false, page: initialPage = 1, limit = 20 } = options;

  const [threads, setThreads] = useState<BizWireThread[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearchState] = useState('');
  const [statusFilter, setStatusFilterState] = useState<BizWireStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(initialPage);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildUrl = useCallback((page: number, searchQuery: string, status: BizWireStatus | 'all') => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (status !== 'all') params.set('status', status);

    if (userView) {
      return `/api/users/bizwire?${params.toString()}`;
    }
    if (listingId) {
      return `/api/listings/${listingId}/bizwire?${params.toString()}`;
    }
    return null;
  }, [userView, listingId, limit]);

  const fetchThreads = useCallback(async (page: number, searchQuery: string, status: BizWireStatus | 'all') => {
    const url = buildUrl(page, searchQuery, status);
    if (!url) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, { credentials: 'include' });
      const json = await response.json();

      if (!response.ok) {
        const errorMsg = typeof json.error === 'string'
          ? json.error
          : json.error?.message || 'Failed to load threads';
        throw new Error(errorMsg);
      }

      if (json.success) {
        setThreads(json.data.data as BizWireThread[]);
        setPagination(json.data.pagination as Pagination);
        setCurrentPage(page);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [buildUrl]);

  const fetchPage = useCallback(async (page: number) => {
    await fetchThreads(page, search, statusFilter);
  }, [fetchThreads, search, statusFilter]);

  const refresh = useCallback(async () => {
    await fetchThreads(currentPage, search, statusFilter);
  }, [fetchThreads, currentPage, search, statusFilter]);

  const setSearch = useCallback((query: string) => {
    setSearchState(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchThreads(1, query, statusFilter);
    }, 300);
  }, [fetchThreads, statusFilter]);

  const setStatusFilter = useCallback((status: BizWireStatus | 'all') => {
    setStatusFilterState(status);
    fetchThreads(1, search, status);
  }, [fetchThreads, search]);

  // Fetch on mount (or when listingId/userView changes)
  useEffect(() => {
    if (userView || listingId) {
      fetchThreads(initialPage, '', 'all');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, userView]);

  return {
    threads,
    pagination,
    isLoading,
    error,
    fetchPage,
    refresh,
    setSearch,
    setStatusFilter,
    search,
    statusFilter
  };
}
