/**
 * RecommendationsManager - Featured Reviews & Recommendations Manager
 *
 * @description Display and manage highlighted reviews for the listing
 * @component Client Component
 * @tier ADVANCED
 * @generated FIXFLOW - Phase 9 Remediation
 * @phase Phase 9 - Communication/Reputation Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_9_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme (#ed6437) for accent elements
 * - BizModal MANDATORY for all modals
 * - ErrorBoundary wrapping for ADVANCED tier
 *
 * DATA ISOLATION: Shows reviews for THIS listing (listing_id context),
 * NOT reviews the user has written.
 */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star,
  Loader2,
  AlertCircle,
  MessageSquare,
  Award,
  TrendingUp,
  ThumbsUp,
  Reply,
  ExternalLink
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import BizModal from '@/components/BizModal/BizModal';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { EmptyState } from '../shared/EmptyState';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPES
// ============================================================================

interface Review {
  id: number;
  listing_id: number;
  user_id: number;
  rating: number;
  title: string | null;
  review_text: string | null;
  status: string;
  helpful_count: number;
  owner_response: string | null;
  owner_response_date: string | null;
  created_at: string;
  // User info (joined)
  user_name?: string;
  user_avatar?: string | null;
}

interface ReviewsResponse {
  success: boolean;
  data: {
    data: Review[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

function RecommendationCard({
  review,
  onAddResponse,
  isHighlighted
}: {
  review: Review;
  onAddResponse: (review: Review) => void;
  isHighlighted: boolean;
}) {
  const displayName = review.user_name || 'Anonymous';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`bg-white border rounded-lg p-5 transition-all ${
        isHighlighted
          ? 'border-[#ed6437] ring-2 ring-[#ed6437]/20'
          : 'border-gray-200 hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {review.user_avatar ? (
          <img
            src={review.user_avatar}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ed6437] to-[#d55a31] flex items-center justify-center text-white font-semibold flex-shrink-0">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-gray-900">{displayName}</h3>
            {isHighlighted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ed6437]/10 text-[#ed6437] text-xs font-medium rounded-full">
                <Award className="w-3 h-3" />
                Featured
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <StarRating rating={review.rating} />
            <span className="text-sm text-gray-500">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Helpful count */}
        {review.helpful_count > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <ThumbsUp className="w-4 h-4" />
            <span>{review.helpful_count}</span>
          </div>
        )}
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-medium text-gray-900 mt-4">{review.title}</h4>
      )}

      {/* Review Text */}
      {review.review_text && (
        <p className="text-gray-700 mt-2 leading-relaxed">{review.review_text}</p>
      )}

      {/* Owner Response */}
      {review.owner_response && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-[#ed6437]">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Reply className="w-4 h-4" />
            Owner Response
          </div>
          <p className="text-gray-600 text-sm">{review.owner_response}</p>
          {review.owner_response_date && (
            <p className="text-xs text-gray-400 mt-2">
              {new Date(review.owner_response_date).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
        {!review.owner_response && (
          <button
            onClick={() => onAddResponse(review)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#ed6437] hover:bg-[#ed6437]/10 rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Add Response
          </button>
        )}
        <a
          href={`/reviews/${review.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors ml-auto"
        >
          <ExternalLink className="w-4 h-4" />
          View
        </a>
      </div>
    </div>
  );
}

function RecommendationsSummary({
  totalReviews,
  averageRating,
  respondedCount,
  topRatedCount
}: {
  totalReviews: number;
  averageRating: number;
  respondedCount: number;
  topRatedCount: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-500">Total Reviews</div>
        <div className="text-2xl font-bold text-gray-900 mt-1">{totalReviews}</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-500">Avg. Rating</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-2xl font-bold text-gray-900">
            {averageRating.toFixed(1)}
          </span>
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-500">Responded</div>
        <div className="text-2xl font-bold text-[#ed6437] mt-1">{respondedCount}</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-500">5-Star Reviews</div>
        <div className="text-2xl font-bold text-green-600 mt-1">{topRatedCount}</div>
      </div>
    </div>
  );
}

function ResponseModal({
  isOpen,
  onClose,
  review,
  onSubmit,
  isSubmitting
}: {
  isOpen: boolean;
  onClose: () => void;
  review: Review | null;
  onSubmit: (response: string) => void;
  isSubmitting: boolean;
}) {
  const [response, setResponse] = useState('');

  useEffect(() => {
    if (isOpen) {
      setResponse('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (response.trim()) {
      onSubmit(response.trim());
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Respond to Review"
      size="medium"
    >
      {review && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Review Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-900">
                {review.user_name || 'Anonymous'}
              </span>
              <StarRating rating={review.rating} />
            </div>
            {review.title && (
              <p className="font-medium text-gray-800">{review.title}</p>
            )}
            {review.review_text && (
              <p className="text-gray-600 text-sm mt-1 line-clamp-3">
                {review.review_text}
              </p>
            )}
          </div>

          {/* Response Input */}
          <div>
            <label
              htmlFor="owner-response"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Response
            </label>
            <textarea
              id="owner-response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437] resize-none"
              rows={4}
              placeholder="Thank the reviewer and address any concerns..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Your response will be visible to all users viewing this review.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !response.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Reply className="w-4 h-4" />
                  Submit Response
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </BizModal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function RecommendationsManagerContent() {
  const { selectedListingId } = useListingContext();

  // State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'top' | 'responded'>('all');

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch approved reviews for the listing, sorted by rating
      const response = await fetch(
        `/api/reviews?listingId=${selectedListingId}&status=approved&limit=100`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const result: ReviewsResponse = await response.json();
      if (result.success) {
        setReviews(result.data?.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle adding response
  const handleAddResponse = (review: Review) => {
    setSelectedReview(review);
    setIsResponseModalOpen(true);
  };

  const handleSubmitResponse = async (responseText: string) => {
    if (!selectedReview) return;

    setIsSubmitting(true);

    try {
      const response = await fetchWithCsrf(`/api/reviews/${selectedReview.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText })
      });

      if (!response.ok) {
        throw new Error('Failed to submit response');
      }

      // Update local state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === selectedReview.id
            ? {
                ...r,
                owner_response: responseText,
                owner_response_date: new Date().toISOString()
              }
            : r
        )
      );

      setIsResponseModalOpen(false);
      setSelectedReview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed values
  const stats = useMemo(() => {
    const total = reviews.length;
    const avgRating =
      total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const responded = reviews.filter((r) => r.owner_response).length;
    const topRated = reviews.filter((r) => r.rating === 5).length;
    return { total, avgRating, responded, topRated };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    switch (filter) {
      case 'top':
        result = result.filter((r) => r.rating >= 4);
        break;
      case 'responded':
        result = result.filter((r) => r.owner_response);
        break;
    }

    // Sort: responded first, then by rating, then by date
    result.sort((a, b) => {
      // Owner responses first (featured)
      if (a.owner_response && !b.owner_response) return -1;
      if (!a.owner_response && b.owner_response) return 1;
      // Then by rating
      if (b.rating !== a.rating) return b.rating - a.rating;
      // Then by helpful count
      if (b.helpful_count !== a.helpful_count) return b.helpful_count - a.helpful_count;
      // Then by date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [reviews, filter]);

  // Loading state
  if (isLoading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#ed6437]" />
            Recommendations
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Highlight your best reviews with owner responses
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Stats */}
      {reviews.length > 0 && (
        <RecommendationsSummary
          totalReviews={stats.total}
          averageRating={stats.avgRating}
          respondedCount={stats.responded}
          topRatedCount={stats.topRated}
        />
      )}

      {/* Filters */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
          <span className="text-sm text-gray-500">Filter:</span>
          {(['all', 'top', 'responded'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === f
                  ? 'bg-[#ed6437] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && 'All Reviews'}
              {f === 'top' && 'Top Rated (4-5★)'}
              {f === 'responded' && 'With Response'}
            </button>
          ))}
        </div>
      )}

      {/* Info Banner */}
      {reviews.length > 0 && stats.responded === 0 && (
        <div className="bg-[#ed6437]/5 border border-[#ed6437]/20 rounded-lg p-4 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-[#ed6437] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">Boost engagement with responses</p>
            <p className="text-sm text-gray-600 mt-1">
              Reviews with owner responses get more visibility and build trust with
              potential customers. Start responding to your top reviews!
            </p>
          </div>
        </div>
      )}

      {/* Reviews Grid */}
      {filteredReviews.length === 0 ? (
        <EmptyState
          icon={Award}
          title={filter === 'all' ? 'No Reviews Yet' : 'No Matching Reviews'}
          description={
            filter === 'all'
              ? 'When customers leave reviews, they will appear here. Great reviews build trust!'
              : 'Try adjusting your filter to see more reviews.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredReviews.map((review) => (
            <RecommendationCard
              key={review.id}
              review={review}
              onAddResponse={handleAddResponse}
              isHighlighted={!!review.owner_response}
            />
          ))}
        </div>
      )}

      {/* Response Modal */}
      <ResponseModal
        isOpen={isResponseModalOpen}
        onClose={() => {
          setIsResponseModalOpen(false);
          setSelectedReview(null);
        }}
        review={selectedReview}
        onSubmit={handleSubmitResponse}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

/**
 * RecommendationsManager - Wrapped with ErrorBoundary
 */
export function RecommendationsManager() {
  return (
    <ErrorBoundary componentName="RecommendationsManager">
      <RecommendationsManagerContent />
    </ErrorBoundary>
  );
}

export default RecommendationsManager;
