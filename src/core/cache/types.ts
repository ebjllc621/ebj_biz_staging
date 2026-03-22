/**
 * Cache Types and Interfaces
 *
 * GOVERNANCE: Centralized cache type definitions
 * @authority Build Map v2.1 ENHANCED - STANDARD tier
 * @phase Phase 3 - Caching Strategy
 */

/**
 * LRU Cache configuration
 */
export interface LRUCacheConfig {
  /** Maximum number of entries (default: 10000) */
  maxSize: number;
  /** Time-to-live in milliseconds (default: 300000 = 5 minutes) */
  ttlMs: number;
  /** Cache name for logging and monitoring */
  name: string;
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp when entry was created */
  createdAt: number;
  /** Timestamp when entry expires */
  expiresAt: number;
}

/**
 * Cached session validation result
 */
export interface CachedSessionData {
  /** Session ID (not the token) */
  sessionId: string;
  /** User ID from session */
  userId: string;
  /** Session expiration time */
  expiresAt: Date;
  /** Validation timestamp */
  validatedAt: Date;
}

/**
 * Cached user data (subset of full user for performance)
 */
export interface CachedUserData {
  id: number;
  email: string;
  name: string | null;
  account_type: 'visitor' | 'general' | 'listing_member' | 'admin';
  role: string;
  isVerified: boolean;
  /** Cache timestamp */
  cachedAt: Date;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Cache name */
  name: string;
  /** Current number of entries */
  size: number;
  /** Maximum allowed entries */
  maxSize: number;
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate percentage (0-100) */
  hitRate: number;
  /** Total evictions due to size limit */
  evictions: number;
  /** Total expirations due to TTL */
  expirations: number;
}

/**
 * LRU Cache interface
 */
export interface ILRUCache<K, V> {
  /** Get value by key (returns undefined if not found or expired) */
  get(key: K): V | undefined;
  /** Set value with optional custom TTL */
  set(key: K, value: V, ttlMs?: number): void;
  /** Delete specific key */
  delete(key: K): boolean;
  /** Clear all entries */
  clear(): void;
  /** Destroy cache and cleanup resources (prevents memory leaks) */
  destroy(): void;
  /** Get cache statistics */
  getStats(): CacheStats;
  /** Check if key exists and is not expired */
  has(key: K): boolean;
}
