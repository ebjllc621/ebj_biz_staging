/**
 * Memory-based Rate Limiter Store
 *
 * In-memory implementation of LimiterStore interface for development and testing.
 * Uses Map-based storage with automatic expiration handling.
 */

import type { LimiterStore } from './RateLimiter';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory storage for rate limiting buckets
 * Each bucket tracks count and reset timestamp for a specific key
 */
const buckets = new Map<string, Bucket>();

export class MemoryLimiterStore implements LimiterStore {
  /**
   * Increment counter for given key and return current state
   *
   * @param key - Unique identifier for the rate limit bucket
   * @param windowSec - Window duration in seconds
   * @returns Current count and reset timestamp
   */
  async incr(key: string, windowSec: number): Promise<{ count: number; resetAt: number }> {
    const now = Math.floor(Date.now() / 1000);
    const existingBucket = buckets.get(key);

    // If bucket doesn't exist or has expired, create fresh bucket
    if (!existingBucket || existingBucket.resetAt <= now) {
      const resetAt = now + windowSec;
      const freshBucket: Bucket = { count: 1, resetAt };
      buckets.set(key, freshBucket);
      return { count: freshBucket.count, resetAt: freshBucket.resetAt };
    }

    // Increment existing bucket
    existingBucket.count += 1;
    return {
      count: existingBucket.count,
      resetAt: existingBucket.resetAt
    };
  }

  /**
   * Get current bucket state without incrementing (for testing/debugging)
   *
   * @param key - Bucket key to inspect
   * @returns Current bucket state or null if not found/expired
   */
  getBucket(key: string): { count: number; resetAt: number } | null {
    const now = Math.floor(Date.now() / 1000);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      return null;
    }

    return { count: bucket.count, resetAt: bucket.resetAt };
  }

  /**
   * Clear all buckets (for testing)
   */
  clear(): void {
    buckets.clear();
  }

  /**
   * Remove expired buckets to prevent memory leaks
   * Should be called periodically in production
   */
  cleanup(): number {
    const now = Math.floor(Date.now() / 1000);
    let removed = 0;

    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
        removed++;
      }
    }

    return removed;
  }
}