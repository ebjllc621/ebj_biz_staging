/**
 * useFlashOffers - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests flash offers fetching, creation, ending, and extension operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFlashOffers } from '../useFlashOffers';

// Mock fetch
global.fetch = vi.fn();

const mockOffers = [
  {
    id: 1,
    listing_id: 1,
    title: 'Flash Offer 1',
    slug: 'flash-offer-1',
    offer_type: 'discount',
    sale_price: 50.00,
    is_flash: true,
    start_date: '2026-01-01',
    end_date: new Date(Date.now() + 3600000).toISOString(),
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('useFlashOffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetching flash offers', () => {
    it('fetches flash offers on manual call', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: mockOffers }),
      });

      const { result } = renderHook(() => useFlashOffers());

      expect(result.current.loading).toBe(false);
      expect(result.current.flashOffers).toEqual([]);

      await act(async () => {
        await result.current.fetchFlashOffers();
      });

      expect(result.current.flashOffers).toEqual(mockOffers);
      expect(result.current.loading).toBe(false);
    });

    it('fetches flash offers on mount when autoLoad is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: mockOffers }),
      });

      const { result } = renderHook(() => useFlashOffers({ autoLoad: true }));

      await waitFor(() => {
        expect(result.current.flashOffers).toEqual(mockOffers);
      });
    });

    it('returns loading state initially', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useFlashOffers());

      await act(async () => {
        result.current.fetchFlashOffers();
      });

      expect(result.current.loading).toBe(true);
    });

    it('returns offers on success', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: mockOffers }),
      });

      const { result } = renderHook(() => useFlashOffers());

      await act(async () => {
        await result.current.fetchFlashOffers();
      });

      expect(result.current.flashOffers).toEqual(mockOffers);
      expect(result.current.error).toBeNull();
    });

    it('handles error state', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useFlashOffers());

      await act(async () => {
        await result.current.fetchFlashOffers();
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.flashOffers).toEqual([]);
    });
  });

  describe('creating flash offers', () => {
    it('creates flash offer successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ offer: mockOffers[0] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ offers: mockOffers }),
        });

      const { result } = renderHook(() => useFlashOffers());

      let createdOffer;
      await act(async () => {
        createdOffer = await result.current.createFlashOffer(1, {
          duration_minutes: 60,
          urgency_level: 'normal',
        });
      });

      expect(createdOffer).toEqual(mockOffers[0]);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/listings/1/offers/flash',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('handles creation error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Creation failed'));

      const { result } = renderHook(() => useFlashOffers());

      let createdOffer;
      await act(async () => {
        createdOffer = await result.current.createFlashOffer(1, {
          duration_minutes: 60,
          urgency_level: 'normal',
        });
      });

      expect(createdOffer).toBeNull();
      expect(result.current.error).toBe('Creation failed');
    });
  });

  describe('ending flash offers', () => {
    it('ends flash offer successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ offers: [] }),
        });

      const { result } = renderHook(() => useFlashOffers());

      let success;
      await act(async () => {
        success = await result.current.endFlashOffer(1);
      });

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/offers/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ is_flash: false, flash_expires_at: null }),
        })
      );
    });

    it('handles end error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('End failed'));

      const { result } = renderHook(() => useFlashOffers());

      let success;
      await act(async () => {
        success = await result.current.endFlashOffer(1);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('End failed');
    });
  });

  describe('extending flash offers', () => {
    it('extends flash offer successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ offers: mockOffers }),
        });

      const { result } = renderHook(() => useFlashOffers());

      let success;
      await act(async () => {
        success = await result.current.extendFlashOffer(1, 30);
      });

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/offers/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ extend_flash_minutes: 30 }),
        })
      );
    });

    it('handles extension error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Extension failed'));

      const { result } = renderHook(() => useFlashOffers());

      let success;
      await act(async () => {
        success = await result.current.extendFlashOffer(1, 30);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Extension failed');
    });
  });
});
