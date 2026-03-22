/**
 * EventReviews - Reviews section container for event detail page
 *
 * Fetches and displays paginated event reviews with:
 * - Rating distribution histogram (EventReviewSummary inline)
 * - Individual review cards (EventReviewCard inline)
 * - "Write a Review" + "View All Reviews" buttons opening BizModal modals
 * - Pagination controls
 * - Loading skeleton and empty state
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4A - Modal System Integration
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, MessageCircle, Star, Plus, Eye } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { WriteReviewModal } from '@/components/reviews/WriteReviewModal';
import { HelpfulButtons } from '@/components/reviews/HelpfulButtons';
import type { EventReview, EventReviewDistribution } from '@features/events/types';

interface EventReviewsProps {
  eventId: number;
  eventTitle?: string;
  listingOwnerId?: number;
  className?: string;
}

// ============================================================
// EventReviewSummary (inline — types differ from shared ReviewSummary)
// ============================================================

interface EventReviewSummaryProps {
  distribution: EventReviewDistribution;
}

function EventReviewSummary({ distribution }: EventReviewSummaryProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 p-4 bg-gray-50 rounded-lg mb-6">
      {/* Average Rating */}
      <div className="flex flex-col items-center justify-center min-w-[80px]">
        <span className="text-4xl font-bold text-gray-900">
          {Number(distribution.average).toFixed(1)}
        </span>
        <div className="flex gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= Math.round(distribution.average) ? 'text-yellow-400' : 'text-gray-300'
              }`}
              fill={star <= Math.round(distribution.average) ? 'currentColor' : 'none'}
            />
          ))}
        </div>
        <span className="text-sm text-gray-500 mt-1">
          {distribution.total} {distribution.total === 1 ? 'review' : 'reviews'}
        </span>
      </div>

      {/* Distribution Bars */}
      <div className="flex-1 space-y-1">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = distribution[star];
          const pct = distribution.total > 0 ? (count / distribution.total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-4">{star}</span>
              <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" />
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-4">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// EventReviewCard (inline — helpful voting + owner response added Phase 4B)
// ============================================================

interface EventReviewCardProps {
  review: EventReview;
  eventId: number;
}

function EventReviewCard({ review, eventId }: EventReviewCardProps) {
  const [showFull, setShowFull] = useState(false);
  const MAX_CHARS = 300;

  const initials = getAvatarInitials(review.user_name || 'Anonymous User');
  const isLong = (review.review_text?.length ?? 0) > MAX_CHARS;
  const displayText = isLong && !showFull
    ? review.review_text!.slice(0, MAX_CHARS) + '...'
    : review.review_text;

  const relativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    const diffYears = Math.floor(diffMonths / 12);
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  };

  return (
    <div className="border border-gray-100 rounded-lg p-4 bg-white">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          {review.user_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.user_avatar}
              alt={review.user_name || 'User'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-purple-700 font-medium text-sm">{initials}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-gray-900 text-sm truncate">
              {review.user_name || 'Anonymous User'}
            </span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {relativeDate(review.created_at)}
            </span>
          </div>

          {/* Stars */}
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                fill={star <= review.rating ? 'currentColor' : 'none'}
              />
            ))}
          </div>

          {/* Review text */}
          {review.review_text && (
            <div className="mt-2">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayText}</p>
              {isLong && (
                <button
                  onClick={() => setShowFull((prev) => !prev)}
                  className="text-xs text-purple-600 hover:text-purple-700 mt-1 font-medium"
                >
                  {showFull ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Helpful voting */}
          <div className="mt-3">
            <HelpfulButtons
              reviewId={review.id}
              reviewUserId={review.user_id}
              helpfulCount={review.helpful_count ?? 0}
              notHelpfulCount={review.not_helpful_count ?? 0}
              endpoint={`/api/events/${eventId}/reviews/${review.id}/helpful`}
            />
          </div>

          {/* Owner response */}
          {review.owner_response && (
            <div className="mt-3 ml-8 p-3 bg-gray-50 rounded-lg border-l-4 border-biz-orange">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <MessageCircle className="w-4 h-4 text-biz-orange" />
                <span className="font-medium">Response from Organizer</span>
              </div>
              <p className="text-sm text-gray-600">{review.owner_response}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EventReviews Container
// ============================================================

function EventReviewsInternal({ eventId, eventTitle, listingOwnerId, className = '' }: EventReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<EventReview[]>([]);
  const [distribution, setDistribution] = useState<EventReviewDistribution | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);

  const fetchReviews = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/events/${eventId}/reviews?page=${page}&limit=5`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const result = await response.json();
      if (result.success || result.ok) {
        const data = result.data;
        setReviews(data.reviews);
        setPagination(data.pagination);
        setDistribution(data.distribution);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const canReview = user && user.role !== 'visitor';
  const displayName = eventTitle || `Event #${eventId}`;

  return (
    <section className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-biz-orange" />
          Reviews
          {pagination.total > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({pagination.total})
            </span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          {/* View All Reviews Button */}
          {pagination.total > 5 && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              View All
            </button>
          )}

          {/* Write Review Button */}
          {canReview && (
            <button
              onClick={() => setShowWriteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Write a Review
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-gray-200 rounded-lg" />
          <div className="h-20 bg-gray-200 rounded-lg" />
          <div className="h-20 bg-gray-200 rounded-lg" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
          <button
            onClick={() => fetchReviews(pagination.page)}
            className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Distribution Summary */}
          {distribution && distribution.total > 0 && (
            <EventReviewSummary distribution={distribution} />
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <EventReviewCard key={review.id} review={review} eventId={eventId} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No reviews yet</p>
              {canReview && (
                <p className="text-sm mt-1">Be the first to share your experience!</p>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => fetchReviews(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-600 text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchReviews(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* WriteReviewModal (BizModal) */}
      <WriteReviewModal
        isOpen={showWriteModal}
        onClose={() => setShowWriteModal(false)}
        entityType="event"
        entityId={eventId}
        entityName={displayName}
        onSuccess={() => { setShowWriteModal(false); fetchReviews(1); }}
      />

      {/* ReviewModal (BizModal) — view all reviews with filter/sort */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        entityType="event"
        entityId={eventId}
        entityName={displayName}
        entityOwnerId={listingOwnerId}
        onReviewSubmitted={() => fetchReviews(1)}
      />
    </section>
  );
}

export function EventReviews(props: EventReviewsProps) {
  return (
    <ErrorBoundary componentName="EventReviews">
      <EventReviewsInternal {...props} />
    </ErrorBoundary>
  );
}
