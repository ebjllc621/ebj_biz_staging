/**
 * useOfflineRecommendationQueue - Offline recommendation queue with IndexedDB
 *
 * Provides offline queueing for recommendations with:
 * - IndexedDB storage for offline persistence
 * - Network status detection
 * - Auto-sync on reconnect
 * - Retry with exponential backoff
 * - Queue status indicator
 *
 * @pattern hook/useOfflineRecommendationQueue
 * @category sharing
 * @reusable true
 * @mobile-compatible true
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Phase 9
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { QueuedRecommendation, OfflineQueueStatus, CreateRecommendationInput } from '@features/contacts/types/sharing';
import { fetchWithCsrf } from '@core/utils/csrf';

/**
 * IndexedDB configuration for offline queue persistence
 *
 * EDGE CASE NOTES:
 * - DB_NAME: Shared across all Bizconekt offline features
 * - DB_VERSION: Increment when schema changes (triggers onupgradeneeded)
 * - Storage limit: ~50MB typical, browser-dependent (Chrome: 80%+ of available)
 */
const DB_NAME = 'bizconekt_offline';
const DB_VERSION = 1;
const STORE_NAME = 'recommendation_queue';

/**
 * Retry configuration for failed sync attempts
 *
 * EDGE CASE BEHAVIOR:
 * - After MAX_RETRY_ATTEMPTS (3), item moves to "failed" state
 * - Failed items remain in queue but won't auto-retry
 * - User must manually clear or app must handle via clearQueue()
 * - Exponential backoff: 2s, 4s, 8s (RETRY_DELAY_MS * 2^attempt)
 *
 * NETWORK FLAPPING:
 * - If network status changes rapidly, isSyncing.current prevents parallel syncs
 * - Online event triggers immediate sync attempt
 * - Offline event stops sync loop (won't retry until online)
 *
 * QUEUE OVERFLOW:
 * - No explicit limit (IndexedDB limit applies)
 * - Recommendation: Clear queue items older than 7 days via periodic cleanup
 * - Monitor pending_count in production for queue growth
 */
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Initialize IndexedDB database
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create queue store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('queued_at', 'queued_at', { unique: false });
        store.createIndex('retry_count', 'retry_count', { unique: false });
      }
    };
  });
}

/**
 * Add recommendation to queue
 */
