/**
 * AffiliateMarketerDetailContent - Main content area for affiliate marketer detail page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3B
 * @governance Build Map v2.1 ENHANCED
 *
 * Renders: Bio (expand/collapse), Specializations, Affiliate Networks, Portfolio grid, Reviews with pagination.
 * Fetches portfolio and reviews from Phase 2 API routes on mount.
 */
'use client';

import { useState, useEffect } from 'react';
import { FileText, Award, Network, Briefcase, Star } from 'lucide-react';
import type {
  AffiliateMarketerProfile,
  PortfolioItem,
  AffiliateMarketerReview,
} from '@core/types/affiliate-marketer';

interface AffiliateMarketerDetailContentProps {
  marketer: AffiliateMarketerProfile;
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

export function AffiliateMarketerDetailContent({
  marketer,
  className,
  onWriteReview,
  refreshKey,
}: AffiliateMarketerDetailContentProps) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [reviews, setReviews] = useState<AffiliateMarketerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPagination, setReviewPagination] = useState<{
    total: number;
    totalPages: number;
    page: number;
    pageSize: number;
  } | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  // Fetch portfolio on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/content/affiliate-marketers/${marketer.id}/portfolio`);
        const result = await res.json();
        if (result.success) {
          setPortfolio(result.data.portfolio ?? []);
        }
      } catch {
        // Silent fail — empty state shown
      } finally {
        setPortfolioLoading(false);
      }
    };
    load();
  }, [marketer.id]);

  // Fetch reviews on mount and page change
  useEffect(() => {
    setReviewsLoading(true);
    const load = async () => {
      try {
        const res = await fetch(
          `/api/content/affiliate-marketers/${marketer.id}/reviews?page=${reviewPage}&pageSize=5`
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
  }, [marketer.id, reviewPage, refreshKey]);

  const bioTooLong = (marketer.bio?.length ?? 0) > 300;
  const totalPages = reviewPagination?.totalPages ?? 1;
  const totalReviews = reviewPagination?.total ?? marketer.rating_count;

  return (
    <div className={`space-y-6 ${className ?? ''}`}>
      {/* 1. About / Bio */}
      {marketer.bio && (
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
              {marketer.bio}
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

      {/* 2. Specializations */}
      {marketer.specializations && marketer.specializations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-biz-orange" />
            Specializations
          </h2>
          <div className="flex flex-wrap gap-2">
            {marketer.specializations.map((spec) => (
              <span
                key={spec}
                className="px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Affiliate Networks */}
      {marketer.affiliate_networks && marketer.affiliate_networks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
            <Network className="w-5 h-5 text-biz-orange" />
            Affiliate Networks
          </h2>
          <div className="flex flex-wrap gap-2">
            {marketer.affiliate_networks.map((network) => (
              <span
                key={network}
                className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100"
              >
                {network}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Portfolio */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-biz-navy mb-3 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-biz-orange" />
          Portfolio
          {!portfolioLoading && portfolio.length > 0 && (
            <span className="ml-1 text-sm font-normal text-gray-500">({portfolio.length})</span>
          )}
        </h2>

        {portfolioLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-48" />
            ))}
          </div>
        ) : portfolio.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No portfolio items yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolio.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                {/* Brand header */}
                <div className="flex items-center gap-2 mb-2">
                  {item.brand_logo ? (
                    <img
                      src={item.brand_logo}
                      alt={item.brand_name ?? 'Brand'}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                  ) : item.brand_name ? (
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-600">
                        {item.brand_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ) : null}
                  {item.brand_name && (
                    <span className="text-sm font-medium text-gray-800">{item.brand_name}</span>
                  )}
                </div>

                {/* Campaign title */}
                {item.campaign_title && (
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.campaign_title}</h3>
                )}

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                )}

                {/* Results summary */}
                {item.results_summary && (
                  <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mb-2">
                    {item.results_summary}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <div className="flex gap-3">
                    {item.conversion_rate !== null && (
                      <span className="text-xs text-gray-500">
                        {item.conversion_rate}% conversion
                      </span>
                    )}
                    {item.campaign_date && (
                      <span className="text-xs text-gray-400">
                        {new Date(item.campaign_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {item.content_url && (
                    <a
                      href={item.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-biz-orange hover:underline"
                    >
                      View Campaign
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Reviews */}
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
        {marketer.rating_count > 0 && (
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
            <span className="text-3xl font-bold text-gray-900">
              {Number(marketer.rating_average).toFixed(1)}
            </span>
            <div>
              <StarRow rating={Math.round(marketer.rating_average)} />
              <p className="text-sm text-gray-500 mt-1">{marketer.rating_count} reviews</p>
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
                      {/* Name + campaign type */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          User #{review.reviewer_user_id}
                        </span>
                        {review.campaign_type && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                            {review.campaign_type}
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
