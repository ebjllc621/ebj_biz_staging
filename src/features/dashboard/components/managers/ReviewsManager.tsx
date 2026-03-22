/**
 * ReviewsManager - Reviews and Owner Responses Manager
 *
 * @description Manage reviews received by the listing with owner response capability
 * @component Client Component
 * @tier ADVANCED
 * @generated FIXFLOW - Phase 9 Remediation
 * @phase Phase 9 - Communication/Reputation Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_9_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY)
 * - fetchWithCsrf for all mutations
 *
 * DATA ISOLATION: Shows reviews ABOUT the listing (listing_id = ?),
 * NOT reviews the user wrote.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Loader2, AlertCircle, Filter, ChevronDown, Store, Calendar, Gift, User } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import BizModal from '@/components/BizModal/BizModal';

// ============================================================================
// TYPES
// ============================================================================

type EntityType = 'listings' | 'events' | 'offers' | 'creator_profiles';

interface Review {
  id: number;
  listing_id: number;
  user_id: number;
  rating: number;
  title: string | null;
  review_text: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  owner_response: string | null;
  owner_response_date: string | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  images?: string[] | string | null;
  // Joined user data (enriched by API)
  reviewer_name?: string | null;
  reviewer_avatar_url?: string | null;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
}

interface ReviewSummary {
  total: number;
  average: number;
  distribution: Record<number, number>;
  pendingCount: number;
  respondedCount: number;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

function ReviewSummaryCard({ summary }: { summary: ReviewSummary }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-6">
        {/* Average Rating */}
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900">
            {summary.average.toFixed(1)}
          </div>
          <StarRating rating={Math.round(summary.average)} size="lg" />
          <div className="text-sm text-gray-500 mt-1">
            {summary.total} review{summary.total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Distribution */}
        <div className="flex-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary.distribution[stars] || 0;
            const percentage = summary.total > 0 ? (count / summary.total) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-600 w-6">{stars}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-gray-600">Pending: {summary.pendingCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-gray-600">Responded: {summary.respondedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-[#ed6437]" />
            <span className="text-gray-600">
              Response Rate: {summary.total > 0
                ? `${((summary.respondedCount / summary.total) * 100).toFixed(0)}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReviewCardProps {
  review: Review;
  onRespond: () => void;
}

function ReviewCard({ review, onRespond }: ReviewCardProps) {
  const reviewerName = review.reviewer_name
    || (review.user_first_name && review.user_last_name
      ? `${review.user_first_name} ${review.user_last_name}`
      : 'Anonymous');

  // Safely parse images (may arrive as string from JSON column)
  let parsedImages: string[] | null = null;
  if (review.images) {
    if (Array.isArray(review.images)) {
      parsedImages = review.images;
    } else if (typeof review.images === 'string') {
      try { parsedImages = JSON.parse(review.images); } catch { parsedImages = null; }
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <StarRating rating={review.rating} />
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              review.status === 'approved' ? 'bg-green-100 text-green-700' :
              review.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              review.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {review.status}
            </span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {reviewerName} • {new Date(review.created_at).toLocaleDateString()}
          </div>
        </div>

        {!review.owner_response && (
          <button
            onClick={onRespond}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Respond
          </button>
        )}
      </div>

      {/* Title & Content */}
      {review.title && (
        <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
      )}
      {review.review_text && (
        <p className="text-gray-700 text-sm mb-3">{review.review_text}</p>
      )}

      {/* Review Media */}
      {parsedImages && parsedImages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {parsedImages.map((url, idx) => {
            const isVideo = /\.(mp4|webm|mov)$/i.test(url);
            const isEmbed = /youtube\.com|vimeo\.com|rumble\.com/i.test(url);
            if (isVideo) {
              return (
                <video key={idx} controls className="w-40 h-28 rounded-lg object-cover border border-gray-200">
                  <source src={url} type={url.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
                </video>
              );
            }
            if (isEmbed) {
              return (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100">
                  Video link
                </a>
              );
            }
            return (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Review media ${idx + 1}`} className="w-20 h-20 rounded-lg object-cover border border-gray-200 hover:ring-2 hover:ring-orange-400 transition-all" />
              </a>
            );
          })}
        </div>
      )}

      {/* Owner Response */}
      {review.owner_response && (
        <div className="bg-gray-50 border-l-4 border-[#ed6437] p-3 mt-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <MessageSquare className="w-4 h-4 text-[#ed6437]" />
            <span className="font-medium">Owner Response</span>
            {review.owner_response_date && (
              <span>• {new Date(review.owner_response_date).toLocaleDateString()}</span>
            )}
          </div>
          <p className="text-gray-700 text-sm">{review.owner_response}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>{review.helpful_count} found helpful</span>
      </div>
    </div>
  );
}

// ============================================================================
// OWNER RESPONSE MODAL
// ============================================================================

interface OwnerResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review | null;
  onSubmit: (response: string) => Promise<void>;
  isSubmitting: boolean;
}

