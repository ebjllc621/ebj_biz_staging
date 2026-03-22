/**
 * PodcasterDetailContent - Main content area for podcaster detail page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Podcaster Parity - Phase 7
 * @governance Build Map v2.1 ENHANCED
 *
 * Renders: Bio (expand/collapse), Genres, Recent Episodes list,
 * Guest Booking Info, Monetization Methods, Reviews with pagination.
 * Fetches reviews from API routes on mount.
 *
 * @see src/features/content/components/affiliate-marketers/AffiliateMarketerDetailContent.tsx - Canonical pattern
 */
'use client';

import { useState, useEffect } from 'react';
import { FileText, Tag, Mic, UserCheck, DollarSign, Star, Clock } from 'lucide-react';
import type { PodcasterProfile, PodcasterEpisode, PodcasterReview } from '@core/types/podcaster';

interface PodcasterDetailContentProps {
  podcaster: PodcasterProfile;
  episodes?: PodcasterEpisode[];
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

/**
 * Format duration in minutes to a readable string
 */
function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function PodcasterDetailContent({
  podcaster,
  episodes = [],
  className,
  onWriteReview,
  refreshKey,
}: PodcasterDetailContentProps) {
  const [reviews, setReviews] = useState<PodcasterReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPagination, setReviewPagination] = useState<{
    total: number;
    totalPages: number;
    page: number;
    pageSize: number;
  } | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  // Fetch reviews on mount and page change
  useEffect(() => {
    setReviewsLoading(true);
    const load = async () => {
      try {
        const res = await fetch(
          `/api/content/podcasters/${podcaster.id}/reviews?page=${reviewPage}&pageSize=5`
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
  }, [podcaster.id, reviewPage, refreshKey]);

  const bioTooLong = (podcaster.bio?.length ?? 0) > 300;
  const totalPages = reviewPagination?.totalPages ?? 1;
  const totalReviews = reviewPagination?.total ?? podcaster.rating_count;

  return (
    <div className={`space-y-6 ${className ?? ''}`}>
      {/* 1. About / Bio */}
      {podcaster.bio && (
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
              {podcaster.bio}
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

      {/* 2. Genres */}
      {podcaster.genres && podcaster.genres.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
            <Tag className="w-5 h-5 text-biz-orange" />
            Genres
          </h2>
          <div className="flex flex-wrap gap-2">
            {podcaster.genres.map((genre) => (
              <span
                key={genre}
                className="px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Recent Episodes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
          <Mic className="w-5 h-5 text-biz-orange" />
          Recent Episodes
          {episodes.length > 0 && (
            <span className="ml-1 text-sm font-normal text-gray-500">({episodes.length})</span>
          )}
        </h2>

        {episodes.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No episodes listed yet.</p>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => (
              <div
                key={episode.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Episode label */}
                    <div className="flex items-center gap-2 mb-1">
                      {episode.season_number !== null && (
                        <span className="text-xs text-gray-400">S{episode.season_number}</span>
                      )}
                      {episode.episode_number !== null && (
                        <span className="text-xs text-gray-400">E{episode.episode_number}</span>
                      )}
                      {episode.published_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(episode.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {/* Title */}
                    {episode.episode_title && (
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                        {episode.episode_title}
                      </h3>
                    )}
                    {/* Description */}
                    {episode.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{episode.description}</p>
                    )}
                    {/* Guests */}
                    {episode.guest_names && episode.guest_names.length > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        Guests: {episode.guest_names.join(', ')}
                      </p>
                    )}
                  </div>
                  {/* Duration */}
                  {episode.duration !== null && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(episode.duration)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Guest Booking Info */}
      {podcaster.guest_booking_info && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-biz-orange" />
            Guest Booking
          </h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
            {podcaster.guest_booking_info}
          </p>
        </div>
      )}

      {/* 5. Monetization Methods */}
      {podcaster.monetization_methods && podcaster.monetization_methods.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-biz-orange" />
            Monetization
          </h2>
          <div className="flex flex-wrap gap-2">
            {podcaster.monetization_methods.map((method) => (
              <span
                key={method}
                className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 6. Reviews */}
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
        {podcaster.rating_count > 0 && (
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
            <span className="text-3xl font-bold text-gray-900">
              {Number(podcaster.rating_average).toFixed(1)}
            </span>
            <div>
              <StarRow rating={Math.round(podcaster.rating_average)} />
              <p className="text-sm text-gray-500 mt-1">{podcaster.rating_count} reviews</p>
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
                <div key={review.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-biz-navy text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      U
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Name + episode reference */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          User #{review.reviewer_user_id}
                        </span>
                        {review.episode_reference && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                            {review.episode_reference}
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
