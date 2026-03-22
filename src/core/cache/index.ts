/**
 * Cache Module Public Exports
 *
 * @authority Build Map v2.1 ENHANCED - STANDARD tier
 * @phase Phase 3 - Caching Strategy
 */

// Types
export type {
  LRUCacheConfig,
  CacheEntry,
  CachedSessionData,
  CachedUserData,
  CacheStats,
  ILRUCache
} from './types';

// LRU Cache base implementation
export { LRUCache } from './LRUCache';

// Session Cache
export { SessionCache, getSessionCache, resetSessionCache } from './SessionCache';
export type { SessionCacheConfig } from './SessionCache';

// User Cache
export { UserCache, getUserCache, resetUserCache } from './UserCache';
export type { UserCacheConfig } from './UserCache';

// Cache Manager
export {
  CacheManager,
  getCacheManager,
  resetCacheManager
} from './CacheManager';
export type { CacheManagerStats } from './CacheManager';
