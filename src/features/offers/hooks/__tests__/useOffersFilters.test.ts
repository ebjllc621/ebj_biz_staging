/**
 * useOffersFilters - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests URL synchronization, debouncing, and filter operations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOffersFilters } from '../useOffersFilters';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/offers',
  useSearchParams: () => mockSearchParams,
}));

describe('useOffersFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Completely clear mock search params
    Array.from(mockSearchParams.keys()).forEach(key => {
      mockSearchParams.delete(key);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up after each test
    Array.from(mockSearchParams.keys()).forEach(key => {
      mockSearchParams.delete(key);
    });
  });

  describe('URL parameter sync', () => {
    it('should read initial filters from URL', () => {
      mockSearchParams.set('q', 'summer');
      mockSearchParams.set('sort', 'price_low');
      mockSearchParams.set('page', '2');
      mockSearchParams.set('offerType', 'discount');

      const { result } = renderHook(() => useOffersFilters());

      expect(result.current.filters.q).toBe('summer');
      expect(result.current.filters.sort).toBe('price_low');
      expect(result.current.filters.page).toBe(2);
      expect(result.current.filters.offerType).toBe('discount');
    });

    it('should use default values when URL params are missing', () => {
      const { result } = renderHook(() => useOffersFilters());

      expect(result.current.filters.q).toBe('');
      expect(result.current.filters.sort).toBe('priority');
      expect(result.current.filters.page).toBe(1);
      expect(result.current.filters.offerType).toBeUndefined();
    });

    it('should update URL when filters change', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setSearchQuery('test search');
      });

      act(() => {
        vi.advanceTimersByTime(300); // Wait for debounce
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('q=test+search'),
        expect.objectContaining({ scroll: false })
      );
    });

    it('should preserve other URL params when updating', () => {
      mockSearchParams.set('utm_source', 'google');

      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setSortOption('price_low');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('utm_source=google'),
        expect.objectContaining({ scroll: false })
      );
    });

    it('should remove default values from URL', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setSortOption('priority'); // Default value
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.not.stringContaining('sort='),
        expect.any(Object)
      );
    });

    it('should reset to page 1 when search query changes', () => {
      mockSearchParams.set('page', '3');

      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setSearchQuery('new search');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('page=');
    });

    it('should reset to page 1 when sort changes', () => {
      mockSearchParams.set('page', '3');

      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setSortOption('price_low');
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('page=');
    });

    it('should reset to page 1 when offer type changes', () => {
      mockSearchParams.set('page', '3');

      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setOfferType('discount');
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('page=');
    });
  });

  describe('debounce', () => {
    it('should debounce search input by 300ms', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isDebouncing).toBe(true);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockPush).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockPush).toHaveBeenCalled();
      expect(result.current.isDebouncing).toBe(false);
    });

    it('should reset debounce timer on consecutive calls', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setSearchQuery('te');
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockPush).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('should fire immediately for sort changes', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setSortOption('price_low');
      });

      expect(mockPush).toHaveBeenCalled();
    });

    it('should fire immediately for offer type changes', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setOfferType('discount');
      });

      expect(mockPush).toHaveBeenCalled();
    });

    it('should clear debounce timer on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const { result, unmount } = renderHook(() => useOffersFilters());

      // Trigger debounce to create a timer
      act(() => {
        result.current.setSearchQuery('test');
      });

      const callsBefore = clearTimeoutSpy.mock.calls.length;

      unmount();

      // Should have called clearTimeout at least once more on unmount
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe('filter operations', () => {
    it('should track active filter count', () => {
      const { result, rerender } = renderHook(() => useOffersFilters());

      expect(result.current.activeFilterCount).toBe(0);

      mockSearchParams.set('q', 'test');
      rerender();

      expect(result.current.activeFilterCount).toBe(1);

      mockSearchParams.set('sort', 'price_low');
      rerender();

      expect(result.current.activeFilterCount).toBe(2);

      mockSearchParams.set('offerType', 'discount');
      rerender();

      expect(result.current.activeFilterCount).toBe(3);
    });

    it('should not count default sort in active filters', () => {
      const { result, rerender } = renderHook(() => useOffersFilters());

      mockSearchParams.set('sort', 'priority'); // Default value
      rerender();

      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should clear all filters', () => {
      mockSearchParams.set('q', 'test');
      mockSearchParams.set('sort', 'price_low');
      mockSearchParams.set('offerType', 'discount');

      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockPush).toHaveBeenCalledWith(
        '/offers?',
        expect.objectContaining({ scroll: false })
      );
    });

    it('should handle empty search query', () => {
      mockSearchParams.set('q', 'test');

      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setSearchQuery('');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('q=');
    });

    it('should handle empty offer type', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setOfferType(undefined);
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('offerType=');
    });
  });

  describe('offers-specific filters', () => {
    it('should handle offerType filter - discount', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setOfferType('discount');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('offerType=discount'),
        expect.any(Object)
      );
    });

    it('should handle offerType filter - coupon', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setOfferType('coupon');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('offerType=coupon'),
        expect.any(Object)
      );
    });

    it('should handle offerType filter - product', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setOfferType('product');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('offerType=product'),
        expect.any(Object)
      );
    });

    it('should handle offerType filter - service', () => {
      const { result } = renderHook(() => useOffersFilters());

      act(() => {
        result.current.setOfferType('service');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('offerType=service'),
        expect.any(Object)
      );
    });
  });

  describe('interface validation', () => {
    it('should return all required properties', () => {
      const { result } = renderHook(() => useOffersFilters());

      expect(result.current).toHaveProperty('filters');
      expect(result.current).toHaveProperty('setSearchQuery');
      expect(result.current).toHaveProperty('setSortOption');
      expect(result.current).toHaveProperty('setOfferType');
      expect(result.current).toHaveProperty('setCategory');
      expect(result.current).toHaveProperty('clearFilters');
      expect(result.current).toHaveProperty('activeFilterCount');
      expect(result.current).toHaveProperty('isDebouncing');
    });

    it('should have correct function signatures', () => {
      const { result } = renderHook(() => useOffersFilters());

      expect(typeof result.current.setSearchQuery).toBe('function');
      expect(typeof result.current.setSortOption).toBe('function');
      expect(typeof result.current.setOfferType).toBe('function');
      expect(typeof result.current.setCategory).toBe('function');
      expect(typeof result.current.clearFilters).toBe('function');
    });
  });
});
