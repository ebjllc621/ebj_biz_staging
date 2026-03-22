/**
 * Redis-based Rate Limiter Store
 *
 * Redis implementation of LimiterStore interface for production rate limiting.
 * Provides persistent, distributed rate limiting with TTL-based window management.
 */

import { createClient } from 'redis';
import type { LimiterStore } from '@/core/services/rate/RateLimiter';

/**
 * Redis storage for rate limiting buckets
 * Each bucket tracks count with automatic Redis TTL expiration
 */
export class RedisLimiterStore implements LimiterStore {
  private client = createClient({ url: process.env.REDIS_URL });
  private ready = false;

  constructor() {
    this.client.on('error', (err: Error) => {
      // eslint-disable-next-line no-console -- Redis client error logging
    });

    // Attempt to connect, set ready flag on success
    this.client.connect()
      .then(() => {
        this.ready = true;
        // eslint-disable-next-line no-console -- Redis connection status logging
      })
      .catch((err: Error) => {
        // eslint-disable-next-line no-console -- Redis connection error logging
        this.ready = false;
      });
  }

  /**
   * Increment counter for given key and return current state
   *
   * @param key - Unique identifier for the rate limit bucket
   * @param windowSec - Window duration in seconds
   * @returns Current count and reset timestamp
   * @throws Error if Redis is not ready
   */
  async incr(key: string, windowSec: number): Promise<{ count: number; resetAt: number }> {
    if (!this.ready) {
      throw new Error('REDIS_NOT_READY');
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      // Get current TTL to determine if key exists and when it expires
      const ttl = await this.client.ttl(key);

      // Increment the counter
      const count = await this.client.incr(key);

      // If key is new (ttl = -1) or expired (ttl = -2), set expiration
      if (ttl < 0) {
        await this.client.expire(key, windowSec);
        // For new keys, reset time is now + windowSec
        const resetAt = now + windowSec;
        return { count: Number(count), resetAt };
      } else {
        // For existing keys, reset time is now + remaining TTL
        const resetAt = now + ttl;
        return { count: Number(count), resetAt };
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Redis operation error logging
      throw new Error('REDIS_OPERATION_FAILED');
    }
  }

  /**
   * Get current bucket state without incrementing (for testing/debugging)
   *
   * @param key - Bucket key to inspect
   * @returns Current bucket state or null if not found/expired
   */
  async getBucket(key: string): Promise<{ count: number; resetAt: number } | null> {
    if (!this.ready) {
      return null;
    }

    try {
      const count = await this.client.get(key);
      if (count === null) {
        return null;
      }

      const ttl = await this.client.ttl(key);
      if (ttl <= 0) {
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const resetAt = now + ttl;

      return { count: Number(count), resetAt };
    } catch (error) {
      // eslint-disable-next-line no-console -- Redis operation error logging
      return null;
    }
  }

  /**
   * Clear a specific bucket (for testing)
   *
   * @param key - Bucket key to clear
   */
  async clear(key?: string): Promise<void> {
    if (!this.ready) {
      return;
    }

    try {
      if (key) {
        await this.client.del(key);
      } else {
        // Clear all rate limit keys (use with caution)
        const keys = await this.client.keys('*');
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Redis operation error logging
    }
  }

  /**
   * Close Redis connection (for cleanup)
   */
  async disconnect(): Promise<void> {
    if (this.ready) {
      try {
        await this.client.disconnect();
        this.ready = false;
        // eslint-disable-next-line no-console -- Redis connection status logging
      } catch (error) {
        // eslint-disable-next-line no-console -- Redis disconnect error logging
      }
    }
  }

  /**
   * Check if Redis connection is ready
   *
   * @returns True if Redis is connected and ready
   */
  isReady(): boolean {
    return this.ready;
  }
}