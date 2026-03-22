/**
 * SwipeableRecommendationCard - Swipeable recommendation card for mobile inbox
 *
 * Touch-optimized card with swipe-left to dismiss and swipe-right to save gestures.
 * Includes visual feedback and haptic responses.
 *
 * @tier STANDARD
 * @phase Phase 9 - Mobile Experience
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * ```tsx
 * import { SwipeableRecommendationCard } from '@features/sharing/components';
 *
 * function MobileInbox({ recommendations }) {
 *   return recommendations.map(rec => (
 *     <SwipeableRecommendationCard
 *       key={rec.id}
 *       recommendation={rec}
 *       onDismiss={() => handleHide(rec.id)}
 *       onSave={() => handleToggleSaved(rec.id)}
 *       onTap={() => handleView(rec.id)}
 *     />
 *   ));
 * }
 * ```
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Bookmark, X, ExternalLink } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useSwipeGesture } from '@features/connections/hooks/useSwipeGesture';
import type { SharingWithPreview } from '@features/contacts/types/sharing';

interface SwipeableRecommendationCardProps {
  /** Recommendation with preview and sender info */
  recommendation: SharingWithPreview;
  /** Callback when save action is triggered */
  onSave: (recommendationId: number) => void;
  /** Callback when dismiss action is triggered */
  onDismiss: (recommendationId: number) => void;
  /** Callback when recommendation is viewed (marks as read) */
  onMarkViewed?: (recommendationId: number) => void;
  /** Whether an action is in progress */
  isProcessing?: boolean;
}

function SwipeableRecommendationCardInner({
  recommendation,
  onSave,
  onDismiss,
  onMarkViewed,
  isProcessing = false
}: SwipeableRecommendationCardProps) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleSwipeLeft = useCallback(() => {
    setIsExiting(true);
    const recId = recommendation.id;
    setTimeout(() => {
      onDismiss(recId);
    }, 200);
  }, [recommendation.id, onDismiss]);

  const handleSwipeRight = useCallback(() => {
    setIsExiting(true);
    const recId = recommendation.id;
    setTimeout(() => {
      onSave(recId);
    }, 200);
  }, [recommendation.id, onSave]);

  const handleSwipeProgress = useCallback((direction: 'left' | 'right' | 'up' | 'down', progress: number) => {
    if (direction === 'left' || direction === 'right') {
      setSwipeDirection(direction);
      setSwipeProgress(progress);
    }
  }, []);

  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onSwipeProgress: handleSwipeProgress
  });

  // Calculate transform and background based on swipe
  const getSwipeStyles = () => {
    if (isExiting) {
      return {
        transform: `translateX(${swipeDirection === 'left' ? '-100%' : '100%'})`,
        opacity: 0,
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out'
      };
    }
    if (swipeProgress > 0) {
      const translateX = swipeDirection === 'left'
        ? -swipeProgress * 100
        : swipeProgress * 100;
      return {
        transform: `translateX(${translateX}px)`,
        transition: 'none'
      };
    }
    return {
      transform: 'translateX(0)',
      transition: 'transform 0.2s ease-out'
    };
  };

  const getBackgroundIndicator = () => {
    if (swipeProgress < 0.3) return null;

    if (swipeDirection === 'left') {
      return (
        <div className="absolute inset-0 bg-red-100 flex items-center justify-end pr-6 rounded-lg">
          <X className="w-8 h-8 text-red-500" />
        </div>
      );
    }
    if (swipeDirection === 'right') {
      return (
        <div className="absolute inset-0 bg-green-100 flex items-center justify-start pl-6 rounded-lg">
          <Bookmark className="w-8 h-8 text-green-500" />
        </div>
      );
    }
    return null;
  };

  const entityTypeIcons: Record<string, React.ReactNode> = {
    user: '👤',
    listing: '🏢',
    event: '📅',
    article: '📰',
    newsletter: '📧',
    podcast: '🎙️',
    video: '🎥',
    offer: '🎁',
    product: '📦',
    service: '🛠️',
    job_posting: '💼'
  };

  const icon = entityTypeIcons[recommendation.entity_type] || '📄';

  return (
    <div
      className="relative overflow-hidden"
      {...swipeHandlers}
    >
      {getBackgroundIndicator()}
      <div
        className="relative bg-white border border-gray-200 rounded-lg p-4"
        style={getSwipeStyles()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Entity Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
              {recommendation.entity_preview?.title || 'Untitled'}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {recommendation.entity_preview?.description || ''}
            </p>
          </div>
        </div>

        {/* Sender Info */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span>From {recommendation.sender.display_name || recommendation.sender.username}</span>
          {!recommendation.viewed_at && (
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </div>

        {/* Message */}
        {recommendation.referral_message && (
          <div className="p-2 bg-gray-50 rounded text-sm text-gray-700 italic mb-3 line-clamp-3">
            &quot;{recommendation.referral_message}&quot;
          </div>
        )}

        {/* Actions - Touch optimized */}
        <div className="flex gap-2">
          {recommendation.entity_preview?.url && (
            <Link
              href={recommendation.entity_preview.url as Route}
              onClick={() => {
                if (!recommendation.viewed_at && onMarkViewed) {
                  onMarkViewed(recommendation.id);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium min-h-[44px] active:scale-95 transition-transform"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View</span>
            </Link>
          )}
          <button
            onClick={() => onSave(recommendation.id)}
            disabled={isProcessing || recommendation.is_saved}
            className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg min-h-[44px] min-w-[44px] active:scale-95 transition-transform disabled:opacity-50"
            aria-label="Save"
          >
            <Bookmark className={`w-5 h-5 ${recommendation.is_saved ? 'fill-current text-blue-600' : ''}`} />
          </button>
          <button
            onClick={() => onDismiss(recommendation.id)}
            disabled={isProcessing}
            className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg min-h-[44px] min-w-[44px] active:scale-95 transition-transform disabled:opacity-50"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * SwipeableRecommendationCard with ErrorBoundary (STANDARD tier requirement)
 */
export function SwipeableRecommendationCard(props: SwipeableRecommendationCardProps) {
  return (
    <ErrorBoundary>
      <SwipeableRecommendationCardInner {...props} />
    </ErrorBoundary>
  );
}
