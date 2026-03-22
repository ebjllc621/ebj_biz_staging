/**
 * useLoyalCustomers - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests loyal customers fetching, pagination, and tier filtering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoyalCustomers } from '../useLoyalCustomers';
import type { LoyaltyTier } from '@features/offers/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCustomers = [
  {
    user_id: 1,
    username: 'loyal_user_1',
    claims_count: 10,
    total_spent: 500.0,
    last_claim_date: '2026-02-01',
    tier: 'gold' as LoyaltyTier,
  },
  {
    user_id: 2,
    username: 'loyal_user_2',
    claims_count: 5,
    total_spent: 250.0,
    last_claim_date: '2026-02-15',
    tier: 'silver' as LoyaltyTier,
  },
];

const mockMetrics = {
  totalCustomers: 100,
  byTier: {
    bronze: 50,
    silver: 30,
    gold: 15,
    platinum: 5,
  },
  avgRedemptions: 4.5,
  topCustomers: mockCustomers,
};

describe('useLoyalCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetching loyal customers', () => {
    it('fetches loyal customers on mount when autoLoad is true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: mockCustomers, metrics: mockMetrics }),
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.customers).toEqual(mockCustomers);
        expect(result.current.metrics).toEqual(mockMetrics);
      });
    });

    it('does not fetch on mount when autoLoad is false', () => {
      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: false })
      );

      expect(result.current.customers).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls correct API endpoint with pagination params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: mockCustomers }),
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 123, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchCustomers();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/listings/123/loyal-customers?page=1&limit=20',
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('handles fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchCustomers();
      });

      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.customers).toEqual([]);
    });

    it('handles non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchCustomers();
      });

      expect(result.current.error).toBe('Failed to fetch loyal customers');
    });
  });

  describe('tier filtering', () => {
    it('filters customers by tier', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: mockCustomers }),
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: true })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.customers.length).toBe(2);
      });

      // Clear mock to track new calls
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: [mockCustomers[0]] }),
      });

      // Apply filter - this triggers refetch via useEffect since autoLoad is true
      act(() => {
        result.current.filterByTier('gold');
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/listings/1/loyal-customers?page=1&limit=20&tier=gold',
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('resets page to 1 when filtering', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: mockCustomers, hasMore: false }),
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: false })
      );

      // Fetch page 2 first
      await act(async () => {
        await result.current.fetchCustomers(2);
      });

      expect(result.current.page).toBe(2);

      // Apply filter - should reset to page 1
      act(() => {
        result.current.filterByTier('silver');
      });

      expect(result.current.page).toBe(1);
    });
  });

  describe('pagination', () => {
    it('loads more customers when hasMore is true', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            customers: mockCustomers,
            hasMore: true,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            customers: [
              {
                user_id: 3,
                username: 'user_3',
                claims_count: 3,
                total_spent: 100.0,
                tier: 'bronze',
              },
            ],
            hasMore: false,
          }),
        });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.customers.length).toBe(3);
      expect(result.current.page).toBe(2);
      expect(result.current.hasMore).toBe(false);
    });

    it('does not load more when hasMore is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          customers: mockCustomers,
          hasMore: false,
        }),
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.customers.length).toBe(2);
      });

      const callCount = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.loadMore();
      });

      // Should not have made another fetch call
      expect(mockFetch.mock.calls.length).toBe(callCount);
    });

    it('fetches specific page number', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: mockCustomers }),
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchCustomers(3);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/listings/1/loyal-customers?page=3&limit=20',
        expect.objectContaining({ credentials: 'include' })
      );
      expect(result.current.page).toBe(3);
    });
  });

  describe('loading state', () => {
    it('sets loading false after fetch completes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: mockCustomers }),
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.customers.length).toBe(2);
      });
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: [] }),
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: false })
      );

      expect(result.current).toHaveProperty('customers');
      expect(result.current).toHaveProperty('metrics');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('page');
      expect(result.current).toHaveProperty('hasMore');
      expect(result.current).toHaveProperty('fetchCustomers');
      expect(result.current).toHaveProperty('filterByTier');
      expect(result.current).toHaveProperty('loadMore');
    });

    it('returns correct types', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: [] }),
      });

      const { result } = renderHook(() =>
        useLoyalCustomers({ listingId: 1, autoLoad: false })
      );

      expect(Array.isArray(result.current.customers)).toBe(true);
      expect(typeof result.current.loading).toBe('boolean');
      expect(typeof result.current.page).toBe('number');
      expect(typeof result.current.hasMore).toBe('boolean');
      expect(typeof result.current.fetchCustomers).toBe('function');
      expect(typeof result.current.filterByTier).toBe('function');
      expect(typeof result.current.loadMore).toBe('function');
    });
  });
});
