/**
 * useFlashCountdown - Hook Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests countdown calculation, timer updates, expiration handling, and cleanup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlashCountdown } from '../useFlashCountdown';

describe('useFlashCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('time calculation', () => {
    it('calculates time remaining correctly', () => {
      const expiresAt = new Date(Date.now() + 3665000); // 1 hour, 1 minute, 5 seconds
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      expect(result.current.hours).toBe(1);
      expect(result.current.minutes).toBe(1);
      expect(result.current.seconds).toBe(5);
      expect(result.current.isExpired).toBe(false);
    });

    it('formats time with padded zeros', () => {
      const expiresAt = new Date(Date.now() + 65000); // 1 minute, 5 seconds
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      expect(result.current.formattedTime).toBe('00:01:05');
    });

    it('calculates percentage remaining', () => {
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      expect(result.current.percentageRemaining).toBeGreaterThan(0);
      expect(result.current.percentageRemaining).toBeLessThanOrEqual(100);
    });
  });

  describe('timer updates', () => {
    it('updates every second', () => {
      const expiresAt = new Date(Date.now() + 5000); // 5 seconds
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      const initialSeconds = result.current.seconds;

      act(() => {
        vi.advanceTimersByTime(1000); // Advance 1 second
      });

      // Seconds should have decremented
      expect(result.current.seconds).toBe(initialSeconds - 1);
    });

    it('decrements time correctly', () => {
      const expiresAt = new Date(Date.now() + 10000); // 10 seconds
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      const initialTotalSeconds = result.current.totalSeconds;

      act(() => {
        vi.advanceTimersByTime(3000); // Advance 3 seconds
      });

      expect(result.current.totalSeconds).toBe(initialTotalSeconds - 3);
    });
  });

  describe('expiration handling', () => {
    it('returns isExpired when time passes', () => {
      const expiresAt = new Date(Date.now() + 1000); // 1 second
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      expect(result.current.isExpired).toBe(false);

      act(() => {
        vi.advanceTimersByTime(2000); // Advance past expiration
      });

      expect(result.current.isExpired).toBe(true);
    });

    it('calls onExpire callback when expired', () => {
      const onExpire = vi.fn();
      const expiresAt = new Date(Date.now() + 1000); // 1 second

      renderHook(() => useFlashCountdown({ expiresAt, onExpire }));

      expect(onExpire).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(2000); // Advance past expiration
      });

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('sets all values to 0 when expired', () => {
      const expiresAt = new Date(Date.now() - 1000); // Already expired
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      expect(result.current.hours).toBe(0);
      expect(result.current.minutes).toBe(0);
      expect(result.current.seconds).toBe(0);
      expect(result.current.totalSeconds).toBe(0);
      expect(result.current.isExpired).toBe(true);
    });

    it('sets percentageRemaining to 0 when expired', () => {
      const expiresAt = new Date(Date.now() - 1000); // Already expired
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      expect(result.current.percentageRemaining).toBe(0);
    });

    it('calls onExpire immediately when already expired', () => {
      const onExpire = vi.fn();
      const expiresAt = new Date(Date.now() - 1000); // Already expired

      renderHook(() => useFlashCountdown({ expiresAt, onExpire }));

      expect(onExpire).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('cleans up interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const expiresAt = new Date(Date.now() + 5000);

      const { unmount } = renderHook(() => useFlashCountdown({ expiresAt }));

      const callsBefore = clearIntervalSpy.mock.calls.length;
      unmount();

      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('stops interval when expired', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const expiresAt = new Date(Date.now() + 1000); // 1 second
      renderHook(() => useFlashCountdown({ expiresAt }));

      const callsBefore = clearIntervalSpy.mock.calls.length;

      act(() => {
        vi.advanceTimersByTime(2000); // Expire
      });

      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe('edge cases', () => {
    it('handles string date format', () => {
      const expiresAt = new Date(Date.now() + 5000).toISOString();
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      expect(result.current.isExpired).toBe(false);
      expect(result.current.totalSeconds).toBeGreaterThan(0);
    });

    it('handles Date object format', () => {
      const expiresAt = new Date(Date.now() + 5000);
      const { result } = renderHook(() => useFlashCountdown({ expiresAt }));

      expect(result.current.isExpired).toBe(false);
      expect(result.current.totalSeconds).toBeGreaterThan(0);
    });
  });
});
