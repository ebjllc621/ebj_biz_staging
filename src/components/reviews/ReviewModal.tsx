/**
 * ReviewModal - View All Reviews Modal (Entity-Agnostic)
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 4A - 3-Modal Review System
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - BizModal wrapper (maxWidth="4xl", fullScreenMobile)
 * - ReviewSummary histogram in header area
 * - ReviewFilterBar: star pills + sort dropdown + "Write a Review" CTA
 * - ReviewCard list (shared component) with "Edit" on own reviews
 * - Pagination controls
 * - Opens WriteReviewModal and EditReviewModal as sub-modals
 * - API adapter pattern normalises different per-entity response shapes
 * - ErrorBoundary wrapper export
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import BizModal from '@/components/BizModal';
import { ReviewCard } from './ReviewCard';
import { ReviewSummary } from './ReviewSummary';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@core/hooks/useAuth';
import type { SharedReview, RatingDistribution } from './types';

// ============================================================================
// Lazy imports for sub-modals (avoid circular dependency issues at module level)
// ============================================================================

// WriteReviewModal and EditReviewModal are imported inline below via dynamic
// references to avoid circular barrel-export issues.
import { WriteReviewModal } from './WriteReviewModal';
import { EditReviewModal } from './EditReviewModal';

// ============================================================================
// Types
// ============================================================================

export type ReviewEntityType = 'listing' | 'event' | 'offer' | 'article' | 'video' | 'guide' | 'podcast' | 'affiliate_marketer' | 'internet_personality' | 'podcaster';

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: ReviewEntityType;
  entityId: number;
  entityName: string;
  entityOwnerId?: number;
  onReviewSubmitted?: () => void;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Raw shapes returned by the APIs (before normalisation)
interface RawListingReview {
  id: number;
  user_id: number;
  rating: number;
  title: string | null;
  review_text: string | null;
  images: string[] | null;
  helpful_count: number;
  not_helpful_count: number;
  owner_response: string | null;
  owner_response_date: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  reviewer_name?: string;
}

interface RawEventReview {
  id: number;
  user_id: number;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_name?: string;
}

interface RawOfferReview {
  id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
}

// ============================================================================
// Normalisation helpers
// ============================================================================

function normalizeListingReviews(reviews: RawListingReview[]): (SharedReview & { reviewer_name?: string })[] {
  return reviews.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    rating: r.rating,
    title: r.title,
    review_text: r.review_text,
    images: r.images,
    helpful_count: r.helpful_count ?? 0,
    not_helpful_count: r.not_helpful_count ?? 0,
    owner_response: r.owner_response,
    owner_response_date: r.owner_response_date ? new Date(r.owner_response_date) : null,
    is_verified_purchase: r.is_verified_purchase ?? false,
    created_at: new Date(r.created_at),
    reviewer_name: r.reviewer_name,
  }));
}

function normalizeEventReviews(reviews: RawEventReview[]): (SharedReview & { reviewer_name?: string })[] {
  return reviews.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    rating: r.rating,
    title: null,
    review_text: r.review_text,
    images: null,
    helpful_count: 0,
    not_helpful_count: 0,
    owner_response: null,
    owner_response_date: null,
    is_verified_purchase: false,
    created_at: new Date(r.created_at),
    reviewer_name: r.user_name,
  }));
}

function normalizeOfferReviews(reviews: RawOfferReview[]): (SharedReview & { reviewer_name?: string })[] {
  return reviews.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    rating: r.rating,
    title: null,
    review_text: r.comment,
    images: null,
    helpful_count: 0,
    not_helpful_count: 0,
    owner_response: null,
    owner_response_date: null,
    is_verified_purchase: false,
    created_at: new Date(r.created_at),
    reviewer_name: r.reviewer_name,
  }));
}

// ============================================================================
// Client-side sort helper
// ============================================================================

type SortOption = 'recent' | 'highest' | 'helpful';

function sortReviews(
  reviews: (SharedReview & { reviewer_name?: string })[],
  sortBy: SortOption
): (SharedReview & { reviewer_name?: string })[] {
  const copy = [...reviews];
  switch (sortBy) {
    case 'recent':
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'highest':
      return copy.sort((a, b) => b.rating - a.rating);
    case 'helpful':
      return copy.sort((a, b) => b.helpful_count - a.helpful_count);
    default:
      return copy;
  }
}

// ============================================================================
// ReviewFilterBar (inline sub-component)
// ============================================================================

interface ReviewFilterBarProps {
  filterRating: number | null;
  onFilterChange: (rating: number | null) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  canReview: boolean;
  onWriteReview: () => void;
}

function ReviewFilterBar({
  filterRating,
  onFilterChange,
  sortBy,
  onSortChange,
  canReview,
  onWriteReview,
}: ReviewFilterBarProps) {
  const filterOptions: { label: string; value: number | null }[] = [
    { label: 'All', value: null },
    { label: '5★', value: 5 },
    { label: '4★', value: 4 },
    { label: '3★', value: 3 },
    { label: '2★', value: 2 },
    { label: '1★', value: 1 },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-gray-100">
      {/* Star filter pills */}
      <div className="flex flex-wrap gap-1">
        {filterOptions.map(({ label, value }) => {
          const isActive = filterRating === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onFilterChange(value)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#ed6437] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Sort dropdown */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="ml-auto px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
      >
        <option value="recent">Most Recent</option>
        <option value="highest">Highest Rated</option>
        <option value="helpful">Most Helpful</option>
      </select>

      {/* Write a Review CTA */}
      {canReview && (
        <button
          type="button"
          onClick={onWriteReview}
          className="px-4 py-1.5 bg-[#ed6437] text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
        >
          Write a Review
        </button>
      )}
    </div>
  );
}

// ============================================================================
// ReviewModal Content (Inner)
// ============================================================================

function ReviewModalContent({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  entityOwnerId = 0,
  onReviewSubmitted,
}: ReviewModalProps) {
  const { user } = useAuth();

  // Data state
  const [reviews, setReviews] = useState<(SharedReview & { reviewer_name?: string })[]>([]);
  const [distribution, setDistribution] = useState<RatingDistribution | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
  });

  // Filter / sort state
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-modal state
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState<SharedReview | null>(null);

  const canReview = Boolean(user && user.role !== 'visitor');

  // -------------------------------------------------------------------------
  // Fetch reviews
  // -------------------------------------------------------------------------

  const fetchReviews = useCallback(
    async (page: number) => {
      if (!isOpen) return;
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit),
        });
        if (filterRating !== null) {
          params.set('minRating', String(filterRating));
          params.set('maxRating', String(filterRating));
        }

        let url: string;
        const contentPluralMap: Record<string, string> = {
          article: 'articles', video: 'videos', guide: 'guides', podcast: 'podcasts',
          affiliate_marketer: 'affiliate-marketers', internet_personality: 'internet-personalities', podcaster: 'podcasters',
        };
        switch (entityType) {
          case 'listing':
            url = `/api/listings/${entityId}/reviews?${params}`;
            break;
          case 'event':
            url = `/api/events/${entityId}/reviews?${params}`;
            break;
          case 'offer':
            url = `/api/offers/${entityId}/reviews?${params}`;
            break;
          case 'article':
          case 'video':
          case 'guide':
          case 'podcast':
            url = `/api/content/${contentPluralMap[entityType]}/${entityId}/ratings?reviews=true&${params}`;
            break;
          case 'affiliate_marketer':
          case 'internet_personality':
          case 'podcaster':
            url = `/api/content/${contentPluralMap[entityType]}/${entityId}/reviews?${params}`;
            break;
          default:
            url = `/api/reviews?${params}`;
            break;
        }

        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Failed to load reviews');
        }
        const result = await response.json();

        let normalised: (SharedReview & { reviewer_name?: string })[] = [];
        let dist: RatingDistribution | null = null;
        let pag: PaginationData = { page, limit: pagination.limit, total: 0, totalPages: 0 };

        switch (entityType) {
          case 'listing': {
            // GET /api/listings/{id}/reviews → result.data.data (array), result.data.pagination
            const raw = result?.data?.data ?? [];
            normalised = normalizeListingReviews(raw);
            pag = result?.data?.pagination ?? pag;
            break;
          }
          case 'event': {
            // GET /api/events/{id}/reviews → result.data.reviews, result.data.distribution, result.data.pagination
            const raw = result?.data?.reviews ?? [];
            normalised = normalizeEventReviews(raw);
            dist = result?.data?.distribution ?? null;
            pag = result?.data?.pagination ?? pag;
            break;
          }
          case 'offer': {
            // GET /api/offers/{id}/reviews → result.data.reviews, result.data.summary
            const raw = result?.data?.reviews ?? [];
            normalised = normalizeOfferReviews(raw);
            const hasMore: boolean = result?.data?.hasMore ?? false;
            pag = {
              page,
              limit: pagination.limit,
              total: 0, // Offer API does not return total count
              totalPages: hasMore ? page + 1 : page,
            };
            break;
          }
          default: {
            // Content types + creator profiles: normalize from generic review response
            const raw = result?.data?.reviews ?? result?.data?.data ?? [];
            normalised = raw.map((r: Record<string, unknown>) => ({
              id: Number(r.id),
              user_id: Number(r.user_id || r.reviewer_user_id),
              rating: Number(r.rating || 0),
              title: (r.title as string) || null,
              review_text: (r.review_text || r.comment) as string | null,
              images: (Array.isArray(r.images) ? r.images : null) as string[] | null,
              helpful_count: Number(r.helpful_count || 0),
              not_helpful_count: Number(r.not_helpful_count || 0),
              owner_response: null,
              owner_response_date: null,
              is_verified_purchase: false,
              created_at: r.created_at as Date,
              reviewer_name: (r.reviewer_name as string) || null,
              reviewer_avatar_url: (r.reviewer_avatar_url as string) || null,
            }));
            pag = result?.data?.pagination ?? pag;
            break;
          }
        }

        setReviews(normalised);
        setDistribution(dist);
        setPagination(pag);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, entityType, entityId, filterRating, pagination.limit]
  );

  // Fetch on open / filter change
  useEffect(() => {
    if (isOpen) {
      fetchReviews(1);
    }
  }, [isOpen, filterRating, fetchReviews]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReviews([]);
      setDistribution(null);
      setPagination({ page: 1, limit: 5, total: 0, totalPages: 0 });
      setFilterRating(null);
      setSortBy('recent');
      setError(null);
      setShowWriteModal(false);
      setShowEditModal(false);
      setEditingReview(null);
    }
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handlePageChange = (newPage: number) => {
    fetchReviews(newPage);
  };

  const handleFilterChange = (rating: number | null) => {
    setFilterRating(rating);
    // fetchReviews re-runs via useEffect dependency
  };

  const handleEditReview = (review: SharedReview) => {
    setEditingReview(review);
    setShowEditModal(true);
  };

  const handleReviewSuccess = () => {
    setShowWriteModal(false);
    setShowEditModal(false);
    setEditingReview(null);
    fetchReviews(1);
    onReviewSubmitted?.();
  };

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const sortedReviews = sortReviews(reviews, sortBy);

  const subtitleText = distribution
    ? `${distribution.average.toFixed(1)} average from ${distribution.total} ${distribution.total === 1 ? 'review' : 'reviews'}`
    : pagination.total > 0
    ? `${pagination.total} ${pagination.total === 1 ? 'review' : 'reviews'}`
    : undefined;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <BizModal
        isOpen={isOpen}
        onClose={onClose}
        title={`Reviews for ${entityName}`}
        subtitle={subtitleText}
        maxWidth="4xl"
        fullScreenMobile
      >
        <div className="space-y-4">
          {/* Rating summary histogram (events supply distribution; listing/offer may not) */}
          {distribution && distribution.total > 0 && (
            <ReviewSummary distribution={distribution} entityName={entityName} />
          )}

          {/* Filter + sort bar */}
          <ReviewFilterBar
            filterRating={filterRating}
            onFilterChange={handleFilterChange}
            sortBy={sortBy}
            onSortChange={setSortBy}
            canReview={canReview}
            onWriteReview={() => setShowWriteModal(true)}
          />

          {/* Error state */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ed6437]" />
            </div>
          )}

          {/* Review list */}
          {!isLoading && !error && sortedReviews.length > 0 && (
            <div className="space-y-4">
              {sortedReviews.map((review) => (
                <div key={review.id} className="relative">
                  <ReviewCard
                    review={review}
                    entityOwnerId={entityOwnerId}
                    helpfulVoteEndpoint={
                      entityType === 'listing'
                        ? `/api/reviews/${review.id}/helpful`
                        : undefined
                    }
                    showHelpfulButtons={entityType === 'listing'}
                    showOwnerResponse={entityType === 'listing'}
                    showReportButton
                    onHelpfulVote={() => fetchReviews(pagination.page)}
                  />
                  {/* Edit button on own reviews */}
                  {user && Number(user.id) === review.user_id && (
                    <button
                      type="button"
                      onClick={() => handleEditReview(review)}
                      className="absolute top-4 right-4 text-xs text-[#ed6437] hover:text-orange-700 font-medium underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && sortedReviews.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No reviews yet</p>
              {canReview && (
                <>
                  <p className="text-gray-400 text-sm mt-1">Be the first to share your experience</p>
                  <button
                    type="button"
                    onClick={() => setShowWriteModal(true)}
                    className="mt-4 px-4 py-2 bg-[#ed6437] text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Write a Review
                  </button>
                </>
              )}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="text-sm text-gray-500">
                Page {pagination.page}
                {pagination.totalPages > 0 ? ` of ${pagination.totalPages}` : ''}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Listing-only: star summary when no distribution from API */}
          {entityType === 'listing' && !distribution && pagination.total > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>{pagination.total} {pagination.total === 1 ? 'review' : 'reviews'}</span>
            </div>
          )}
        </div>
      </BizModal>

      {/* Sub-modal: Write Review */}
      {showWriteModal && (
        <WriteReviewModal
          isOpen={showWriteModal}
          onClose={() => setShowWriteModal(false)}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Sub-modal: Edit Review */}
      {showEditModal && editingReview && (
        <EditReviewModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingReview(null);
          }}
          review={editingReview}
          entityType={entityType}
          onSuccess={handleReviewSuccess}
        />
      )}
    </>
  );
}

// ============================================================================
// Exported Component (with ErrorBoundary)
// ============================================================================

export function ReviewModal(props: ReviewModalProps) {
  return (
    <ErrorBoundary componentName="ReviewModal">
      <ReviewModalContent {...props} />
    </ErrorBoundary>
  );
}

export default ReviewModal;
