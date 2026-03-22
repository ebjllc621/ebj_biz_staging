/**
 * OfferReviewSummary - Summary stats (avg rating, counts) for offer reviews
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { OfferRatingStars } from './OfferRatingStars';

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  percentAsDescribed: number;
  percentEasyToRedeem: number;
}

interface OfferReviewSummaryProps {
  summary: ReviewSummary;
  className?: string;
}

export function OfferReviewSummary({ summary, className = '' }: OfferReviewSummaryProps) {
  const { averageRating, totalReviews, ratingDistribution, percentAsDescribed, percentEasyToRedeem } = summary;

  if (totalReviews === 0) {
    return null;
  }

  const maxCount = Math.max(...Object.values(ratingDistribution));

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Overall Rating */}
        <div className="text-center md:text-left">
          <div className="flex items-baseline gap-2 justify-center md:justify-start">
            <span className="text-4xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </span>
            <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
          </div>
          <OfferRatingStars rating={averageRating} size="md" className="mt-2" />
          <p className="text-sm text-gray-500 mt-1">
            {totalReviews} review{totalReviews !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1">
          <div className="space-y-1">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = ratingDistribution[star] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-6">{star}</span>
                  <Star className="w-4 h-4 text-yellow-400" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-row md:flex-col gap-4 justify-center">
          <div className="flex items-center gap-2 text-sm">
            <ThumbsUp className="w-4 h-4 text-green-500" />
            <span className="text-gray-600">
              <strong>{percentAsDescribed}%</strong> as described
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span className="text-gray-600">
              <strong>{percentEasyToRedeem}%</strong> easy to redeem
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
