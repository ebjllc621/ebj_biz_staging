/**
 * useOfferBundle - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests single bundle fetching and claiming operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfferBundle } from '../useOfferBundle';

global.fetch = vi.fn();

const mockBundle = {
  id: 1,
  name: 'Test Bundle',
  slug: 'test-bundle',
};

const mockOffers = [
  { id: 1, title: 'Offer 1' },
  { id: 2, title: 'Offer 2' },
];

describe('useOfferBundle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetching bundle', () => {
    it('fetches bundle on mount when autoLoad is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bundle: mockBundle, offers: mockOffers }),
      });

      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: true }));

      await waitFor(() => {
        expect(result.current.bundle).toEqual(mockBundle);
      });
    });

    it('fetches offers with bundle', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bundle: mockBundle, offers: mockOffers }),
      });

      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: true }));

      await waitFor(() => {
        expect(result.current.offers).toEqual(mockOffers);
      });
    });

    it('does not fetch when autoLoad is false', () => {
      renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: false }));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: true }));

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed');
      });
    });

    it('handles 404 response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: true }));

      await waitFor(() => {
        expect(result.current.error).toBe('Bundle not found');
      });
    });
  });

  describe('claiming bundle', () => {
    it('claims bundle successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ claimIds: [1, 2] }),
      });

      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: false }));

      let claimIds: number[] = [];
      await act(async () => {
        claimIds = await result.current.claimBundle();
      });

      expect(claimIds).toEqual([1, 2]);
      expect(result.current.claimed).toBe(true);
    });

    it('sets claiming state during claim', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: false }));

      act(() => {
        result.current.claimBundle();
      });

      expect(result.current.claiming).toBe(true);
    });

    it('handles claim errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Claim failed'));

      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: false }));

      let claimIds: number[] = [];
      await act(async () => {
        claimIds = await result.current.claimBundle();
      });

      expect(claimIds).toEqual([]);
      expect(result.current.error).toBe('Claim failed');
    });

    it('handles API error response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Bundle sold out' }),
      });

      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: false }));

      await act(async () => {
        await result.current.claimBundle();
      });

      expect(result.current.error).toBe('Bundle sold out');
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: false }));

      expect(result.current).toHaveProperty('bundle');
      expect(result.current).toHaveProperty('offers');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('claiming');
      expect(result.current).toHaveProperty('claimed');
      expect(result.current).toHaveProperty('claimedOfferIds');
      expect(result.current).toHaveProperty('fetchBundle');
      expect(result.current).toHaveProperty('claimBundle');
    });

    it('initializes with correct default values', () => {
      const { result } = renderHook(() => useOfferBundle({ slug: 'test-bundle', autoLoad: false }));

      expect(result.current.bundle).toBeNull();
      expect(result.current.offers).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.claiming).toBe(false);
      expect(result.current.claimed).toBe(false);
      expect(result.current.claimedOfferIds).toEqual([]);
    });
  });
});
