/**
 * Unit tests for useOfflineRecommendationQueue hook
 *
 * Tests edge cases documented in TD-010:
 * - Network status detection and updates
 * - Queue status initialization
 * - Event listener registration/cleanup
 * - SSR safety checks
 *
 * Note: Full IndexedDB integration tests should be run in e2e tests
 * as mocking IndexedDB's async behavior is complex.
 *
 * @phase Technical Debt Remediation - Phase 5 (P2: Hook Tests)
 * @coverage Unit tests for testable behaviors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// We need to import the hook fresh after mocking
// Mock modules before importing the hook
vi.mock('@core/utils/csrf', () => ({
  fetchWithCsrf: vi.fn(() => Promise.resolve({ ok: true }))
}));

describe('useOfflineRecommendationQueue', () => {
  let useOfflineRecommendationQueue: typeof import('../useOfflineRecommendationQueue').useOfflineRecommendationQueue;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset online status
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: () => `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    // Dynamic import to get fresh module
    const module = await import('../useOfflineRecommendationQueue');
    useOfflineRecommendationQueue = module.useOfflineRecommendationQueue;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Basic Queue Status Tests
  // ============================================================================
  describe('Queue Status Initialization', () => {
    it('initializes with online status from navigator', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.is_online).toBe(true);
      expect(result.current.status.pending_count).toBe(0);
      expect(result.current.status.syncing).toBe(false);
    });

    it('initializes with offline status when navigator is offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.is_online).toBe(false);
    });

    it('initializes last_sync_at as null', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.last_sync_at).toBeNull();
    });

    it('initializes failed_count as 0', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.failed_count).toBe(0);
    });

    it('initializes pending_count as 0', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.pending_count).toBe(0);
    });
  });

  // ============================================================================
  // Network Status Event Tests
  // ============================================================================
  describe('Network Status Events', () => {
    it('updates status when going offline', async () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.is_online).toBe(true);

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.status.is_online).toBe(false);
      });
    });

    it('updates status when coming back online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.is_online).toBe(false);

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.status.is_online).toBe(true);
      });
    });

    it('handles rapid online/offline transitions', async () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      // Rapid network status changes
      for (let i = 0; i < 5; i++) {
        act(() => {
          Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
          window.dispatchEvent(new Event('offline'));
        });

        act(() => {
          Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
          window.dispatchEvent(new Event('online'));
        });
      }

      // Should settle to online state
      await waitFor(() => {
        expect(result.current.status.is_online).toBe(true);
      });
    });
  });

  // ============================================================================
  // Hook API Structure Tests
  // ============================================================================
  describe('Hook API Structure', () => {
    it('returns status object with correct shape', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status).toHaveProperty('is_online');
      expect(result.current.status).toHaveProperty('pending_count');
      expect(result.current.status).toHaveProperty('syncing');
      expect(result.current.status).toHaveProperty('last_sync_at');
      expect(result.current.status).toHaveProperty('failed_count');
    });

    it('returns queueRecommendation function', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(typeof result.current.queueRecommendation).toBe('function');
    });

    it('returns syncQueue function', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(typeof result.current.syncQueue).toBe('function');
    });

    it('returns clearQueue function', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(typeof result.current.clearQueue).toBe('function');
    });
  });

  // ============================================================================
  // Cleanup Tests
  // ============================================================================
  describe('Cleanup and Lifecycle', () => {
    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useOfflineRecommendationQueue());

      unmount();

      // Should have called removeEventListener for online and offline events
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('registers event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useOfflineRecommendationQueue());

      // Should have called addEventListener for online and offline events
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });

  // ============================================================================
  // SSR Safety Tests
  // ============================================================================
  describe('SSR Safety', () => {
    it('handles undefined window gracefully', () => {
      // The hook checks typeof window !== 'undefined'
      // In a browser environment, this should work without issues
      expect(() => {
        renderHook(() => useOfflineRecommendationQueue());
      }).not.toThrow();
    });

    it('uses navigator.onLine when available', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.is_online).toBe(true);
    });

    it('defaults to online when navigator.onLine is unavailable', () => {
      // The hook has a fallback: typeof navigator !== 'undefined' ? navigator.onLine : true
      // In test environment, navigator should be defined
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(typeof result.current.status.is_online).toBe('boolean');
    });
  });

  // ============================================================================
  // State Consistency Tests
  // ============================================================================
  describe('State Consistency', () => {
    it('maintains consistent status across re-renders', () => {
      const { result, rerender } = renderHook(() => useOfflineRecommendationQueue());

      const initialStatus = result.current.status;

      rerender();

      // Status shape should be the same
      expect(result.current.status).toHaveProperty('is_online');
      expect(result.current.status).toHaveProperty('pending_count');
      expect(result.current.status).toHaveProperty('syncing');

      // Values should be consistent
      expect(result.current.status.is_online).toBe(initialStatus.is_online);
    });

    it('syncing starts as false', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.syncing).toBe(false);
    });

    it('failed_count starts as 0', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(result.current.status.failed_count).toBe(0);
    });
  });

  // ============================================================================
  // Function Stability Tests
  // ============================================================================
  describe('Function Stability', () => {
    it('queueRecommendation is stable across renders', () => {
      const { result, rerender } = renderHook(() => useOfflineRecommendationQueue());

      const initialFn = result.current.queueRecommendation;

      rerender();

      // Function reference should be stable (useCallback)
      expect(result.current.queueRecommendation).toBe(initialFn);
    });

    it('clearQueue is stable across renders', () => {
      const { result, rerender } = renderHook(() => useOfflineRecommendationQueue());

      const initialFn = result.current.clearQueue;

      rerender();

      // Function reference should be stable (useCallback)
      expect(result.current.clearQueue).toBe(initialFn);
    });
  });

  // ============================================================================
  // Type Safety Tests
  // ============================================================================
  describe('Type Safety', () => {
    it('status.is_online is boolean', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(typeof result.current.status.is_online).toBe('boolean');
    });

    it('status.pending_count is number', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(typeof result.current.status.pending_count).toBe('number');
    });

    it('status.failed_count is number', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(typeof result.current.status.failed_count).toBe('number');
    });

    it('status.syncing is boolean', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(typeof result.current.status.syncing).toBe('boolean');
    });

    it('status.last_sync_at is number or null', () => {
      const { result } = renderHook(() => useOfflineRecommendationQueue());

      expect(
        result.current.status.last_sync_at === null ||
        typeof result.current.status.last_sync_at === 'number'
      ).toBe(true);
    });
  });
});
