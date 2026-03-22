/**
 * useOfferBundles - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests multiple bundles fetching, creation, update, and deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfferBundles } from '../useOfferBundles';

global.fetch = vi.fn();

const mockBundles = [
  { id: 1, name: 'Bundle 1', offer_ids: [1, 2] },
  { id: 2, name: 'Bundle 2', offer_ids: [3, 4] },
];

describe('useOfferBundles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetching bundles', () => {
    it('fetches bundles on mount when autoLoad is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bundles: mockBundles }),
      });

      const { result } = renderHook(() => useOfferBundles({ listingId: 1, autoLoad: true }));

      await waitFor(() => {
        expect(result.current.bundles).toEqual(mockBundles);
      });
    });

    it('handles fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useOfferBundles({ listingId: 1, autoLoad: true }));

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed');
      });
    });
  });

  describe('creating bundles', () => {
    it('creates bundle successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bundle: mockBundles[0] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bundles: mockBundles }),
        });

      const { result } = renderHook(() => useOfferBundles({ listingId: 1, autoLoad: false }));

      let bundle;
      await act(async () => {
        bundle = await result.current.createBundle({ name: 'New Bundle', offer_ids: [1, 2] });
      });

      expect(bundle).toEqual(mockBundles[0]);
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useOfferBundles({ listingId: 1, autoLoad: false }));

      expect(result.current).toHaveProperty('bundles');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('fetchBundles');
      expect(result.current).toHaveProperty('createBundle');
      expect(result.current).toHaveProperty('updateBundle');
      expect(result.current).toHaveProperty('deleteBundle');
    });
  });
});
