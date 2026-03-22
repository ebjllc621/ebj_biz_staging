/**
 * useRetryWithBackoff - Retry logic with exponential backoff
 *
 * @hook Custom Hook
 * @tier SIMPLE
 * @phase Phase 8 - Error Handling & Edge Cases
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Provides retry functionality with:
 * - Exponential backoff (1s, 2s, 4s, ...)
 * - Max retry limit
 * - Retry state tracking
 * - Automatic retry for specific error codes
 *
 * @see docs/pages/layouts/listings/phases/PHASE_8_BRAIN_PLAN.md
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseRetryWithBackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnCodes?: string[];
}

interface UseRetryWithBackoffReturn {
  retryCount: number;
  isRetrying: boolean;
  canRetry: boolean;
  executeWithRetry: <T>(_fn: () => Promise<T>) => Promise<T>;
  reset: () => void;
}

export function useRetryWithBackoff(
  options: UseRetryWithBackoffOptions = {}
): UseRetryWithBackoffReturn {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    retryOnCodes = ['NETWORK', 'TIMEOUT'],
  } = options;

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const canRetry = retryCount < maxRetries;

  const getBackoffDelay = useCallback(
    (attempt: number): number => {
      const delay = baseDelayMs * Math.pow(2, attempt);
      return Math.min(delay, maxDelayMs);
    },
    [baseDelayMs, maxDelayMs]
  );

  const executeWithRetry = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setIsRetrying(true);
      try {
        const result = await fn();
        setRetryCount(0); // Reset on success
        return result;
      } catch (error) {
        const errorCode = (error as { code?: string }).code;

        if (canRetry && retryOnCodes.includes(errorCode || '')) {
          const delay = getBackoffDelay(retryCount);
          setRetryCount((prev) => prev + 1);

          await new Promise((resolve) => {
            timeoutRef.current = setTimeout(resolve, delay);
          });

          return executeWithRetry(fn);
        }

        throw error;
      } finally {
        setIsRetrying(false);
      }
    },
    [canRetry, retryCount, retryOnCodes, getBackoffDelay]
  );

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    retryCount,
    isRetrying,
    canRetry,
    executeWithRetry,
    reset,
  };
}

export default useRetryWithBackoff;
