/**
 * ListingReviews - Reviews Section Container
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4A - Modal System Integration
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Rating summary display (shared ReviewSummary)
 * - Paginated review list (shared ReviewCard)
 * - "Write a Review" button opens WriteReviewModal (BizModal)
 * - "View All Reviews" button opens ReviewModal (BizModal)
 * - Loading and empty states
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Eye } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import type { Listing } from '@core/services/ListingService';
import type { Review, RatingDistribution } from '@core/services/ReviewService';
import { ReviewSummary } from '@/components/reviews/ReviewSummary';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { WriteReviewModal } from '@/components/reviews/WriteReviewModal';
import type { SharedReview } from '@/components/reviews/types';
import { ExternalReviewsModule } from '@/components/reviews/ExternalReviewsModule';

interface ListingReviewsProps {
  /** Listing data */
  listing: Listing;
}

/**
 * Extended review from API response (includes enriched user data)
 */
interface EnrichedReview extends Review {
  reviewer_name?: string | null;
  reviewer_avatar_url?: string | null;
}

/**
 * Convert Review (from ReviewService) to SharedReview (for shared ReviewCard)
 */
function toSharedReview(review: EnrichedReview): SharedReview & { reviewer_name?: string; reviewer_avatar_url?: string } {
  return {
    id: review.id,
    user_id: review.user_id,
    rating: review.rating,
    title: review.title,
    review_text: review.review_text,
    images: review.images,
    helpful_count: review.helpful_count,
    not_helpful_count: review.not_helpful_count,
    owner_response: review.owner_response,
    owner_response_date: review.owner_response_date ? new Date(review.owner_response_date) : null,
    is_verified_purchase: review.is_verified_purchase,
    created_at: new Date(review.created_at),
    reviewer_name: review.reviewer_name || undefined,
    reviewer_avatar_url: review.reviewer_avatar_url || undefined,
  };
}

export function ListingReviews({ listing }: ListingReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<EnrichedReview[]>([]);
  const [distribution, setDistribution] = useState<RatingDistribution | null>(null);
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

  // Fetch reviews and distribution
  const fetchReviews = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/listings/${listing.id}/reviews?page=${page}&limit=5`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const result = await response.json();
      if (result.success || result.ok) {
        const data = result.data;
        setReviews(data.data);
        setPagination(data.pagination);

        // Use real distribution from API
        if (data.distribution) {
          setDistribution(data.distribution);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  }, [listing.id]);

  // Initial fetch
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchReviews(newPage);
  };

  // Handle review submission success
  const handleReviewSubmitted = () => {
    setShowWriteModal(false);
    fetchReviews(1); // Refresh from first page
  };

  // Check if user can review
  const canReview = user && user.role !== 'visitor' && Number(user.id) !== listing.user_id;

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
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
          {pagination.total > 0 && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View All
            </button>
          )}

          {/* Write Review Button */}
          {canReview && (
            <button
              onClick={() => setShowWriteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Write a Review
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg mb-4" />
            <div className="h-32 bg-gray-200 rounded-lg mb-4" />
            <div className="h-32 bg-gray-200 rounded-lg" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
          <button
            onClick={() => fetchReviews(pagination.page)}
            className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Rating Summary — shared component */}
          {distribution && (
            <ReviewSummary
              distribution={distribution}
              entityName={listing.name}
            />
          )}

          {/* Reviews List — shared ReviewCard */}
          {reviews.length > 0 ? (
            <div className="space-y-4 mt-6">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={toSharedReview(review)}
                  entityOwnerId={listing.user_id || 0}
                  onHelpfulVote={() => fetchReviews(pagination.page)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No reviews yet</p>
              {canReview && (
                <p className="text-sm mt-2">Be the first to leave a review!</p>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* View All Reviews link at bottom */}
          {pagination.total > 0 && (
            <div className="flex justify-center mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowReviewModal(true)}
                className="text-sm text-[#ed6437] hover:text-orange-700 font-medium"
              >
                View all {pagination.total} review{pagination.total !== 1 ? 's' : ''} &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* WriteReviewModal (BizModal) — replaces inline submission form */}
      <WriteReviewModal
        isOpen={showWriteModal}
        onClose={() => setShowWriteModal(false)}
        entityType="listing"
        entityId={listing.id}
        entityName={listing.name}
        onSuccess={handleReviewSubmitted}
      />

      {/* ReviewModal (BizModal) — view all reviews with filter/sort */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        entityType="listing"
        entityId={listing.id}
        entityName={listing.name}
        entityOwnerId={listing.user_id || 0}
        onReviewSubmitted={() => fetchReviews(1)}
      />

      {/* External Reviews — display-only provider feeds (Google, Yelp, etc.) */}
      {/* Renders below native reviews; shows nothing if no providers connected */}
      <ExternalReviewsModule listingId={listing.id} className="mt-8" />
    </section>
  );
}

export default ListingReviews;
