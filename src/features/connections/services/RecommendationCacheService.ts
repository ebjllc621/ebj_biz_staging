/**
 * RecommendationCacheService
 *
 * IndexedDB-based caching layer for offline recommendation support.
 * Provides:
 * - Offline access to cached recommendations
 * - Background sync when online
 * - Pending action queue for offline interactions
 *
 * @pattern service/caching
 * @category connections
 * @reusable true
 * @mobile-compatible true
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Phase 8E
 */

import { MobileRecommendedConnection, CachedRecommendations, OfflineSyncStatus } from '../types';

const DB_NAME = 'bizconekt_connections';
const DB_VERSION = 1;
const STORE_RECOMMENDATIONS = 'recommendations';
const STORE_PENDING_ACTIONS = 'pending_actions';
const CACHE_TTL_MINUTES = 30;

interface PendingAction {
  id: string;
  type: 'dismiss' | 'connect' | 'not_interested';
  targetUserId: number;
  payload?: Record<string, unknown>;
  createdAt: number;
}

class RecommendationCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Recommendations store
        if (!db.objectStoreNames.contains(STORE_RECOMMENDATIONS)) {
          db.createObjectStore(STORE_RECOMMENDATIONS, { keyPath: 'userId' });
        }

        // Pending actions store
        if (!db.objectStoreNames.contains(STORE_PENDING_ACTIONS)) {
          const store = db.createObjectStore(STORE_PENDING_ACTIONS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Cache recommendations for a user
   */
  async cacheRecommendations(
    userId: number,
    recommendations: MobileRecommendedConnection[],
    total: number,
    syncToken: string
  ): Promise<void> {
    await this.init();
    if (!this.db) return;

    const now = Date.now();
    const entry: CachedRecommendations = {
      userId,
      recommendations,
      total,
      cachedAt: now,
      expiresAt: now + (CACHE_TTL_MINUTES * 60 * 1000),
      syncToken
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_RECOMMENDATIONS, 'readwrite');
      const store = tx.objectStore(STORE_RECOMMENDATIONS);
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached recommendations for a user
   */
  async getCachedRecommendations(userId: number): Promise<CachedRecommendations | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_RECOMMENDATIONS, 'readonly');
      const store = tx.objectStore(STORE_RECOMMENDATIONS);
      const request = store.get(userId);

      request.onsuccess = () => {
        const entry = request.result as CachedRecommendations | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check expiration
        if (Date.now() > entry.expiresAt) {
          // Cache expired, delete and return null
          this.clearCache(userId);
          resolve(null);
          return;
        }

        resolve(entry);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add pending action for offline sync
   */
  async addPendingAction(action: Omit<PendingAction, 'id' | 'createdAt'>): Promise<void> {
    await this.init();
    if (!this.db) return;

    const fullAction: PendingAction = {
      ...action,
      id: `${action.type}-${action.targetUserId}-${Date.now()}`,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_PENDING_ACTIONS, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_ACTIONS);
      const request = store.add(fullAction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending actions
   */
  async getPendingActions(): Promise<PendingAction[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_PENDING_ACTIONS, 'readonly');
      const store = tx.objectStore(STORE_PENDING_ACTIONS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove a pending action after sync
   */
  async removePendingAction(actionId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_PENDING_ACTIONS, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_ACTIONS);
      const request = store.delete(actionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear cache for a user
   */
  async clearCache(userId: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_RECOMMENDATIONS, 'readwrite');
      const store = tx.objectStore(STORE_RECOMMENDATIONS);
      const request = store.delete(userId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get offline sync status
   */
  async getSyncStatus(userId: number): Promise<OfflineSyncStatus> {
    const cached = await this.getCachedRecommendations(userId);
    const pending = await this.getPendingActions();

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      lastSyncAt: cached ? new Date(cached.cachedAt) : null,
      pendingActions: pending.length,
      cacheAge: cached ? Math.round((Date.now() - cached.cachedAt) / 60000) : 0
    };
  }
}

export const recommendationCacheService = new RecommendationCacheService();
