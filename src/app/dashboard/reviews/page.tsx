/**
 * Dashboard Reviews Page — My Reviews
 *
 * @description Shows all reviews the authenticated user has written across all entity types.
 * @tier STANDARD
 * @component Client Component
 * @phase Phase 3 - Dashboard Enhancement (PHASE_3_BRAIN_PLAN.md)
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (STANDARD tier requirement)
 * - Fetch from /api/dashboard/my-reviews
 * - No direct DB access (calls API)
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Star, Loader2, AlertCircle, MessageSquare, ExternalLink, Edit, Check, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPES
// ============================================================================

interface ReviewWithEntity {
  id: number;
  entity_type: string;
  entity_id: number;
  entity_name: string | null;
  rating: number;
  title: string | null;
  review_text: string | null;
  status: string;
  owner_response: string | null;
  owner_response_date: string | null;
  created_at: string;
}

type EntityTypeFilter = 'all' | 'listing' | 'event' | 'offer' | 'creator' | 'content';

// ============================================================================
// HELPERS
// ============================================================================

function getEntityHref(entityType: string, entityId: number): string {
  switch (entityType) {
    case 'listing': return `/listings/${entityId}`;
    case 'event': return `/events/${entityId}`;
    case 'offer': return `/offers/${entityId}`;
    case 'creator': return `/creators/${entityId}`;
    case 'content_article': return `/articles/${entityId}`;
    case 'content_video': return `/videos/${entityId}`;
    case 'content_guide': return `/guides/${entityId}`;
    case 'content_podcast': return `/podcasts/${entityId}`;
    default: return '#';
  }
}

function getEntityTypeLabel(entityType: string): string {
  switch (entityType) {
    case 'listing': return 'Listing';
    case 'event': return 'Event';
    case 'offer': return 'Offer';
    case 'creator': return 'Creator Profile';
    case 'content_article': return 'Article';
    case 'content_video': return 'Video';
    case 'content_guide': return 'Guide';
    case 'content_podcast': return 'Podcast';
    default: return entityType;
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700';
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'flagged': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-700';
  }
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
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review, onUpdated }: { review: ReviewWithEntity; onUpdated: () => void }) {
  const entityHref = getEntityHref(review.entity_type, review.entity_id);
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editTitle, setEditTitle] = useState(review.title || '');
  const [editText, setEditText] = useState(review.review_text || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setEditError(null);
    try {
      // Determine the correct API endpoint based on entity type
      let url: string;
      if (review.entity_type === 'listing') {
        url = `/api/reviews/${review.id}`;
      } else if (review.entity_type.startsWith('content_')) {
        url = `/api/content/ratings/${review.id}`;
      } else {
        // For other types, use the generic review endpoint
        url = `/api/reviews/${review.id}`;
      }

      const response = await fetchWithCsrf(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: editRating,
          title: editTitle || null,
          review_text: editText || null,
          comment: editText || null, // content_ratings uses 'comment'
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error?.message || 'Failed to update review');
      }

      setIsEditing(false);
      onUpdated(); // Refresh the list
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditRating(review.rating);
    setEditTitle(review.title || '');
    setEditText(review.review_text || '');
    setEditError(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {/* Entity name + link */}
          <div className="flex items-center gap-2 mb-1">
            <a
              href={entityHref}
              className="text-sm font-medium text-gray-900 hover:text-[#ed6437] hover:underline flex items-center gap-1 truncate"
            >
              {review.entity_name ?? 'Unknown'}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {getEntityTypeLabel(review.entity_type)}
            </span>
          </div>

          {/* Rating + status (view mode) */}
          {!isEditing && (
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} />
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(review.status)}`}>
                {review.status}
              </span>
            </div>
          )}
        </div>

        {/* Edit / Save / Cancel buttons */}
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0 ml-3"
          >
            <Edit className="w-3 h-3" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <div className="space-y-3">
          {/* Editable star rating */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setEditRating(star)}
                  className="p-0.5"
                >
                  <Star
                    className={`w-6 h-6 transition-colors ${star <= editRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Editable title */}
          {review.entity_type === 'listing' && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="Review title"
              />
            </div>
          )}

          {/* Editable text */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Review</label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-vertical"
              placeholder="Your review..."
            />
          </div>

          {/* Error */}
          {editError && (
            <p className="text-red-600 text-xs">{editError}</p>
          )}
        </div>
      ) : (
        <>
          {/* Title (view mode) */}
          {review.title && (
            <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
          )}

          {/* Review text (view mode) */}
          {review.review_text && (
            <p className="text-gray-700 text-sm mb-3">{review.review_text}</p>
          )}
        </>
      )}

      {/* Owner response (always visible) */}
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

      {/* Posted date */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
        Posted {new Date(review.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}

// ============================================================================
// PAGE CONTENT
// ============================================================================

function ReviewsPageContent() {
  const [reviews, setReviews] = useState<ReviewWithEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypeFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = `/api/dashboard/my-reviews?page=${page}&limit=${limit}`;
      if (entityTypeFilter !== 'all') url += `&entityType=${entityTypeFilter}`;

      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const result = await response.json();
      if (result.success) {
        const data = result.data?.data || result.data || [];
        setReviews(data);
        setTotalPages(result.data?.pagination?.totalPages ?? 1);
        setTotal(result.data?.pagination?.total ?? 0);
      } else {
        throw new Error(result.error?.message || 'Failed to load reviews');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  }, [page, entityTypeFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [entityTypeFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Mark review notifications as read when page loads successfully
  useEffect(() => {
    if (!isLoading && !error) {
      fetchWithCsrf('/api/dashboard/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationType: 'review' }),
      }).catch(() => { /* silent — badge clear is non-critical */ });
    }
  }, [isLoading, error]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-gray-600 mt-1">Reviews you have written across all entities</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter by type:</label>
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value as EntityTypeFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
        >
          <option value="all">All ({total})</option>
          <option value="listing">Listings</option>
          <option value="event">Events</option>
          <option value="offer">Offers</option>
          <option value="creator">Creator Profiles</option>
          <option value="content">Content (Articles, Videos, Guides, Podcasts)</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-sm hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        // Empty state
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center text-center">
          <Star className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
          <p className="text-gray-500 text-sm">
            Reviews you write for listings, events, offers, and creator profiles will appear here.
          </p>
        </div>
      ) : (
        // Reviews list
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={`${review.entity_type}-${review.id}`} review={review} onUpdated={fetchReviews} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
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
    </div>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default function ReviewsPage() {
  return (
    <ErrorBoundary componentName="DashboardReviewsPage">
      <ReviewsPageContent />
    </ErrorBoundary>
  );
}
