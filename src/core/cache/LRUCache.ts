/**
 * LRU Cache Implementation
 *
 * Generic LRU (Least Recently Used) cache with TTL support.
 * Uses doubly-linked list for O(1) eviction and Map for O(1) lookup.
 *
 * @authority Build Map v2.1 ENHANCED - STANDARD tier
 * @phase Phase 3 - Caching Strategy
 */

import { LRUCacheConfig, CacheEntry, CacheStats, ILRUCache } from './types';

/**
 * Doubly-linked list node for LRU tracking
 */
interface LRUNode<K, V> {
  key: K;
  entry: CacheEntry<V>;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

/**
 * LRU Cache with TTL support
 *
 * GOVERNANCE: Generic cache implementation for session and user caching
 * @tier STANDARD - In-memory cache with LRU eviction
 */
export class LRUCache<K, V> implements ILRUCache<K, V> {
  private cache: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;
  private config: LRUCacheConfig;

  // Statistics
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;
  private expirations: number = 0;

  // Automatic TTL cleanup (Option A)
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60000; // Cleanup every 60 seconds

  constructor(config: Partial<LRUCacheConfig> & { name: string }) {
    this.config = {
      maxSize: config.maxSize ?? 10000,
      ttlMs: config.ttlMs ?? 5 * 60 * 1000, // 5 minutes default
      name: config.name
    };
    this.cache = new Map();

    // Start automatic cleanup of expired entries
    this.startAutomaticCleanup();
  }

  /**
   * Get value by key
   * Returns undefined if not found or expired
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > node.entry.expiresAt) {
      this.delete(key);
      this.expirations++;
      this.misses++;
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToFront(node);
    this.hits++;

    return node.entry.value;
  }

  /**
   * Set value with optional custom TTL
   */
  set(key: K, value: V, ttlMs?: number): void {
    const effectiveTtl = ttlMs ?? this.config.ttlMs;
    const now = Date.now();

    const entry: CacheEntry<V> = {
      value,
      createdAt: now,
      expiresAt: now + effectiveTtl
    };

    // Check if key already exists
    const existingNode = this.cache.get(key);
    if (existingNode) {
      existingNode.entry = entry;
      this.moveToFront(existingNode);
      return;
    }

    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Create new node
    const newNode: LRUNode<K, V> = {
      key,
      entry,
      prev: null,
      next: this.head
    };

    // Add to front of list
    if (this.head) {
      this.head.prev = newNode;
    }
    this.head = newNode;

    if (!this.tail) {
      this.tail = newNode;
    }

    this.cache.set(key, newNode);
  }

  /**
   * Delete specific key
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    // Note: Statistics are preserved across clears
  }

  /**
   * Destroy cache and cleanup resources
   * CRITICAL: Prevents memory leaks by stopping cleanup interval
   */
  destroy(): void {
    this.stopAutomaticCleanup();
    this.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    if (Date.now() > node.entry.expiresAt) {
      this.delete(key);
      this.expirations++;
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      name: this.config.name,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0,
      evictions: this.evictions,
      expirations: this.expirations
    };
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.cache.size;
  }

  // Private helper methods

  private moveToFront(node: LRUNode<K, V>): void {
    if (node === this.head) return;

    // Remove from current position
    this.removeNode(node);

    // Add to front
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private evictLRU(): void {
    if (!this.tail) return;

    const keyToEvict = this.tail.key;
    this.removeNode(this.tail);
    this.cache.delete(keyToEvict);
    this.evictions++;
  }

  /**
   * Start automatic cleanup of expired entries
   * Prevents memory leaks from expired but not accessed entries
   */
  private startAutomaticCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CLEANUP_INTERVAL_MS);

    // Allow Node.js to exit even if interval is running
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop automatic cleanup (for testing or destroy)
   */
  private stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Cleanup all expired entries
   * Called automatically every 60 seconds
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: K[] = [];

    // Collect expired keys
    for (const [key, node] of this.cache.entries()) {
      if (now > node.entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    // Delete expired entries
    for (const key of keysToDelete) {
      this.delete(key);
      this.expirations++;
    }

    // Log cleanup if entries were removed
    if (keysToDelete.length > 0) {
      console.log(`[LRUCache:${this.config.name}] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }
}
