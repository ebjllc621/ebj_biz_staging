/**
 * ContentRatingWidget - Lightweight content rating component
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 5 - Content Ratings
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Binary mode (article/video): "Was this helpful?" Yes/No buttons with percentage
 * - Star mode (guide/podcast): 1-5 star interactive rating with average display
 * - Auth gate: prompts sign-in for unauthenticated users
 * - Optimistic UI updates on click
 * - Graceful degradation on fetch error (renders nothing)
 *
 * No ErrorBoundary — SIMPLE tier, try/catch handles all failures gracefully.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import { StarRating } from './StarRating';

export interface ContentRatingWidgetProps {
  contentType: 'article' | 'guide' | 'video' | 'podcast';
  contentId: number;
  className?: string;
}

type RatingMode = 'binary' | 'star';

const RATING_MODES: Record<string, RatingMode> = {
  article: 'binary',
  video: 'binary',
  guide: 'star',
  podcast: 'star',
};

interface BinaryData {
  mode: 'binary';
  helpfulCount: number;
  notHelpfulCount: number;
  totalCount: number;
  helpfulPercentage: number;
  userRating: { is_helpful: boolean } | null;
}

interface StarData {
  mode: 'star';
  averageRating: number | null;
  totalRatings: number;
  distribution: Record<number, number>;
  userRating: { rating: number } | null;
}

type RatingData = BinaryData | StarData;

export function ContentRatingWidget({
  contentType,
  contentId,
  className = '',
}: ContentRatingWidgetProps) {
  const { user } = useAuth();
  const [data, setData] = useState<RatingData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hidden, setHidden] = useState(false);

  const mode: RatingMode = RATING_MODES[contentType] ?? 'binary';
  const isAuthenticated = user && user.role !== 'visitor';

  // Fetch aggregate on mount
  useEffect(() => {
    if (!contentId) return;

    const fetchRatings = async () => {
      try {
        const response = await fetch(
          `/api/content/${contentType}/${contentId}/ratings`,
          { credentials: 'include' }
        );
        if (!response.ok) return;
        const json = await response.json();
        if (json.success && json.data) {
          setData(json.data as RatingData);
        }
      } catch {
        // Graceful degradation — hide widget on error
        setHidden(true);
      }
    };

    fetchRatings();
  }, [contentType, contentId]);

  const handleBinaryVote = useCallback(async (isHelpful: boolean) => {
    if (!isAuthenticated || isSubmitting) return;

    // Optimistic update
    setData(prev => {
      if (!prev || prev.mode !== 'binary') return prev;
      const wasHelpful = prev.userRating?.is_helpful;
      let newHelpful = prev.helpfulCount;
      let newNotHelpful = prev.notHelpfulCount;

      // Remove previous vote if switching
      if (wasHelpful === true) newHelpful -= 1;
      if (wasHelpful === false) newNotHelpful -= 1;

      // Add new vote
      if (isHelpful) newHelpful += 1;
      else newNotHelpful += 1;

      const newTotal = newHelpful + newNotHelpful;
      const newPct = newTotal > 0 ? Math.round((newHelpful / newTotal) * 100) : 0;

      return {
        ...prev,
        helpfulCount: newHelpful,
        notHelpfulCount: newNotHelpful,
        totalCount: newTotal,
        helpfulPercentage: newPct,
        userRating: { is_helpful: isHelpful },
      };
    });

    setIsSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/content/${contentType}/${contentId}/ratings`,
        {
          method: 'POST',
          body: JSON.stringify({ is_helpful: isHelpful }),
        }
      );
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setData(json.data as RatingData);
        }
      }
    } catch {
      // Revert not needed — server data will be refetched on next load
    } finally {
      setIsSubmitting(false);
    }
  }, [isAuthenticated, isSubmitting, contentType, contentId]);

  const handleStarChange = useCallback(async (rating: number) => {
    if (!isAuthenticated || isSubmitting) return;

    // Optimistic update
    setData(prev => {
      if (!prev || prev.mode !== 'star') return prev;
      return {
        ...prev,
        userRating: { rating },
      };
    });

    setIsSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/content/${contentType}/${contentId}/ratings`,
        {
          method: 'POST',
          body: JSON.stringify({ rating }),
        }
      );
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setData(json.data as RatingData);
        }
      }
    } catch {
      // Revert not needed
    } finally {
      setIsSubmitting(false);
    }
  }, [isAuthenticated, isSubmitting, contentType, contentId]);

  // Hide on fetch error
  if (hidden) return null;

  // Don't render until data loads (avoids layout shift)
  if (!data) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {mode === 'binary' && data.mode === 'binary' ? (
        <BinaryRatingUI
          data={data}
          contentType={contentType}
          isAuthenticated={!!isAuthenticated}
          isSubmitting={isSubmitting}
          onVote={handleBinaryVote}
        />
      ) : data.mode === 'star' ? (
        <StarRatingUI
          data={data}
          contentType={contentType}
          isAuthenticated={!!isAuthenticated}
          isSubmitting={isSubmitting}
          onRate={handleStarChange}
        />
      ) : null}
    </div>
  );
}

// --- Binary Mode Sub-component ---

interface BinaryRatingUIProps {
  data: BinaryData;
  contentType: string;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  onVote: (isHelpful: boolean) => void;
}

function BinaryRatingUI({
  data,
  contentType,
  isAuthenticated,
  isSubmitting,
  onVote,
}: BinaryRatingUIProps) {
  const { helpfulCount, notHelpfulCount, totalCount, helpfulPercentage, userRating } = data;
  const userVoted = userRating !== null;

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3">Was this helpful?</p>

      {isAuthenticated ? (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onVote(true)}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors disabled:opacity-50 ${
              userVoted && userRating?.is_helpful === true
                ? 'bg-green-50 border-green-400 text-green-700'
                : 'border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
            }`}
            aria-label="Mark as helpful"
            aria-pressed={userVoted && userRating?.is_helpful === true}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Helpful ({helpfulCount})</span>
          </button>

          <button
            onClick={() => onVote(false)}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors disabled:opacity-50 ${
              userVoted && userRating?.is_helpful === false
                ? 'bg-red-50 border-red-400 text-red-700'
                : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'
            }`}
            aria-label="Mark as not helpful"
            aria-pressed={userVoted && userRating?.is_helpful === false}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>Not Helpful ({notHelpfulCount})</span>
          </button>

          {totalCount > 0 && (
            <span className="text-sm text-gray-500">
              {helpfulPercentage}% found this helpful
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-400">
              <ThumbsUp className="w-4 h-4" />
              <span>Helpful ({helpfulCount})</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-400">
              <ThumbsDown className="w-4 h-4" />
              <span>Not Helpful ({notHelpfulCount})</span>
            </span>
          </div>
          <a
            href="/auth/login"
            className="text-sm text-biz-orange hover:text-orange-600 font-medium"
          >
            Sign in to rate this {contentType}
          </a>
        </div>
      )}
    </div>
  );
}

// --- Star Mode Sub-component ---

interface StarRatingUIProps {
  data: StarData;
  contentType: string;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  onRate: (rating: number) => void;
}

function StarRatingUI({
  data,
  contentType,
  isAuthenticated,
  isSubmitting,
  onRate,
}: StarRatingUIProps) {
  const { averageRating, totalRatings, userRating } = data;
  const displayRating = userRating?.rating ?? averageRating ?? 0;

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3">Rate this {contentType}</p>

      {isAuthenticated ? (
        <div className="flex items-center gap-3 flex-wrap">
          <StarRating
            rating={displayRating}
            interactive={true}
            onChange={isSubmitting ? undefined : onRate}
            size="md"
          />
          {averageRating !== null && totalRatings > 0 && (
            <span className="text-sm text-gray-500">
              {averageRating.toFixed(1)} average &bull; {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
            </span>
          )}
          {userRating && (
            <span className="text-xs text-green-600 font-medium">Your rating: {userRating.rating}</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          {averageRating !== null && totalRatings > 0 ? (
            <div className="flex items-center gap-2">
              <StarRating rating={averageRating} interactive={false} size="md" />
              <span className="text-sm text-gray-500">
                {averageRating.toFixed(1)} &bull; {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
              </span>
            </div>
          ) : (
            <StarRating rating={0} interactive={false} size="md" />
          )}
          <a
            href="/auth/login"
            className="text-sm text-biz-orange hover:text-orange-600 font-medium"
          >
            Sign in to rate this {contentType}
          </a>
        </div>
      )}
    </div>
  );
}

export default ContentRatingWidget;