function OwnerResponseModal({ isOpen, onClose, review, onSubmit, isSubmitting }: OwnerResponseModalProps) {
  const [response, setResponse] = useState('');
  const maxLength = 2000;
  const minLength = 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (response.trim().length < minLength) return;
    await onSubmit(response.trim());
    setResponse('');
  };

  if (!review) return null;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Respond to Review"
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Original Review */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-sm text-gray-500">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
          {review.title && (
            <h4 className="font-medium text-gray-900 text-sm mb-1">{review.title}</h4>
          )}
          {review.review_text && (
            <p className="text-gray-700 text-sm">{review.review_text}</p>
          )}
        </div>

        {/* Response Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Response
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Thank the reviewer and address their feedback professionally..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437] resize-none"
            rows={5}
            maxLength={maxLength}
          />
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{response.length < minLength ? `Minimum ${minLength} characters` : ''}</span>
            <span>{response.length}/{maxLength}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || response.trim().length < minLength}
            className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Response
          </button>
        </div>
      </form>
    </BizModal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ReviewsManagerContent() {
  const { selectedListingId } = useListingContext();

  // Tab state
  const [activeTab, setActiveTab] = useState<EntityType>('listings');

  // State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({
    total: 0,
    average: 0,
    distribution: {},
    pendingCount: 0,
    respondedCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterHasResponse, setFilterHasResponse] = useState<boolean | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Reset to page 1 when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Build URL based on active tab
  const buildFetchUrl = useCallback((tab: EntityType, listingId: number, currentPage: number, currentLimit: number) => {
    switch (tab) {
      case 'events':
        return `/api/events/reviews?listingId=${listingId}&page=${currentPage}&limit=${currentLimit}`;
      case 'offers':
        return `/api/offers/reviews?listingId=${listingId}&page=${currentPage}&limit=${currentLimit}`;
      case 'creator_profiles':
        return `/api/creator-profiles/reviews?listingId=${listingId}&page=${currentPage}&limit=${currentLimit}`;
      default:
        return `/api/reviews?listingId=${listingId}&page=${currentPage}&limit=${currentLimit}`;
    }
  }, []);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      let url = buildFetchUrl(activeTab, selectedListingId, page, limit);
      if (activeTab === 'listings') {
        if (filterRating) url += `&minRating=${filterRating}&maxRating=${filterRating}`;
        if (filterHasResponse !== null) url += `&hasOwnerResponse=${filterHasResponse}`;
      }

      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const result = await response.json();
      if (result.success) {
        const reviewData = result.data?.data || result.data || [];
        setReviews(reviewData);
        setTotalPages(result.data?.pagination?.totalPages || 1);

        // Calculate summary
        const allReviewsResponse = await fetch(
          `/api/reviews?listingId=${selectedListingId}&limit=1000`,
          { credentials: 'include' }
        );
        const allResult = await allReviewsResponse.json();
        const allReviews = allResult.data?.data || allResult.data || [];

        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalRating = 0;
        let pendingCount = 0;
        let respondedCount = 0;

        allReviews.forEach((r: Review) => {
          distribution[r.rating] = (distribution[r.rating] || 0) + 1;
          totalRating += r.rating;
          if (r.status === 'pending') pendingCount++;
          if (r.owner_response) respondedCount++;
        });

        setSummary({
          total: allReviews.length,
          average: allReviews.length > 0 ? totalRating / allReviews.length : 0,
          distribution,
          pendingCount,
          respondedCount
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId, page, filterRating, filterHasResponse, activeTab, buildFetchUrl]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Submit owner response
  const handleSubmitResponse = useCallback(async (response: string) => {
    if (!selectedReview) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/reviews/${selectedReview.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error?.message || 'Failed to submit response');
      }

      await fetchReviews();
      setSelectedReview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedReview, fetchReviews]);

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
          <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage reviews and respond to customer feedback
          </p>
        </div>
        {activeTab === 'listings' && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Entity Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Review entity tabs">
          {([
            { key: 'listings' as EntityType, label: 'Listings', Icon: Store },
            { key: 'events' as EntityType, label: 'Events', Icon: Calendar },
            { key: 'offers' as EntityType, label: 'Offers', Icon: Gift },
            { key: 'creator_profiles' as EntityType, label: 'Creator Profiles', Icon: User },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-[#ed6437] text-[#ed6437]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters (listings tab only) */}
      {showFilters && activeTab === 'listings' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <select
              value={filterRating || ''}
              onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437]"
            >
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} stars</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Response Status</label>
            <select
              value={filterHasResponse === null ? '' : filterHasResponse.toString()}
              onChange={(e) => setFilterHasResponse(e.target.value === '' ? null : e.target.value === 'true')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437]"
            >
              <option value="">All</option>
              <option value="true">With response</option>
              <option value="false">Awaiting response</option>
            </select>
          </div>
          <button
            onClick={() => {
              setFilterRating(null);
              setFilterHasResponse(null);
            }}
            className="self-end px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-sm hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Card */}
      {summary.total > 0 && <ReviewSummaryCard summary={summary} />}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No Reviews Yet"
          description="When customers leave reviews for your listing, they'll appear here"
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onRespond={() => setSelectedReview(review)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Owner Response Modal */}
      <OwnerResponseModal
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        review={selectedReview}
        onSubmit={handleSubmitResponse}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

/**
 * ReviewsManager - Wrapped with ErrorBoundary
 */
export function ReviewsManager() {
  return (
    <ErrorBoundary componentName="ReviewsManager">
      <ReviewsManagerContent />
    </ErrorBoundary>
  );
}

export default ReviewsManager;
