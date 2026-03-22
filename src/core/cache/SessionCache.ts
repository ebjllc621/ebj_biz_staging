/**
 * SessionCache - Session Validation Cache
 *
 * Caches validated session data to reduce database queries.
 * Uses LRU eviction with configurable TTL and max size.
 *
 * GOVERNANCE: Security-first design with proper invalidation
 * @authority Build Map v2.1 ENHANCED - STANDARD tier
 * @phase Phase 3 - Caching Strategy
 */

import crypto from 'crypto';
import { LRUCache } from './LRUCache';
import { CachedSessionData, CacheStats } from './types';

/**
 * Session cache configuration
 */
export interface SessionCacheConfig {
  /** Maximum cached sessions (default: 10000) */
  maxSize?: number;
  /** Session cache TTL in milliseconds (default: 300000 = 5 minutes) */
  ttlMs?: number;
}

/**
 * SessionCache - Specialized cache for session validation results
 *
 * SECURITY NOTES:
 * - Cache keys are hashed tokens, not raw tokens
 * - Cache is invalidated on logout, password change, session rotation
 * - TTL ensures sessions are re-validated periodically
 */
export class SessionCache {
  private cache: LRUCache<string, CachedSessionData>;

  constructor(config: SessionCacheConfig = {}) {
    const maxSize = config.maxSize ?? parseInt(process.env.SESSION_CACHE_MAX_SIZE || '10000', 10);
    const ttlMs = config.ttlMs ?? parseInt(process.env.SESSION_CACHE_TTL_MS || '300000', 10);

    this.cache = new LRUCache<string, CachedSessionData>({
      name: 'SessionCache',
      maxSize,
      ttlMs
    });

    console.log(`[SessionCache] Initialized with maxSize=${maxSize}, ttlMs=${ttlMs}ms`);
  }

  /**
   * Get cached session by token hash
   *
   * @param sessionToken - Raw session token (will be hashed)
   * @returns Cached session data or undefined
   */
  get(sessionToken: string): CachedSessionData | undefined {
    const key = this.hashToken(sessionToken);
    return this.cache.get(key);
  }

  /**
   * Cache validated session data
   *
   * @param sessionToken - Raw session token (will be hashed)
   * @param sessionData - Validated session data to cache
   */
  set(sessionToken: string, sessionData: CachedSessionData): void {
    const key = this.hashToken(sessionToken);

    // Calculate TTL based on session expiration
    // Don't cache longer than session lifetime
    const sessionTtl = sessionData.expiresAt.getTime() - Date.now();
    const cacheTtl = this.cache.getStats().maxSize;
    const effectiveTtl = Math.min(sessionTtl, cacheTtl);

    this.cache.set(key, sessionData, effectiveTtl > 0 ? effectiveTtl : undefined);
  }

  /**
   * Invalidate cached session (on logout)
   *
   * GOVERNANCE: MUST be called on logout
   * @param sessionToken - Raw session token to invalidate
   */
  invalidate(sessionToken: string): boolean {
    const key = this.hashToken(sessionToken);
    const deleted = this.cache.delete(key);

    if (deleted) {
      console.log('[SessionCache] Session invalidated');
    }

    return deleted;
  }

  /**
   * Invalidate all sessions for a user (on password change)
   *
   * GOVERNANCE: MUST be called on password change
   * NOTE: This is expensive - consider user-indexed secondary cache for production
   *
   * @param userId - User ID to invalidate all sessions for
   * @returns Number of sessions invalidated
   */
  invalidateAllForUser(userId: string): number {
    // For now, clear entire cache (safe but inefficient)
    // TODO: Phase 4 - Add user-indexed secondary map for targeted invalidation
    const stats = this.cache.getStats();
    this.cache.clear();

    console.log(`[SessionCache] Cleared cache for user ${userId} (cleared ${stats.size} entries)`);
    return stats.size;
  }

  /**
   * Check if session is cached
   *
   * @param sessionToken - Raw session token
   */
  has(sessionToken: string): boolean {
    const key = this.hashToken(sessionToken);
    return this.cache.has(key);
  }

  /**
   * Clear all cached sessions
   */
  clear(): void {
    this.cache.clear();
    console.log('[SessionCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Hash session token for use as cache key
   * SECURITY: Never use raw tokens as keys
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  }
}

/**
 * Singleton instance
 */
let sessionCacheInstance: SessionCache | null = null;

/**
 * Get SessionCache singleton
 */
export function getSessionCache(): SessionCache {
  if (!sessionCacheInstance) {
    sessionCacheInstance = new SessionCache();
  }
  return sessionCacheInstance;
}

/**
 * Reset singleton (for testing)
 */
export function resetSessionCache(): void {
  sessionCacheInstance = null;
}
