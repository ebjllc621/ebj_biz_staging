/**
 * useMobileRecommendations - Mobile-optimized recommendations hook
 *
 * Extends useRecommendations with:
 * - Offline caching via IndexedDB
 * - Background sync for pending actions
 * - Compact payload support
 * - Network-aware fetching
 *
 * @pattern hook/useMobileRecommendations
 * @category connections
 * @reusable true
 * @mobile-compatible true
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Phase 8E
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MobileRecommendedConnection } from '../types';
import { recommendationCacheService } from '../services/RecommendationCacheService';
import { useOnlineStatus } from './useOnlineStatus';
import { ErrorService } from '@core/services/ErrorService';

interface UseMobileRecommendationsResult {
  recommendations: MobileRecommendedConnection[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  isOfflineData: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  dismissRecommendation: (userId: number) => void;
  connectToUser: (userId: number) => void;
  syncPendingActions: () => Promise<void>;
}

export function useMobileRecommendations(
  limit: number = 20,
  autoLoad: boolean = true
): UseMobileRecommendationsResult {
  const [recommendations, setRecommendations] = useState<MobileRecommendedConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isOfflineData, setIsOfflineData] = useState(false);

  const { isOnline } = useOnlineStatus();
  const syncingRef = useRef(false);

  /**
   * Load recommendations from API or cache
   */
  const loadRecommendations = useCallback(async (currentOffset: number, append: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Online: fetch from API
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
          compact: 'true' // Request mobile-optimized payload
        });

        const response = await fetch(`/api/users/connections/recommendations?${params}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to load: ${response.statusText}`);
        }

        const data = await response.json();
        const syncToken = response.headers.get('ETag') || '';

        if (data.success && data.data) {
          const newRecommendations = data.data.recommendations || [];

          if (append) {
            setRecommendations(prev => [...prev, ...newRecommendations]);
          } else {
            setRecommendations(newRecommendations);
            // Cache for offline use
            await recommendationCacheService.cacheRecommendations(
              data.data.userId || 0,
              newRecommendations,
              data.data.total,
              syncToken
            );
          }

          setTotal(data.data.total);
          setIsOfflineData(false);
        }
      } else {
        // Offline: try to load from cache
        const cached = await recommendationCacheService.getCachedRecommendations(0);

        if (cached) {
          setRecommendations(cached.recommendations);
          setTotal(cached.total);
          setIsOfflineData(true);
        } else {
          setError('No cached data available offline');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      // Try cache on error
      const cached = await recommendationCacheService.getCachedRecommendations(0);
      if (cached) {
        setRecommendations(cached.recommendations);
        setTotal(cached.total);
        setIsOfflineData(true);
        setError('Showing cached data due to network error');
      } else {
        setError(errorMessage);
      }

      ErrorService.capture('[useMobileRecommendations] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, limit]);

  /**
   * Refresh recommendations
   */
  const refresh = useCallback(async () => {
    setOffset(0);
    await loadRecommendations(0, false);
  }, [loadRecommendations]);

  /**
   * Load more recommendations
   */
  const loadMore = useCallback(async () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    await loadRecommendations(newOffset, true);
  }, [offset, limit, loadRecommendations]);

  /**
   * Dismiss a recommendation (optimistic update + queue for sync)
   */
  const dismissRecommendation = useCallback((userId: number) => {
    // Optimistic update
    setRecommendations(prev => prev.filter(r => r.userId !== userId));
    setTotal(prev => Math.max(0, prev - 1));

    // Queue action for sync
    if (isOnline) {
      // Sync immediately
      fetch('/api/users/connections/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recommended_user_id: userId,
          action: 'dismissed'
        })
      }).catch(err => {
        ErrorService.capture('[useMobileRecommendations] Dismiss error:', err);
      });
    } else {
      // Queue for later
      recommendationCacheService.addPendingAction({
        type: 'dismiss',
        targetUserId: userId
      });
    }
  }, [isOnline]);

  /**
   * Connect to a user (opens modal - handled by parent)
   */
  const connectToUser = useCallback((userId: number) => {
    // This just triggers the UI flow
    // Actual connection request is handled by the modal
    // We'll remove from list after successful connection
    setRecommendations(prev => prev.filter(r => r.userId !== userId));
    setTotal(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Sync pending actions when back online
   */
  const syncPendingActions = useCallback(async () => {
    if (syncingRef.current || !isOnline) return;
    syncingRef.current = true;

    try {
      const pendingActions = await recommendationCacheService.getPendingActions();

      for (const action of pendingActions) {
        try {
          await fetch('/api/users/connections/recommendations/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              recommended_user_id: action.targetUserId,
              action: action.type
            })
          });

          await recommendationCacheService.removePendingAction(action.id);
        } catch (err) {
          ErrorService.capture('[useMobileRecommendations] Sync action error:', err);
        }
      }
    } finally {
      syncingRef.current = false;
    }
  }, [isOnline]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadRecommendations(0, false);
    }
  }, [autoLoad, loadRecommendations]);

  // Sync when back online
  useEffect(() => {
    if (isOnline) {
      syncPendingActions();
    }
  }, [isOnline, syncPendingActions]);

  const hasMore = recommendations.length < total;

  return {
    recommendations,
    isLoading,
    error,
    hasMore,
    isOfflineData,
    refresh,
    loadMore,
    dismissRecommendation,
    connectToUser,
    syncPendingActions
  };
}
