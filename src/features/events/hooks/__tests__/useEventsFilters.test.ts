/**
 * useEventsFilters - Hook Tests
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
import { useEventsFilters } from '../useEventsFilters';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/events',
  useSearchParams: () => mockSearchParams,
}));

describe('useEventsFilters', () => {
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
      mockSearchParams.set('q', 'festival');
      mockSearchParams.set('sort', 'name');
      mockSearchParams.set('page', '2');
      mockSearchParams.set('eventType', 'workshop');
      mockSearchParams.set('locationType', 'virtual');

      const { result } = renderHook(() => useEventsFilters());

      expect(result.current.filters.q).toBe('festival');
      expect(result.current.filters.sort).toBe('name');
      expect(result.current.filters.page).toBe(2);
      expect(result.current.filters.eventType).toBe('workshop');
      expect(result.current.filters.locationType).toBe('virtual');
    });

    it('should use default values when URL params are missing', () => {
      const { result } = renderHook(() => useEventsFilters());

      expect(result.current.filters.q).toBe('');
      expect(result.current.filters.sort).toBe('priority');
      expect(result.current.filters.page).toBe(1);
      expect(result.current.filters.eventType).toBeUndefined();
      expect(result.current.filters.locationType).toBeUndefined();
    });

    it('should update URL when filters change', () => {
      const { result } = renderHook(() => useEventsFilters());

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

      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setSortOption('name');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('utm_source=google'),
        expect.objectContaining({ scroll: false })
      );
    });

    it('should remove default values from URL', () => {
      const { result } = renderHook(() => useEventsFilters());

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

      const { result } = renderHook(() => useEventsFilters());

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

      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setSortOption('name');
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('page=');
    });

    it('should reset to page 1 when event type changes', () => {
      mockSearchParams.set('page', '3');

      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setEventType('workshop');
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('page=');
    });

    it('should reset to page 1 when location type changes', () => {
      mockSearchParams.set('page', '3');

      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setLocationType('virtual');
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('page=');
    });
  });

  describe('debounce', () => {
    it('should debounce search input by 300ms', () => {
      const { result } = renderHook(() => useEventsFilters());

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
      const { result } = renderHook(() => useEventsFilters());

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
      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setSortOption('name');
      });

      expect(mockPush).toHaveBeenCalled();
    });

    it('should fire immediately for event type changes', () => {
      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setEventType('workshop');
      });

      expect(mockPush).toHaveBeenCalled();
    });

    it('should fire immediately for location type changes', () => {
      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setLocationType('virtual');
      });

      expect(mockPush).toHaveBeenCalled();
    });

    it('should clear debounce timer on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const { result, unmount } = renderHook(() => useEventsFilters());

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
      const { result, rerender } = renderHook(() => useEventsFilters());

      expect(result.current.activeFilterCount).toBe(0);

      mockSearchParams.set('q', 'test');
      rerender();

      expect(result.current.activeFilterCount).toBe(1);

      mockSearchParams.set('sort', 'name');
      rerender();

      expect(result.current.activeFilterCount).toBe(2);

      mockSearchParams.set('eventType', 'workshop');
      rerender();

      expect(result.current.activeFilterCount).toBe(3);

      mockSearchParams.set('locationType', 'virtual');
      rerender();

      expect(result.current.activeFilterCount).toBe(4);
    });

    it('should not count default sort in active filters', () => {
      const { result, rerender } = renderHook(() => useEventsFilters());

      mockSearchParams.set('sort', 'priority'); // Default value
      rerender();

      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should clear all filters', () => {
      mockSearchParams.set('q', 'test');
      mockSearchParams.set('sort', 'name');
      mockSearchParams.set('eventType', 'workshop');
      mockSearchParams.set('locationType', 'virtual');

      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockPush).toHaveBeenCalledWith(
        '/events?',
        expect.objectContaining({ scroll: false })
      );
    });

    it('should handle empty search query', () => {
      mockSearchParams.set('q', 'test');

      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setSearchQuery('');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('q=');
    });

    it('should handle empty event type', () => {
      mockSearchParams.set('eventType', 'workshop');

      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setEventType(undefined);
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('eventType=');
    });

    it('should handle empty location type', () => {
      mockSearchParams.set('locationType', 'virtual');

      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setLocationType(undefined);
      });

      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall).not.toContain('locationType=');
    });
  });

  describe('events-specific filters', () => {
    it('should handle eventType filter', () => {
      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setEventType('workshop');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('eventType=workshop'),
        expect.any(Object)
      );
    });

    it('should handle locationType filter - physical', () => {
      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setLocationType('physical');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('locationType=physical'),
        expect.any(Object)
      );
    });

    it('should handle locationType filter - virtual', () => {
      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setLocationType('virtual');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('locationType=virtual'),
        expect.any(Object)
      );
    });

    it('should handle locationType filter - hybrid', () => {
      const { result } = renderHook(() => useEventsFilters());

      act(() => {
        result.current.setLocationType('hybrid');
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('locationType=hybrid'),
        expect.any(Object)
      );
    });
  });

  describe('interface validation', () => {
    it('should return all required properties', () => {
      const { result } = renderHook(() => useEventsFilters());

      expect(result.current).toHaveProperty('filters');
      expect(result.current).toHaveProperty('setSearchQuery');
      expect(result.current).toHaveProperty('setSortOption');
      expect(result.current).toHaveProperty('setEventType');
      expect(result.current).toHaveProperty('setLocationType');
      expect(result.current).toHaveProperty('clearFilters');
      expect(result.current).toHaveProperty('activeFilterCount');
      expect(result.current).toHaveProperty('isDebouncing');
    });

    it('should have correct function signatures', () => {
      const { result } = renderHook(() => useEventsFilters());

      expect(typeof result.current.setSearchQuery).toBe('function');
      expect(typeof result.current.setSortOption).toBe('function');
      expect(typeof result.current.setEventType).toBe('function');
      expect(typeof result.current.setLocationType).toBe('function');
      expect(typeof result.current.clearFilters).toBe('function');
    });
  });
});
