/**
 * MobileRecommendationInbox - Mobile-optimized recommendation inbox
 *
 * Full mobile inbox with pull-to-refresh, swipeable cards, and infinite scroll.
 * Uses SwipeableRecommendationCard for each item.
 *
 * @tier STANDARD
 * @phase Phase 9 - Mobile Experience
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * ```tsx
 * import { MobileRecommendationInbox } from '@features/sharing/components';
 *
 * function InboxPage() {
 *   return (
 *     <MobileRecommendationInbox
 *       recommendations={recommendations}
 *       isLoading={isLoading}
 *       onRefresh={handleRefresh}
 *       onLoadMore={handleLoadMore}
 *       onMarkViewed={handleMarkViewed}
 *       onToggleSaved={handleToggleSaved}
 *     />
 *   );
 * }
 * ```
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { usePullToRefresh } from '@features/connections/hooks/usePullToRefresh';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { SharingWithPreview } from '@features/contacts/types/sharing';
import { SwipeableRecommendationCard } from './SwipeableRecommendationCard';
import { MobileInboxFilters } from './MobileInboxFilters';

type FilterTab = 'all' | 'unread' | 'saved';

interface MobileRecommendationInboxProps {
  /** Optional initial filter */
  initialFilter?: FilterTab;
}

function MobileRecommendationInboxInner({
  initialFilter = 'all'
}: MobileRecommendationInboxProps) {
  const [recommendations, setRecommendations] = useState<SharingWithPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>(initialFilter);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const [counts, setCounts] = useState({
    all: 0,
    unread: 0,
    saved: 0
  });

  const fetchRecommendations = useCallback(async (filterType: FilterTab, pageNum: number, append = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type: 'received',
        page: pageNum.toString(),
        per_page: '20'
      });

      if (filterType === 'unread') {
        params.append('status', 'unread');
      } else if (filterType === 'saved') {
        params.append('status', 'saved');
      }

      const response = await fetchWithCsrf(`/api/sharing/recommendations?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load recommendations');
      }

      const data = await response.json();
      const items = data.data?.recommendations || data.recommendations || [];

      if (append) {
        setRecommendations(prev => [...prev, ...items]);
      } else {
        setRecommendations(items);
      }

      setHasMore(items.length === 20);

      // Update counts
      if (data.counts || data.data?.counts) {
        const countsData = data.counts || data.data.counts;
        setCounts({
          all: countsData.all || countsData.received || 0,
          unread: countsData.unread || 0,
          saved: countsData.saved || 0
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchRecommendations(activeFilter, 1, false);
    setPage(1);
  }, [activeFilter, fetchRecommendations]);

  const { state: pullState, handlers: pullHandlers, containerStyle } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPull: 120
  });

  // Load initial data
  useEffect(() => {
    fetchRecommendations(activeFilter, 1, false);
    setPage(1);
  }, [activeFilter, fetchRecommendations]);

  // Infinite scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (isLoading || !hasMore) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 300) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchRecommendations(activeFilter, nextPage, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, hasMore, page, activeFilter, fetchRecommendations]);

  const handleSave = async (recommendationId: number) => {
    setProcessingIds(prev => new Set(prev).add(recommendationId));

    try {
      const response = await fetchWithCsrf(`/api/sharing/recommendations/${recommendationId}/save`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to save recommendation');
      }

      // Update local state
      setRecommendations(prev =>
        prev.map(rec =>
          rec.id === recommendationId ? { ...rec, is_saved: true } : rec
        )
      );

      // Update counts
      setCounts(prev => ({
        ...prev,
        saved: prev.saved + 1
      }));

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch (err) {
      console.error('Failed to save recommendation:', err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(recommendationId);
        return next;
      });
    }
  };

  const handleDismiss = async (recommendationId: number) => {
    setProcessingIds(prev => new Set(prev).add(recommendationId));

    try {
      const response = await fetchWithCsrf(`/api/sharing/recommendations/${recommendationId}/dismiss`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss recommendation');
      }

      // Remove from list
      setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));

      // Update counts
      setCounts(prev => ({
        ...prev,
        all: Math.max(0, prev.all - 1),
        unread: Math.max(0, prev.unread - 1)
      }));

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch (err) {
      console.error('Failed to dismiss recommendation:', err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(recommendationId);
        return next;
      });
    }
  };

  const handleMarkViewed = async (recommendationId: number) => {
    try {
      const response = await fetchWithCsrf(`/api/sharing/recommendations/${recommendationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view' })
      });

      if (!response.ok) {
        throw new Error('Failed to mark recommendation as viewed');
      }

      // Optimistic update - set viewed_at locally
      setRecommendations(prev =>
        prev.map(rec =>
          rec.id === recommendationId
            ? { ...rec, viewed_at: new Date() }
            : rec
        )
      );

      // Update unread count
      setCounts(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      }));
    } catch (err) {
      console.error('Failed to mark recommendation as viewed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filter Tabs */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <MobileInboxFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />
      </div>

      {/* Pull-to-refresh indicator */}
      {pullState.isPulling && (
        <div
          className="flex justify-center py-2 text-gray-500"
          style={{ opacity: pullState.pullDistance / 80 }}
        >
          <RefreshCw className={`w-5 h-5 ${pullState.canRefresh ? 'animate-spin' : ''}`} />
        </div>
      )}

      {/* Content */}
      <div
        data-pull-to-refresh
        style={containerStyle}
        {...pullHandlers}
        className="pb-6"
      >
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading && recommendations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Loading recommendations...
          </div>
        )}

        {!isLoading && recommendations.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeFilter === 'unread' && 'All caught up!'}
              {activeFilter === 'saved' && 'No saved recommendations'}
              {activeFilter === 'all' && 'No recommendations yet'}
            </h3>
            <p className="text-gray-600">
              {activeFilter === 'unread' && 'You have no unread recommendations'}
              {activeFilter === 'saved' && 'Save recommendations to view them later'}
              {activeFilter === 'all' && 'Recommendations from your connections will appear here'}
            </p>
          </div>
        )}

        {/* Recommendation List */}
        <div className="px-4 pt-4 space-y-3">
          {recommendations.map(rec => (
            <SwipeableRecommendationCard
              key={rec.id}
              recommendation={rec}
              onSave={handleSave}
              onDismiss={handleDismiss}
              onMarkViewed={handleMarkViewed}
              isProcessing={processingIds.has(rec.id)}
            />
          ))}
        </div>

        {/* Loading More */}
        {isLoading && recommendations.length > 0 && (
          <div className="text-center py-4 text-gray-500">
            Loading more...
          </div>
        )}

        {/* End of List */}
        {!isLoading && !hasMore && recommendations.length > 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            No more recommendations
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MobileRecommendationInbox with ErrorBoundary (STANDARD tier requirement)
 */
export function MobileRecommendationInbox(props: MobileRecommendationInboxProps) {
  return (
    <ErrorBoundary>
      <MobileRecommendationInboxInner {...props} />
    </ErrorBoundary>
  );
}
