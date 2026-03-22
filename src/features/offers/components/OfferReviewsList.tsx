/**
 * OfferReviewsList - List of reviews on offer page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4A - Modal System Integration
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Paginated review display with load-more
 * - Quick feedback badges (as described, easy redemption)
 * - "Write a Review" + "View All Reviews" buttons opening BizModal modals
 * - Offer reviews require claimId to create
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, MessageCircle, Loader2, ThumbsUp, ThumbsDown, ChevronDown, Plus, Eye } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { OfferRatingStars } from './OfferRatingStars';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { WriteReviewModal } from '@/components/reviews/WriteReviewModal';
import { HelpfulButtons } from '@/components/reviews/HelpfulButtons';
import { ReviewMediaGallery } from '@/components/reviews/ReviewMediaGallery';
import { ReviewMediaViewer } from '@/components/reviews/ReviewMediaViewer';
import type { OfferReview } from '@features/offers/types';

interface OfferReviewsListProps {
  offerId: number;
  offerName?: string;
  claimId?: number;
  initialLimit?: number;
  /** Called when user tries to review without claiming first */
  onClaimRequired?: () => void;
}

export function OfferReviewsList({ offerId, offerName, claimId, initialLimit = 5, onClaimRequired }: OfferReviewsListProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<OfferReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalReviews, setTotalReviews] = useState(0);

  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);

  // Lightbox state for review media
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchReviews = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(
        `/api/offers/${offerId}/reviews?page=${pageNum}&limit=${initialLimit}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const result = await response.json();
      const data = result.data || result;
      const newReviews = data.reviews || data.data || [];

      if (append) {
        setReviews((prev) => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }

      // Handle pagination from different response shapes
      const pag = data.pagination || {};
      setHasMore(pag.page < pag.totalPages || data.hasMore === true);
      setTotalReviews(pag.total || newReviews.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offerId, initialLimit]);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage, true);
  };

  const handleReviewSubmitted = () => {
    setShowWriteModal(false);
    setPage(1);
    fetchReviews(1);
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isAuthenticated = user && user.role !== 'visitor';
  const hasClaim = !!claimId;
  const canReview = isAuthenticated; // Show button to all auth users; claim check at click time
  const displayName = offerName || `Offer #${offerId}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-biz-orange" />
          Reviews
          {totalReviews > 0 && (
            <span className="text-sm font-normal text-gray-500">({totalReviews})</span>
          )}
        </h3>

        <div className="flex items-center gap-2">
          {totalReviews > initialLimit && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              View All
            </button>
          )}

          {canReview && (
            <button
              onClick={() => {
                if (hasClaim) {
                  setShowWriteModal(true);
                } else if (onClaimRequired) {
                  onClaimRequired();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Write a Review
            </button>
          )}
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No reviews yet</p>
          {canReview && (
            <p className="text-sm text-gray-400">Be the first to review this offer!</p>
          )}
        </div>
      ) : (
        <>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">{review.reviewer_name || 'Anonymous'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <OfferRatingStars rating={review.rating} size="sm" />
                    <span className="text-xs text-gray-400">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Feedback */}
              <div className="flex items-center gap-4 mb-2 text-sm">
                {review.was_as_described !== null && (
                  <span className={`flex items-center gap-1 ${
                    review.was_as_described ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {review.was_as_described ? (
                      <ThumbsUp className="w-3 h-3" />
                    ) : (
                      <ThumbsDown className="w-3 h-3" />
                    )}
                    As described
                  </span>
                )}
                {review.was_easy_to_redeem !== null && (
                  <span className={`flex items-center gap-1 ${
                    review.was_easy_to_redeem ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {review.was_easy_to_redeem ? (
                      <ThumbsUp className="w-3 h-3" />
                    ) : (
                      <ThumbsDown className="w-3 h-3" />
                    )}
                    Easy redemption
                  </span>
                )}
              </div>

              {review.comment && (
                <p className="text-gray-600 text-sm">{review.comment}</p>
              )}

              {/* Review media (images/videos) */}
              {review.images && review.images.length > 0 && (
                <div className="mt-2">
                  <ReviewMediaGallery
                    media={review.images}
                    onImageClick={(idx) => {
                      setLightboxMedia(review.images!);
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                  />
                </div>
              )}

              {/* Helpful voting */}
              <div className="mt-3">
                <HelpfulButtons
                  reviewId={review.id}
                  reviewUserId={review.user_id}
                  helpfulCount={review.helpful_count ?? 0}
                  notHelpfulCount={review.not_helpful_count ?? 0}
                  endpoint={`/api/offers/${offerId}/reviews/${review.id}/helpful`}
                />
              </div>

              {/* Owner response */}
              {review.owner_response && (
                <div className="mt-3 ml-4 p-3 bg-gray-50 rounded-lg border-l-4 border-biz-orange">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <MessageCircle className="w-4 h-4 text-biz-orange" />
                    <span className="font-medium">Response from Owner</span>
                  </div>
                  <p className="text-sm text-gray-600">{review.owner_response}</p>
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-2 text-purple-600 hover:bg-purple-50 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Load More Reviews
                </>
              )}
            </button>
          )}
        </>
      )}

      {/* WriteReviewModal (BizModal) */}
      <WriteReviewModal
        isOpen={showWriteModal}
        onClose={() => setShowWriteModal(false)}
        entityType="offer"
        entityId={offerId}
        entityName={displayName}
        claimId={claimId}
        onSuccess={handleReviewSubmitted}
      />

      {/* ReviewModal (BizModal) — view all reviews with filter/sort */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        entityType="offer"
        entityId={offerId}
        entityName={displayName}
        onReviewSubmitted={() => { setPage(1); fetchReviews(1); }}
      />

      {/* Media lightbox viewer */}
      {lightboxOpen && (
        <ReviewMediaViewer
          media={lightboxMedia}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
