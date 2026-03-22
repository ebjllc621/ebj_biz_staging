/**
 * useRetryWithBackoff - Hook Tests
 *
 * @tier SIMPLE
 * @phase Phase 9 - Testing & Documentation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests retry logic with exponential backoff, state management,
 * and cleanup behavior.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRetryWithBackoff } from '../useRetryWithBackoff';

describe('useRetryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRetryWithBackoff());

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.canRetry).toBe(true);
      expect(typeof result.current.executeWithRetry).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should accept custom maxRetries', () => {
      const { result } = renderHook(() => useRetryWithBackoff({ maxRetries: 5 }));

      expect(result.current.canRetry).toBe(true);
    });

    it('should accept custom baseDelayMs', () => {
      const { result } = renderHook(() => useRetryWithBackoff({ baseDelayMs: 2000 }));

      expect(result.current.retryCount).toBe(0);
    });

    it('should accept custom maxDelayMs', () => {
      const { result } = renderHook(() => useRetryWithBackoff({ maxDelayMs: 16000 }));

      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('retry logic', () => {
    it('should execute function successfully without retry', async () => {
      const { result } = renderHook(() => useRetryWithBackoff());
      const mockFn = vi.fn().mockResolvedValue('success');

      let returnedValue: string | undefined;
      await act(async () => {
        returnedValue = await result.current.executeWithRetry(mockFn);
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(returnedValue).toBe('success');
      expect(result.current.retryCount).toBe(0);
    });

    it('should retry on NETWORK error code', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({ maxRetries: 2, baseDelayMs: 100 }));
      const error = Object.assign(new Error('Network error'), { code: 'NETWORK' });
      const mockFn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const promise = act(async () => {
        return result.current.executeWithRetry(mockFn);
      });

      // Fast-forward through backoff delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      const returnedValue = await promise;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(returnedValue).toBe('success');
    });

    it('should retry on TIMEOUT error code', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({
        maxRetries: 2,
        baseDelayMs: 100,
        retryOnCodes: ['TIMEOUT']
      }));
      const error = Object.assign(new Error('Timeout error'), { code: 'TIMEOUT' });
      const mockFn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const promise = act(async () => {
        return result.current.executeWithRetry(mockFn);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      const returnedValue = await promise;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(returnedValue).toBe('success');
    });

    it('should not retry on non-retryable error codes', async () => {
      const { result } = renderHook(() => useRetryWithBackoff());
      const error = Object.assign(new Error('Validation error'), { code: 'VALIDATION' });
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(async () => {
        await act(async () => {
          await result.current.executeWithRetry(mockFn);
        });
      }).rejects.toThrow('Validation error');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries limit', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({ maxRetries: 2, baseDelayMs: 100 }));
      const error = Object.assign(new Error('Network error'), { code: 'NETWORK' });
      const mockFn = vi.fn().mockRejectedValue(error);

      const promise = act(async () => {
        return result.current.executeWithRetry(mockFn).catch(() => {});
      });

      // Advance through first retry
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Advance through second retry
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      await promise;

      // Initial call + 2 retries = 3 total calls
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(result.current.canRetry).toBe(false);
    });

    it('should calculate exponential backoff correctly', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({
        maxRetries: 3,
        baseDelayMs: 1000
      }));
      const error = Object.assign(new Error('Network error'), { code: 'NETWORK' });
      const mockFn = vi.fn().mockRejectedValue(error);

      const promise = act(async () => {
        return result.current.executeWithRetry(mockFn).catch(() => {});
      });

      // First retry: 1000ms delay (1s * 2^0)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      // Second retry: 2000ms delay (1s * 2^1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Third retry: 4000ms delay (1s * 2^2)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      await promise;

      expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should respect maxDelayMs cap', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 5000
      }));
      const error = Object.assign(new Error('Network error'), { code: 'NETWORK' });
      const mockFn = vi.fn().mockRejectedValue(error);

      const promise = act(async () => {
        return result.current.executeWithRetry(mockFn).catch(() => {});
      });

      // Even on 5th retry, delay should be capped at 5000ms
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
      }

      await promise;

      expect(mockFn).toHaveBeenCalledTimes(6); // Initial + 5 retries
    });
  });

  describe('state management', () => {
    it('should set isRetrying during retry', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({ baseDelayMs: 100 }));
      const mockFn = vi.fn().mockResolvedValue('success');

      act(() => {
        result.current.executeWithRetry(mockFn);
      });

      // isRetrying should be true during execution
      expect(result.current.isRetrying).toBe(true);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // isRetrying should be false after completion
      expect(result.current.isRetrying).toBe(false);
    });

    it('should reset state on successful completion', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({ baseDelayMs: 100 }));
      const error = Object.assign(new Error('Network error'), { code: 'NETWORK' });
      const mockFn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const promise = act(async () => {
        return result.current.executeWithRetry(mockFn);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      await promise;

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });

    it('should track retryCount state', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({ maxRetries: 3, baseDelayMs: 100 }));
      const error = Object.assign(new Error('Network error'), { code: 'NETWORK' });
      const mockFn = vi.fn().mockRejectedValue(error);

      const promise = act(async () => {
        return result.current.executeWithRetry(mockFn).catch(() => {});
      });

      // After first retry
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.retryCount).toBe(1);

      // After second retry
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      expect(result.current.retryCount).toBe(2);

      // After third retry
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
      expect(result.current.retryCount).toBe(3);

      await promise;
    });

    it('should prevent retry when canRetry is false', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({ maxRetries: 0 }));
      const error = Object.assign(new Error('Network error'), { code: 'NETWORK' });
      const mockFn = vi.fn().mockRejectedValue(error);

      expect(result.current.canRetry).toBe(false);

      await expect(async () => {
        await act(async () => {
          await result.current.executeWithRetry(mockFn);
        });
      }).rejects.toThrow('Network error');

      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('reset functionality', () => {
    it('should reset retryCount and isRetrying', async () => {
      const { result } = renderHook(() => useRetryWithBackoff({ baseDelayMs: 100 }));
      const error = Object.assign(new Error('Network error'), { code: 'NETWORK' });
      const mockFn = vi.fn().mockRejectedValue(error);

      const promise = act(async () => {
        return result.current.executeWithRetry(mockFn).catch(() => {});
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      await promise;

      // Reset state
      act(() => {
        result.current.reset();
      });

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.canRetry).toBe(true);
    });

    it('should clear timeout on reset', () => {
      const { result } = renderHook(() => useRetryWithBackoff());
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      act(() => {
        result.current.reset();
      });

      // reset() should call clearTimeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const { unmount } = renderHook(() => useRetryWithBackoff());

      unmount();

      // Cleanup should call clearTimeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
