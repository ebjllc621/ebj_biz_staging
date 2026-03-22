/**
 * useCampaignData - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 9 - Testing & Documentation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests data fetching, loading states, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCampaignData } from '../useCampaignData';

// Mock fetch globally
global.fetch = vi.fn();

describe('useCampaignData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('data fetching', () => {
    it('should fetch from /api/homepage/public', async () => {
      const mockData = {
        active_offers: [{ id: 1, title: 'Offer 1' }],
        upcoming_events: [{ id: 2, title: 'Event 1' }],
        featured_listings: [{ id: 3, name: 'Listing 1' }],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith('/api/homepage/public', {
        credentials: 'include',
      });
    });

    it('should set loading state during fetch', () => {
      (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useCampaignData());

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle successful response', async () => {
      const mockData = {
        active_offers: [{ id: 1, title: 'Offer 1' }],
        upcoming_events: [{ id: 2, title: 'Event 1' }],
        featured_listings: [{ id: 3, name: 'Listing 1' }],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers).toHaveLength(1);
      expect(result.current.events).toHaveLength(1);
      expect(result.current.featuredListings).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty data arrays', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers).toEqual([]);
      expect(result.current.events).toEqual([]);
      expect(result.current.featuredListings).toEqual([]);
    });

    it('should use nullish coalescing for missing data fields', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            active_offers: null,
            upcoming_events: undefined,
          },
        }),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers).toEqual([]);
      expect(result.current.events).toEqual([]);
      expect(result.current.featuredListings).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should return error state on network error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network failed');
      expect(result.current.offers).toEqual([]);
      expect(result.current.events).toEqual([]);
      expect(result.current.featuredListings).toEqual([]);
    });

    it('should return error state on HTTP error response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load campaign data');
    });

    it('should handle JSON parsing error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Invalid JSON');
    });

    it('should handle empty response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers).toEqual([]);
      expect(result.current.events).toEqual([]);
      expect(result.current.featuredListings).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle generic error message for unknown error types', async () => {
      (fetch as any).mockRejectedValueOnce('Unknown error type');

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('An error occurred');
    });
  });

  describe('refetch functionality', () => {
    it('should provide refetch function', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch data when refetch is called', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { active_offers: [] } }),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = (fetch as any).mock.calls.length;

      result.current.refetch();

      await waitFor(() => {
        expect((fetch as any).mock.calls.length).toBe(initialCallCount + 1);
      });
    });
  });

  describe('interface validation', () => {
    it('should return all required properties', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('offers');
      expect(result.current).toHaveProperty('events');
      expect(result.current).toHaveProperty('featuredListings');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
    });

    it('should have correct property types', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const { result } = renderHook(() => useCampaignData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.offers)).toBe(true);
      expect(Array.isArray(result.current.events)).toBe(true);
      expect(Array.isArray(result.current.featuredListings)).toBe(true);
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
