/**
 * useABTest - Hook Tests
 *
 * @tier ADVANCED
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests A/B test creation, management, results fetching, and winner declaration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useABTest } from '../useABTest';
import type { ABTestConfig, ABTestResults } from '@features/offers/types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTestResults: ABTestResults = {
  test_id: 1,
  offer_id: 1,
  status: 'running',
  variants: [
    { id: 'A', title: 'Original', views: 500, claims: 75 },
    { id: 'B', title: 'Variant', views: 500, claims: 90 },
  ],
  start_date: '2026-01-01',
  end_date: '2026-02-01',
};

const mockTestConfig: ABTestConfig = {
  variantA: { title: 'Original' },
  variantB: { title: 'Variant' },
  trafficSplit: 50,
  duration: 30,
};

describe('useABTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('test creation', () => {
    it('creates A/B test successfully and returns true', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ test: mockTestResults }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: mockTestResults }),
        });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.createTest(mockTestConfig);
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/offers/1/ab-test',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockTestConfig),
        })
      );
    });

    it('returns false when creation fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Creation failed' }),
      });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.createTest(mockTestConfig);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Creation failed');
    });

    it('handles network errors during creation', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.createTest(mockTestConfig);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('refetches results after successful creation', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ test: mockTestResults }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: mockTestResults }),
        });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.createTest(mockTestConfig);
      });

      // Should have called fetch twice - create + refetch results
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('test fetching', () => {
    it('fetches results on mount when autoLoad is true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ results: mockTestResults }),
      });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.results).toEqual(mockTestResults);
        expect(result.current.hasActiveTest).toBe(true);
      });
    });

    it('does not fetch on mount when autoLoad is false', () => {
      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      expect(result.current.results).toBeNull();
      expect(result.current.hasActiveTest).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles 404 response (no active test)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.results).toBeNull();
      expect(result.current.hasActiveTest).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed');
      });
    });

    it('calls fetchResults manually', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ results: mockTestResults }),
      });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchResults();
      });

      expect(result.current.results).toEqual(mockTestResults);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/offers/1/ab-test',
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });

  describe('test management', () => {
    it('stops running test successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: null }),
        });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.stopTest();
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/offers/1/ab-test',
        expect.objectContaining({
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop' }),
        })
      );
    });

    it('handles stop test errors', async () => {
      mockFetch.mockRejectedValue(new Error('Stop failed'));

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.stopTest();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Stop failed');
    });

    it('handles non-ok stop response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.stopTest();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to stop A/B test');
    });
  });

  describe('declaring winner', () => {
    it('declares winner A successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: mockTestResults }),
        });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.declareWinner('a');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/offers/1/ab-test',
        expect.objectContaining({
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'declare_winner', winner: 'a' }),
        })
      );
    });

    it('declares winner B successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: mockTestResults }),
        });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.declareWinner('b');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/offers/1/ab-test',
        expect.objectContaining({
          body: JSON.stringify({ action: 'declare_winner', winner: 'b' }),
        })
      );
    });

    it('handles declare winner errors', async () => {
      mockFetch.mockRejectedValue(new Error('Declaration failed'));

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.declareWinner('a');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Declaration failed');
    });

    it('handles non-ok declare winner response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.declareWinner('b');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to declare winner');
    });

    it('refetches results after declaring winner', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: mockTestResults }),
        });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.declareWinner('a');
      });

      // Should have called fetch twice - declare + refetch results
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasActiveTest', () => {
    it('returns true when results exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ results: mockTestResults }),
      });

      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchResults();
      });

      expect(result.current.hasActiveTest).toBe(true);
    });

    it('returns false when results are null', () => {
      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      expect(result.current.hasActiveTest).toBe(false);
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      expect(result.current).toHaveProperty('results');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('hasActiveTest');
      expect(result.current).toHaveProperty('fetchResults');
      expect(result.current).toHaveProperty('createTest');
      expect(result.current).toHaveProperty('stopTest');
      expect(result.current).toHaveProperty('declareWinner');
    });

    it('returns correct types', () => {
      const { result } = renderHook(() =>
        useABTest({ offerId: 1, autoLoad: false })
      );

      expect(typeof result.current.loading).toBe('boolean');
      expect(typeof result.current.hasActiveTest).toBe('boolean');
      expect(typeof result.current.fetchResults).toBe('function');
      expect(typeof result.current.createTest).toBe('function');
      expect(typeof result.current.stopTest).toBe('function');
      expect(typeof result.current.declareWinner).toBe('function');
    });
  });
});
