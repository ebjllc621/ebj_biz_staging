/**
 * useOfflineCache - Hook Tests
 *
 * @tier ADVANCED
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests offline claim caching, localStorage storage, validation, and sync.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineCache } from '../useOfflineCache';
import type { OfflineCacheData } from '@features/offers/types';

// Mock fetch - always resolve quickly to prevent timeouts
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
let store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine - default to false to prevent auto-sync on mount
let mockOnlineStatus = false;
Object.defineProperty(navigator, 'onLine', {
  get: () => mockOnlineStatus,
  configurable: true,
});

const mockCacheData: OfflineCacheData = {
  claim_id: 1,
  offer_id: 10,
  promo_code: 'TEST123',
  cached_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
};

const mockExpiredCacheData: OfflineCacheData = {
  claim_id: 2,
  offer_id: 20,
  promo_code: 'EXPIRED',
  cached_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
  expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago (expired)
};

describe('useOfflineCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store = {};
    mockOnlineStatus = false; // Default to offline to prevent auto-sync
    mockFetch.mockReset();
    // Default mock implementation
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('caching claims', () => {
    it('caches claim for offline successfully', async () => {
      mockOnlineStatus = true;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ cacheData: mockCacheData }),
      });

      const { result } = renderHook(() => useOfflineCache());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cacheClaimForOffline(1);
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/claims/1/offline-cache',
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('returns false when caching fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useOfflineCache());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cacheClaimForOffline(1);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to cache claim for offline');
    });

    it('handles network errors when caching', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOfflineCache());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cacheClaimForOffline(1);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('removing cached claims', () => {
    it('removes cached claim', async () => {
      // Pre-populate localStorage with cached data
      store['offlineClaims'] = JSON.stringify([mockCacheData]);

      const { result } = renderHook(() => useOfflineCache());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.cachedClaims.length).toBe(1);
      });

      await act(async () => {
        result.current.removeCachedClaim(1);
      });

      expect(result.current.cachedClaims.length).toBe(0);
    });

    it('does nothing when removing non-existent claim', async () => {
      store['offlineClaims'] = JSON.stringify([mockCacheData]);

      const { result } = renderHook(() => useOfflineCache());

      await waitFor(() => {
        expect(result.current.cachedClaims.length).toBe(1);
      });

      await act(async () => {
        result.current.removeCachedClaim(999);
      });

      expect(result.current.cachedClaims.length).toBe(1);
    });
  });

  describe('cache management', () => {
    it('loads cached claims from localStorage on mount', async () => {
      store['offlineClaims'] = JSON.stringify([mockCacheData]);

      const { result } = renderHook(() => useOfflineCache());

      await waitFor(() => {
        expect(result.current.cachedClaims).toHaveLength(1);
        expect(result.current.cachedClaims[0].claim_id).toBe(1);
      });
    });

    it('clears expired claims on load', async () => {
      // Store both valid and expired claims
      store['offlineClaims'] = JSON.stringify([mockCacheData, mockExpiredCacheData]);

      const { result } = renderHook(() => useOfflineCache());

      await waitFor(() => {
        // Should only have the valid claim
        expect(result.current.cachedClaims).toHaveLength(1);
        expect(result.current.cachedClaims[0].claim_id).toBe(1);
      });
    });

    it('clears expired claims when called explicitly', async () => {
      store['offlineClaims'] = JSON.stringify([mockCacheData]);

      const { result } = renderHook(() => useOfflineCache());

      await waitFor(() => {
        expect(result.current.cachedClaims.length).toBe(1);
      });

      await act(async () => {
        result.current.clearExpiredClaims();
      });

      // Valid claim should still be there
      expect(result.current.cachedClaims.length).toBe(1);
    });
  });

  describe('offline validation', () => {
    it('validates cached claim when online', async () => {
      mockOnlineStatus = true;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ valid: true }),
      });

      const { result } = renderHook(() => useOfflineCache());

      let isValid: boolean | undefined;
      await act(async () => {
        isValid = await result.current.validateOfflineClaim(mockCacheData);
      });

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/claims/offline-validate',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('trusts cached data when offline and not expired', async () => {
      mockOnlineStatus = false;

      const { result } = renderHook(() => useOfflineCache());

      let isValid: boolean | undefined;
      await act(async () => {
        isValid = await result.current.validateOfflineClaim(mockCacheData);
      });

      expect(isValid).toBe(true);
    });

    it('rejects expired cached data when offline', async () => {
      mockOnlineStatus = false;

      const { result } = renderHook(() => useOfflineCache());

      let isValid: boolean | undefined;
      await act(async () => {
        isValid = await result.current.validateOfflineClaim(mockExpiredCacheData);
      });

      expect(isValid).toBe(false);
    });

    it('falls back to expiry check when validation request fails', async () => {
      mockOnlineStatus = true;
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOfflineCache());

      let isValid: boolean | undefined;
      await act(async () => {
        isValid = await result.current.validateOfflineClaim(mockCacheData);
      });

      // Should trust cache if not expired
      expect(isValid).toBe(true);
    });
  });

  describe('sync functionality', () => {
    it('does not sync when offline', async () => {
      mockOnlineStatus = false;
      store['offlineClaims'] = JSON.stringify([mockCacheData]);

      const { result } = renderHook(() => useOfflineCache());

      await waitFor(() => {
        expect(result.current.cachedClaims.length).toBe(1);
      });

      mockFetch.mockClear();

      await act(async () => {
        await result.current.syncCachedClaims();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not sync when no cached claims', async () => {
      mockOnlineStatus = true;

      const { result } = renderHook(() => useOfflineCache());

      mockFetch.mockClear();

      await act(async () => {
        await result.current.syncCachedClaims();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('online/offline status', () => {
    it('tracks online status', () => {
      mockOnlineStatus = true;
      const { result } = renderHook(() => useOfflineCache());

      expect(result.current.isOnline).toBe(true);
    });

    it('tracks offline status', () => {
      mockOnlineStatus = false;
      const { result } = renderHook(() => useOfflineCache());

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useOfflineCache());

      expect(result.current).toHaveProperty('cachedClaims');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isOnline');
      expect(result.current).toHaveProperty('cacheClaimForOffline');
      expect(result.current).toHaveProperty('removeCachedClaim');
      expect(result.current).toHaveProperty('validateOfflineClaim');
      expect(result.current).toHaveProperty('clearExpiredClaims');
      expect(result.current).toHaveProperty('syncCachedClaims');
    });

    it('returns correct types', () => {
      const { result } = renderHook(() => useOfflineCache());

      expect(Array.isArray(result.current.cachedClaims)).toBe(true);
      expect(typeof result.current.loading).toBe('boolean');
      expect(typeof result.current.isOnline).toBe('boolean');
      expect(typeof result.current.cacheClaimForOffline).toBe('function');
      expect(typeof result.current.removeCachedClaim).toBe('function');
      expect(typeof result.current.validateOfflineClaim).toBe('function');
      expect(typeof result.current.clearExpiredClaims).toBe('function');
      expect(typeof result.current.syncCachedClaims).toBe('function');
    });
  });
});