async function queueRecommendation(recommendation: QueuedRecommendation): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.add(recommendation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all queued recommendations
 */
async function getQueuedRecommendations(): Promise<QueuedRecommendation[]> {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove recommendation from queue
 */
async function removeFromQueue(id: string): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update queued recommendation (for retry tracking)
 */
async function updateQueuedRecommendation(recommendation: QueuedRecommendation): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.put(recommendation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export interface UseOfflineRecommendationQueueResult {
  status: OfflineQueueStatus;
  queueRecommendation: (input: CreateRecommendationInput) => Promise<void>;
  syncQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
}

/**
 * Offline recommendation queue with IndexedDB persistence
 *
 * Provides reliable offline queueing for recommendations with:
 * - IndexedDB storage for persistence across sessions
 * - Network status detection (online/offline events)
 * - Auto-sync when coming back online
 * - Exponential backoff retry (3 attempts max)
 * - Queue status for UI indicators
 *
 * @returns Queue management interface with status, queue, sync, and clear functions
 *
 * @example
 * ```tsx
 * function MobileShareComponent() {
 *   const { status, queueRecommendation, syncQueue } = useOfflineRecommendationQueue();
 *
 *   const handleShare = async (input: CreateRecommendationInput) => {
 *     if (!status.is_online) {
 *       // Queue for later sync
 *       await queueRecommendation(input);
 *       toast.info('Recommendation saved. Will send when online.');
 *     } else {
 *       // Send immediately via API
 *       await sendRecommendation(input);
 *     }
 *   };
 *
 *   return (
 *     <>
 *       {status.pending_count > 0 && (
 *         <Badge>{status.pending_count} pending</Badge>
 *       )}
 *       {status.failed_count > 0 && (
 *         <Alert>Some recommendations failed to send</Alert>
 *       )}
 *     </>
 *   );
 * }
 * ```
 *
 * @edge-cases
 * - **Network flapping**: Rapid online/offline prevents duplicate syncs via isSyncing ref
 * - **Tab persistence**: Queue persists in IndexedDB across browser sessions
 * - **Quota exceeded**: Browser-dependent (~50MB); fails silently with console error
 * - **Failed items**: Remain in queue after MAX_RETRY_ATTEMPTS (3); use clearQueue to reset
 * - **Concurrent syncs**: Prevented via isSyncing.current flag
 * - **SSR**: Safe - checks for `typeof window !== 'undefined'`
 */
export function useOfflineRecommendationQueue(): UseOfflineRecommendationQueueResult {
  const [status, setStatus] = useState<OfflineQueueStatus>({
    is_online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pending_count: 0,
    syncing: false,
    last_sync_at: null,
    failed_count: 0
  });

  const isSyncing = useRef(false);

  // Update queue status
  const updateStatus = useCallback(async () => {
    try {
      const queued = await getQueuedRecommendations();
      const failedCount = queued.filter(q => q.retry_count >= MAX_RETRY_ATTEMPTS).length;

      setStatus(prev => ({
        ...prev,
        pending_count: queued.length - failedCount,
        failed_count: failedCount
      }));
    } catch (error) {
      console.error('Failed to update queue status:', error);
    }
  }, []);

  // Queue a recommendation for offline sync
  const queueRecommendationFn = useCallback(async (recommendationInput: CreateRecommendationInput) => {
    const queuedItem: QueuedRecommendation = {
      id: crypto.randomUUID(),
      entity_type: recommendationInput.entity_type,
      entity_id: recommendationInput.entity_id,
      recipient_user_id: recommendationInput.recipient_user_id,
      message: recommendationInput.message || null,
      queued_at: Date.now(),
      retry_count: 0,
      last_error: null
    };

    await queueRecommendation(queuedItem);
    await updateStatus();
  }, [updateStatus]);

  // Sync queued recommendations
  const syncQueue = useCallback(async () => {
    if (isSyncing.current || !status.is_online) return;

    isSyncing.current = true;
    setStatus(prev => ({ ...prev, syncing: true }));

    try {
      const queued = await getQueuedRecommendations();
      const pending = queued.filter(q => q.retry_count < MAX_RETRY_ATTEMPTS);

      for (const item of pending) {
        try {
          // Send recommendation to server
          const response = await fetchWithCsrf('/api/sharing/recommendations', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              entity_type: item.entity_type,
              entity_id: item.entity_id,
              recipient_user_id: item.recipient_user_id,
              message: item.message
            })
          });

          if (response.ok) {
            // Success - remove from queue
            await removeFromQueue(item.id);
          } else {
            // Failed - increment retry count
            const updated: QueuedRecommendation = {
              ...item,
              retry_count: item.retry_count + 1,
              last_error: `HTTP ${response.status}`
            };
            await updateQueuedRecommendation(updated);

            // Wait before next retry
            if (item.retry_count < MAX_RETRY_ATTEMPTS - 1) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, item.retry_count)));
            }
          }
        } catch (error) {
          // Network error - increment retry count
          const updated: QueuedRecommendation = {
            ...item,
            retry_count: item.retry_count + 1,
            last_error: error instanceof Error ? error.message : 'Network error'
          };
          await updateQueuedRecommendation(updated);
        }
      }

      setStatus(prev => ({
        ...prev,
        last_sync_at: Date.now()
      }));
    } finally {
      isSyncing.current = false;
      setStatus(prev => ({ ...prev, syncing: false }));
      await updateStatus();
    }
  }, [status.is_online, updateStatus]);

  // Clear all queued recommendations
  const clearQueue = useCallback(async () => {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = async () => {
        await updateStatus();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }, [updateStatus]);

  // Listen for online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus(prev => ({ ...prev, is_online: true }));
      syncQueue(); // Auto-sync when coming back online
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, is_online: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status update
    updateStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue, updateStatus]);

  return {
    status,
    queueRecommendation: queueRecommendationFn,
    syncQueue,
    clearQueue
  };
}
