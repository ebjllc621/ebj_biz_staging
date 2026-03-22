/**
 * useSocialProof - Hook Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests social proof data fetching (trending, connections, claims).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSocialProof } from '../useSocialProof';

// Mock fetch
global.fetch = vi.fn();

const mockSocialProofData = {
  isTrending: true,
  trendingRank: 1,
  recentClaimsCount: 15,
  connectionsClaimed: 3,
  connectionNames: ['Alice', 'Bob', 'Charlie'],
  totalClaims: 100,
};

describe('useSocialProof', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetching social proof', () => {
    it('fetches social proof on mount when autoLoad is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSocialProofData,
      });

      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockSocialProofData);
      });
    });

    it('does not fetch on mount when autoLoad is false', () => {
      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: false })
      );

      expect(result.current.data).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sets loading state during fetch', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        result.current.fetchSocialProof();
      });

      expect(result.current.loading).toBe(true);
    });

    it('handles fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchSocialProof();
      });

      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.data).toBeNull();
    });

    it('calls correct API endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSocialProofData,
      });

      const { result } = renderHook(() =>
        useSocialProof({ offerId: 123, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchSocialProof();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/offers/123/social-proof',
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });

  describe('data structure', () => {
    it('parses trending data correctly', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSocialProofData,
      });

      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchSocialProof();
      });

      expect(result.current.data?.isTrending).toBe(true);
      expect(result.current.data?.trendingRank).toBe(1);
    });

    it('parses claims data correctly', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSocialProofData,
      });

      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchSocialProof();
      });

      expect(result.current.data?.recentClaimsCount).toBe(15);
      expect(result.current.data?.totalClaims).toBe(100);
    });

    it('parses connections data correctly', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSocialProofData,
      });

      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchSocialProof();
      });

      expect(result.current.data?.connectionsClaimed).toBe(3);
      expect(result.current.data?.connectionNames).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('provides default values for missing data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchSocialProof();
      });

      expect(result.current.data?.isTrending).toBe(false);
      expect(result.current.data?.recentClaimsCount).toBe(0);
      expect(result.current.data?.connectionsClaimed).toBe(0);
      expect(result.current.data?.connectionNames).toEqual([]);
      expect(result.current.data?.totalClaims).toBe(0);
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: false })
      );

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('fetchSocialProof');
    });

    it('has correct function type', () => {
      const { result } = renderHook(() =>
        useSocialProof({ offerId: 1, autoLoad: false })
      );

      expect(typeof result.current.fetchSocialProof).toBe('function');
    });
  });
});
