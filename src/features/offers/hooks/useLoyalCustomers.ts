/**
 * useLoyalCustomers - Hook for business loyal customers management
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { LoyalCustomer, LoyaltyTier } from '@features/offers/types';

interface UseLoyalCustomersOptions {
  listingId: number;
  autoLoad?: boolean;
}

interface LoyaltyMetrics {
  totalCustomers: number;
  byTier: Record<LoyaltyTier, number>;
  avgRedemptions: number;
  topCustomers: LoyalCustomer[];
}

interface UseLoyalCustomersReturn {
  customers: LoyalCustomer[];
  metrics: LoyaltyMetrics | null;
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  fetchCustomers: (pageNum?: number) => Promise<void>;
  filterByTier: (tier: LoyaltyTier | 'all') => void;
  loadMore: () => Promise<void>;
}

export function useLoyalCustomers({
  listingId,
  autoLoad = true,
}: UseLoyalCustomersOptions): UseLoyalCustomersReturn {
  const [customers, setCustomers] = useState<LoyalCustomer[]>([]);
  const [metrics, setMetrics] = useState<LoyaltyMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [tierFilter, setTierFilter] = useState<LoyaltyTier | 'all'>('all');

  const fetchCustomers = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
      });

      if (tierFilter !== 'all') {
        params.append('tier', tierFilter);
      }

      const response = await fetch(
        `/api/listings/${listingId}/loyal-customers?${params}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch loyal customers');
      }

      const data = await response.json();

      if (pageNum === 1) {
        setCustomers(data.customers || []);
        setMetrics(data.metrics || null);
      } else {
        setCustomers((prev) => [...prev, ...(data.customers || [])]);
      }

      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [listingId, tierFilter]);

  const filterByTier = useCallback((tier: LoyaltyTier | 'all') => {
    setTierFilter(tier);
    setPage(1);
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchCustomers(page + 1);
  }, [hasMore, loading, page, fetchCustomers]);

  useEffect(() => {
    if (autoLoad && listingId) {
      fetchCustomers(1);
    }
  }, [autoLoad, listingId, tierFilter, fetchCustomers]);

  return {
    customers,
    metrics,
    loading,
    error,
    page,
    hasMore,
    fetchCustomers,
    filterByTier,
    loadMore,
  };
}
