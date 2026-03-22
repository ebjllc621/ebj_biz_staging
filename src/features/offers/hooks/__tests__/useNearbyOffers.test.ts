/**
 * useNearbyOffers - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests nearby offers fetching based on user location and radius.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNearbyOffers } from '../useNearbyOffers';

global.fetch = vi.fn();

const mockNearbyOffers = [
  { id: 1, title: 'Nearby Offer 1', distance: 0.5 },
  { id: 2, title: 'Nearby Offer 2', distance: 2.3 },
];

const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

describe('useNearbyOffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('initializes with empty offers', () => {
      const { result } = renderHook(() => useNearbyOffers({ autoLoad: false }));

      expect(result.current.offers).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.userLocation).toBeNull();
    });
  });

  describe('location handling', () => {
    it('requests location successfully', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 47.6062, longitude: -122.3321 },
        });
      });

      const { result } = renderHook(() => useNearbyOffers({ autoLoad: false }));

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.userLocation).toEqual({ lat: 47.6062, lng: -122.3321 });
      expect(result.current.locationError).toBeNull();
    });

    it('handles permission denied error', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 1, PERMISSION_DENIED: 1 });
      });

      const { result } = renderHook(() => useNearbyOffers({ autoLoad: false }));

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.locationError).toBe('Location permission denied');
    });

    it('handles geolocation not supported', async () => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useNearbyOffers({ autoLoad: false }));

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.locationError).toBe('Geolocation is not supported by your browser');
    });
  });

  describe('fetching nearby offers', () => {
    it('fetches offers when location is available', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({ coords: { latitude: 47.6062, longitude: -122.3321 } });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: mockNearbyOffers }),
      });

      const { result } = renderHook(() => useNearbyOffers({ autoLoad: false }));

      // First get location
      await act(async () => {
        await result.current.requestLocation();
      });

      // Then fetch offers
      await act(async () => {
        await result.current.fetchNearbyOffers();
      });

      expect(result.current.offers).toEqual(mockNearbyOffers);
    });

    it('includes radius in API call', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({ coords: { latitude: 47.6062, longitude: -122.3321 } });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: [] }),
      });

      const { result } = renderHook(() => useNearbyOffers({ radiusKm: 15 }));

      await act(async () => {
        await result.current.requestLocation();
      });

      await act(async () => {
        await result.current.fetchNearbyOffers();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('radius_km=15'),
        expect.any(Object)
      );
    });

    it('sets error when location not available', async () => {
      const { result } = renderHook(() => useNearbyOffers({ autoLoad: false }));

      // fetchNearbyOffers will try to get location but it won't be set
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 1, PERMISSION_DENIED: 1 });
      });

      await act(async () => {
        await result.current.fetchNearbyOffers();
      });

      expect(result.current.error).toBe('Location required to find nearby offers');
    });

    it('handles fetch errors', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({ coords: { latitude: 47.6062, longitude: -122.3321 } });
      });

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useNearbyOffers({ autoLoad: false }));

      await act(async () => {
        await result.current.requestLocation();
      });

      await act(async () => {
        await result.current.fetchNearbyOffers();
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useNearbyOffers({ autoLoad: false }));

      expect(result.current).toHaveProperty('offers');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('userLocation');
      expect(result.current).toHaveProperty('locationError');
      expect(result.current).toHaveProperty('fetchNearbyOffers');
      expect(result.current).toHaveProperty('requestLocation');
    });
  });
});
