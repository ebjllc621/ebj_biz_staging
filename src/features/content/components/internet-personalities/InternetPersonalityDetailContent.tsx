/**
 * InternetPersonalityDetailContent - Main content area for internet personality detail page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3B
 * @governance Build Map v2.1 ENHANCED
 *
 * Renders: Bio (expand/collapse), Content Categories, Brand Collaborations grid, Reviews with pagination.
 * Fetches collaborations and reviews from Phase 2 API routes on mount.
 */
'use client';

import { useState, useEffect } from 'react';
import { FileText, Tag, Handshake, Star } from 'lucide-react';
import type {
  InternetPersonalityProfile,
  Collaboration,
  InternetPersonalityReview,
} from '@core/types/internet-personality';

interface InternetPersonalityDetailContentProps {
  personality: InternetPersonalityProfile;
  className?: string;
  onWriteReview?: () => void;
  refreshKey?: number;
}

// Star rating row — renders 5 stars, fills up to `rating`
function StarRow({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${cls} ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function InternetPersonalityDetailContent({
  personality,
  className,
  onWriteReview,
  refreshKey,
}: InternetPersonalityDetailContentProps) {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [collaborationsLoading, setCollaborationsLoading] = useState(true);
  const [reviews, setReviews] = useState<InternetPersonalityReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPagination, setReviewPagination] = useState<{
    total: number;
    totalPages: number;
    page: number;
    pageSize: number;
  } | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  // Fetch collaborations on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/content/internet-personalities/${personality.id}/collaborations`
        );
        const result = await res.json();
        if (result.success) {
          setCollaborations(result.data.collaborations ?? []);
        }
      } catch {
        // Silent fail — empty state shown
      } finally {
        setCollaborationsLoading(false);
      }
    };
    load();
  }, [personality.id]);

  // Fetch reviews on mount and page change
  useEffect(() => {
    setReviewsLoading(true);
    const load = async () => {
      try {
        const res = await fetch(
          `/api/content/internet-personalities/${personality.id}/reviews?page=${reviewPage}&pageSize=5`
        );
        const result = await res.json();
        if (result.success) {
          setReviews(result.data.reviews ?? []);
          setReviewPagination(result.data.pagination ?? null);
        }
      } catch {
        // Silent fail — empty state shown
      } finally {
        setReviewsLoading(false);
      }
    };
    load();
  }, [personality.id, reviewPage, refreshKey]);

  const bioTooLong = (personality.bio?.length ?? 0) > 300;
  const totalPages = reviewPagination?.totalPages ?? 1;
  const totalReviews = reviewPagination?.total ?? personality.rating_count;

  return (
    <div className={`space-y-6 ${className ?? ''}`}>
      {/* 1. About / Bio */}
      {personality.bio && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-biz-orange" />
            About
          </h2>
          <div className="relative">
            <p
              className={`text-gray-700 leading-relaxed whitespace-pre-line ${
                bioTooLong && !bioExpanded ? 'max-h-[120px] overflow-hidden' : ''
              }`}
            >
              {personality.bio}
            </p>
            {bioTooLong && !bioExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}
          </div>
          {bioTooLong && (
            <button
              onClick={() => setBioExpanded(!bioExpanded)}
              className="mt-2 text-sm text-biz-orange hover:underline font-medium"
            >
              {bioExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      )}

      {/* 2. Content Categories */}
      {personality.content_categories && personality.content_categories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
            <Tag className="w-5 h-5 text-biz-orange" />
            Content Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {personality.content_categories.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Brand Collaborations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
          <Handshake className="w-5 h-5 text-biz-orange" />
          Brand Collaborations
          {!collaborationsLoading && collaborations.length > 0 && (
            <span className="ml-1 text-sm font-normal text-gray-500">
              ({collaborations.length})
            </span>
          )}
        </h2>

        {collaborationsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-48" />
            ))}
          </div>
        ) : collaborations.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No collaboration items yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collaborations.map((collab) => (
              <div
                key={collab.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                {/* Brand header */}
                <div className="flex items-center gap-2 mb-2">
                  {collab.brand_logo ? (
                    <img
                      src={collab.brand_logo}
                      alt={collab.brand_name ?? 'Brand'}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                  ) : collab.brand_name ? (
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-600">
                        {collab.brand_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ) : null}
                  {collab.brand_name && (
                    <span className="text-sm font-medium text-gray-800">{collab.brand_name}</span>
                  )}
                </div>

                {/* Collaboration type badge */}
                {collab.collaboration_type && (
                  <span className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded mb-2">
                    {collab.collaboration_type}
                  </span>
                )}

                {/* Description */}
                {collab.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{collab.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  {collab.collaboration_date && (
                    <span className="text-xs text-gray-400">
                      {new Date(collab.collaboration_date).toLocaleDateString()}
                    </span>
                  )}
                  {collab.content_url && (
                    <a
                      href={collab.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-biz-orange hover:underline ml-auto"
                    >
                      View Content
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Reviews */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-biz-navy flex items-center gap-2">
            <Star className="w-5 h-5 text-biz-orange" />
            Reviews
            {totalReviews > 0 && (
              <span className="ml-1 text-sm font-normal text-gray-500">({totalReviews})</span>
            )}
          </h2>
          {onWriteReview && (
            <button
              onClick={onWriteReview}
              className="px-4 py-1.5 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              Write a Review
            </button>
          )}
        </div>

        {/* Rating summary */}
        {personality.rating_count > 0 && (
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
            <span className="text-3xl font-bold text-gray-900">
              {Number(personality.rating_average).toFixed(1)}
            </span>
            <div>
              <StarRow rating={Math.round(personality.rating_average)} />
              <p className="text-sm text-gray-500 mt-1">{personality.rating_count} reviews</p>
            </div>
          </div>
        )}

        {reviewsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-24 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No reviews yet. Be the first to leave a review!
          </p>
        ) : (
          <>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-biz-navy text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      U
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Name + collaboration type */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          User #{review.reviewer_user_id}
                        </span>
                        {review.collaboration_type && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                            {review.collaboration_type}
                          </span>
                        )}
                      </div>
                      {/* Stars */}
                      <StarRow rating={review.rating} size="sm" />
                      {/* Review text */}
                      {review.review_text && (
                        <p className="text-sm text-gray-700 mt-2">
                          {review.review_text.length > 200
                            ? `${review.review_text.slice(0, 200)}...`
                            : review.review_text}
                        </p>
                      )}
                      {/* Date */}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setReviewPage((p) => p - 1)}
                  disabled={reviewPage === 1}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600 text-sm">
                  Page {reviewPage} of {totalPages}
                </span>
                <button
                  onClick={() => setReviewPage((p) => p + 1)}
                  disabled={reviewPage === totalPages}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
