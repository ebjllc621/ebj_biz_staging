/**
 * CacheManager - Centralized Cache Coordinator
 *
 * Singleton manager for all application caches.
 * Provides unified access, statistics, and invalidation.
 *
 * @authority Build Map v2.1 ENHANCED - STANDARD tier
 * @phase Phase 3 - Caching Strategy
 */

import { SessionCache, getSessionCache, resetSessionCache } from './SessionCache';
import { UserCache, getUserCache, resetUserCache } from './UserCache';
import { CacheStats } from './types';

/**
 * Aggregate cache statistics
 */
export interface CacheManagerStats {
  sessionCache: CacheStats;
  userCache: CacheStats;
  totalSize: number;
  totalHits: number;
  totalMisses: number;
  overallHitRate: number;
}

/**
 * CacheManager - Unified cache access and coordination
 *
 * GOVERNANCE: All cache operations should go through CacheManager
 * @tier STANDARD - Cache coordination service
 */
export class CacheManager {
  private sessionCache: SessionCache;
  private userCache: UserCache;

  constructor() {
    this.sessionCache = getSessionCache();
    this.userCache = getUserCache();
    console.log('[CacheManager] Initialized with SessionCache and UserCache');
  }

  /**
   * Get SessionCache instance
   */
  getSessionCache(): SessionCache {
    return this.sessionCache;
  }

  /**
   * Get UserCache instance
   */
  getUserCache(): UserCache {
    return this.userCache;
  }

  /**
   * Get aggregate statistics for all caches
   */
  getStats(): CacheManagerStats {
    const sessionStats = this.sessionCache.getStats();
    const userStats = this.userCache.getStats();

    const totalHits = sessionStats.hits + userStats.hits;
    const totalMisses = sessionStats.misses + userStats.misses;
    const totalRequests = totalHits + totalMisses;

    return {
      sessionCache: sessionStats,
      userCache: userStats,
      totalSize: sessionStats.size + userStats.size,
      totalHits,
      totalMisses,
      overallHitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0
    };
  }

  /**
   * Clear all caches
   * CAUTION: Use sparingly - forces re-authentication for all users
   */
  clearAll(): void {
    this.sessionCache.clear();
    this.userCache.clear();
    console.log('[CacheManager] All caches cleared');
  }

  /**
   * Invalidate all cached data for a user
   * Called on password change, account suspension, etc.
   *
   * @param userId - User ID to invalidate
   */
  invalidateUser(userId: string | number): void {
    this.sessionCache.invalidateAllForUser(String(userId));
    this.userCache.invalidate(userId);
    console.log(`[CacheManager] User ${userId} invalidated from all caches`);
  }

  /**
   * Health check for cache system
   */
  health(): { healthy: boolean; stats: CacheManagerStats } {
    const stats = this.getStats();
    return {
      healthy: true, // In-memory cache is always "healthy" if running
      stats
    };
  }

  /**
   * Graceful shutdown - clear caches
   */
  async shutdown(): Promise<void> {
    this.clearAll();
    console.log('[CacheManager] Shutdown complete');
  }
}

/**
 * Singleton instance
 */
let cacheManagerInstance: CacheManager | null = null;

/**
 * Get CacheManager singleton
 * GOVERNANCE: Primary access point for cache operations
 */
export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}

/**
 * Reset singleton (for testing)
 */
export function resetCacheManager(): void {
  cacheManagerInstance = null;
  resetSessionCache();
  resetUserCache();
}
