/**
 * UserCache - User Data Cache
 *
 * Caches user profile data to reduce database queries.
 * Separate from SessionCache for different TTL and invalidation needs.
 *
 * @authority Build Map v2.1 ENHANCED - STANDARD tier
 * @phase Phase 3 - Caching Strategy
 */

import { LRUCache } from './LRUCache';
import { CachedUserData, CacheStats } from './types';

/**
 * User cache configuration
 */
export interface UserCacheConfig {
  /** Maximum cached users (default: 5000) */
  maxSize?: number;
  /** User cache TTL in milliseconds (default: 600000 = 10 minutes) */
  ttlMs?: number;
}

/**
 * UserCache - Specialized cache for user profile data
 *
 * NOTES:
 * - Longer TTL than SessionCache (user data changes less frequently)
 * - Keyed by user ID (numeric string)
 * - Invalidated on profile update, role change, etc.
 */
export class UserCache {
  private cache: LRUCache<string, CachedUserData>;

  constructor(config: UserCacheConfig = {}) {
    const maxSize = config.maxSize ?? parseInt(process.env.USER_CACHE_MAX_SIZE || '5000', 10);
    const ttlMs = config.ttlMs ?? parseInt(process.env.USER_CACHE_TTL_MS || '600000', 10);

    this.cache = new LRUCache<string, CachedUserData>({
      name: 'UserCache',
      maxSize,
      ttlMs
    });

    console.log(`[UserCache] Initialized with maxSize=${maxSize}, ttlMs=${ttlMs}ms`);
  }

  /**
   * Get cached user by ID
   *
   * @param userId - User ID (numeric)
   * @returns Cached user data or undefined
   */
  get(userId: number | string): CachedUserData | undefined {
    const key = String(userId);
    return this.cache.get(key);
  }

  /**
   * Cache user data
   *
   * @param userId - User ID
   * @param userData - User data to cache
   */
  set(userId: number | string, userData: CachedUserData): void {
    const key = String(userId);
    this.cache.set(key, {
      ...userData,
      cachedAt: new Date()
    });
  }

  /**
   * Invalidate cached user (on profile update, role change, etc.)
   *
   * @param userId - User ID to invalidate
   */
  invalidate(userId: number | string): boolean {
    const key = String(userId);
    const deleted = this.cache.delete(key);

    if (deleted) {
      console.log(`[UserCache] User ${userId} invalidated`);
    }

    return deleted;
  }

  /**
   * Check if user is cached
   *
   * @param userId - User ID
   */
  has(userId: number | string): boolean {
    const key = String(userId);
    return this.cache.has(key);
  }

  /**
   * Clear all cached users
   */
  clear(): void {
    this.cache.clear();
    console.log('[UserCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

/**
 * Singleton instance
 */
let userCacheInstance: UserCache | null = null;

/**
 * Get UserCache singleton
 */
export function getUserCache(): UserCache {
  if (!userCacheInstance) {
    userCacheInstance = new UserCache();
  }
  return userCacheInstance;
}

/**
 * Reset singleton (for testing)
 */
export function resetUserCache(): void {
  userCacheInstance = null;
}
