/**
 * MobileRecommendationList - Mobile-optimized recommendation list
 *
 * Features:
 * - Pull-to-refresh
 * - Infinite scroll
 * - Offline indicator
 * - Swipeable cards
 * - Skeleton loading
 *
 * @pattern ui/MobileRecommendationList
 * @category connections
 * @reusable true
 * @mobile-compatible true
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Phase 8E
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MobileRecommendationCard } from './MobileRecommendationCard';
import { useMobileRecommendations } from '../hooks/useMobileRecommendations';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { MobileCardVariant } from '../types';

interface MobileRecommendationListProps {
  variant?: MobileCardVariant;
  showOfflineIndicator?: boolean;
}

function MobileRecommendationListComponent({
  variant = 'compact',
  showOfflineIndicator = true
}: MobileRecommendationListProps) {
  const {
    recommendations,
    isLoading,
    error,
    hasMore,
    isOfflineData,
    refresh,
    loadMore,
    dismissRecommendation,
    connectToUser
  } = useMobileRecommendations();

  const { isOnline, wasOffline } = useOnlineStatus();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh
  const { state: pullState, handlers: pullHandlers, containerStyle } = usePullToRefresh({
    onRefresh: refresh
  });

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  const handleConnect = useCallback((userId: number) => {
    connectToUser(userId);
  }, [connectToUser]);

  const handleDismiss = useCallback((userId: number) => {
    dismissRecommendation(userId);
  }, [dismissRecommendation]);

  return (
    <div
      className="min-h-screen bg-gray-50"
      data-pull-to-refresh
      {...pullHandlers}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center py-2 bg-gray-50"
        style={{
          height: pullState.pullDistance,
          overflow: 'hidden',
          transition: pullState.isPulling ? 'none' : 'height 0.2s ease-out'
        }}
      >
        {pullState.isRefreshing ? (
          <Loader2 className="w-6 h-6 text-biz-orange animate-spin" />
        ) : pullState.canRefresh ? (
          <RefreshCw className="w-6 h-6 text-biz-orange" />
        ) : (
          <RefreshCw className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {/* Offline indicator */}
      {showOfflineIndicator && !isOnline && (
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 py-2 bg-amber-100 text-amber-800 text-sm">
          <WifiOff className="w-4 h-4" />
          <span>You&apos;re offline. Showing cached recommendations.</span>
        </div>
      )}

      {/* Back online indicator */}
      {showOfflineIndicator && isOnline && wasOffline && isOfflineData && (
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 py-2 bg-green-100 text-green-800 text-sm">
          <span>You&apos;re back online!</span>
          <button
            onClick={refresh}
            className="underline font-medium"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Content container */}
      <div style={containerStyle} className="p-4 space-y-3">
        {/* Initial loading */}
        {isLoading && recommendations.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isOfflineData && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 mb-2">{error}</p>
            <button
              onClick={refresh}
              className="text-red-600 underline text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && recommendations.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-2">No recommendations available</p>
            <p className="text-sm text-gray-600">Check back later for new connections!</p>
          </div>
        )}

        {/* Recommendations list */}
        {recommendations.map((recommendation) => (
          <MobileRecommendationCard
            key={recommendation.userId}
            recommendation={recommendation}
            variant={variant}
            onConnect={handleConnect}
            onDismiss={handleDismiss}
          />
        ))}

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="h-4" />

        {/* Loading more indicator */}
        {isLoading && recommendations.length > 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 text-biz-orange animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Wrapped with ErrorBoundary (ADVANCED tier requirement)
 */
export function MobileRecommendationList(props: MobileRecommendationListProps) {
  return (
    <ErrorBoundary componentName="MobileRecommendationList">
      <MobileRecommendationListComponent {...props} />
    </ErrorBoundary>
  );
}

export default MobileRecommendationList;
