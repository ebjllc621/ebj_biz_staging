/**
 * useGeoFence - Hook Tests
 *
 * @tier ADVANCED
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests geo-fence trigger CRUD operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeoFence } from '../useGeoFence';

global.fetch = vi.fn();

const mockTriggers = [
  { id: 1, offer_id: 1, latitude: 47.6062, longitude: -122.3321, radius: 5000, created_at: new Date() },
  { id: 2, offer_id: 1, latitude: 47.6101, longitude: -122.2015, radius: 3000, created_at: new Date() },
];

describe('useGeoFence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetching geo-fence triggers', () => {
    it('fetches triggers on mount when autoLoad is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ triggers: mockTriggers }),
      });

      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: true }));

      await waitFor(() => {
        expect(result.current.triggers).toEqual(mockTriggers);
      });
    });

    it('does not fetch on mount when autoLoad is false', async () => {
      renderHook(() => useGeoFence({ offerId: 1, autoLoad: false }));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: true }));

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed');
      });
    });

    it('handles non-ok response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: true }));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch geo-fence triggers');
      });
    });
  });

  describe('creating geo-fence triggers', () => {
    it('creates trigger successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ trigger: mockTriggers[0] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ triggers: mockTriggers }),
        });

      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: false }));

      let trigger;
      await act(async () => {
        trigger = await result.current.createTrigger({
          latitude: 47.6062,
          longitude: -122.3321,
          radius: 5000,
        });
      });

      expect(trigger).toEqual(mockTriggers[0]);
    });

    it('handles creation errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Creation failed'));

      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: false }));

      let trigger;
      await act(async () => {
        trigger = await result.current.createTrigger({
          latitude: 47.6062,
          longitude: -122.3321,
          radius: 5000,
        });
      });

      expect(trigger).toBeNull();
      expect(result.current.error).toBe('Creation failed');
    });
  });

  describe('deleting geo-fence triggers', () => {
    it('deletes trigger successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ triggers: [] }),
        });

      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: false }));

      let success;
      await act(async () => {
        success = await result.current.deleteTrigger(1);
      });

      expect(success).toBe(true);
    });

    it('handles delete errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: false }));

      let success;
      await act(async () => {
        success = await result.current.deleteTrigger(1);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Delete failed');
    });
  });

  describe('updating geo-fence triggers', () => {
    it('updates trigger successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ triggers: mockTriggers }),
        });

      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: false }));

      let success;
      await act(async () => {
        success = await result.current.updateTrigger(1, { radius: 8000 });
      });

      expect(success).toBe(true);
    });

    it('handles update errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: false }));

      let success;
      await act(async () => {
        success = await result.current.updateTrigger(1, { radius: 8000 });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: false }));

      expect(result.current).toHaveProperty('triggers');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('fetchTriggers');
      expect(result.current).toHaveProperty('createTrigger');
      expect(result.current).toHaveProperty('updateTrigger');
      expect(result.current).toHaveProperty('deleteTrigger');
    });

    it('initializes with empty triggers array', () => {
      const { result } = renderHook(() => useGeoFence({ offerId: 1, autoLoad: false }));

      expect(result.current.triggers).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
