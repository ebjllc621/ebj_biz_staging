/**
 * ReviewSummary - Rating Distribution Display
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 1 - Review System Foundation
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Large average rating display with shared StarRating
 * - Horizontal bar histogram for each star level
 * - Total review count
 * - Percentage labels on bars
 *
 * Promoted from src/features/listings/components/details/ReviewSummary.tsx
 * - listingName prop renamed to entityName for entity-agnostic use
 */

'use client';

import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { StarRating } from './StarRating';
import type { RatingDistribution } from '@core/services/ReviewService';

export interface ReviewSummaryProps {
  /** Rating distribution data */
  distribution: RatingDistribution;
  /** Entity name for accessibility */
  entityName: string;
}

export function ReviewSummary({ distribution, entityName }: ReviewSummaryProps) {
  const percentages = useMemo(() => {
    if (distribution.total === 0) {
      return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    }
    return {
      5: (distribution[5] / distribution.total) * 100,
      4: (distribution[4] / distribution.total) * 100,
      3: (distribution[3] / distribution.total) * 100,
      2: (distribution[2] / distribution.total) * 100,
      1: (distribution[1] / distribution.total) * 100,
    };
  }, [distribution]);

  return (
    <div
      className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 rounded-lg"
      aria-label={`Review summary for ${entityName}`}
    >
      {/* Average Rating Display */}
      <div className="flex flex-col items-center justify-center min-w-[140px]">
        <span className="text-5xl font-bold text-biz-navy">
          {distribution.average.toFixed(1)}
        </span>
        <StarRating rating={distribution.average} size="lg" />
        <span className="text-sm text-gray-500 mt-2">
          {distribution.total} {distribution.total === 1 ? 'review' : 'reviews'}
        </span>
      </div>

      {/* Histogram Bars */}
      <div className="flex-1 space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => (
          <div key={stars} className="flex items-center gap-3">
            {/* Star Label */}
            <div className="flex items-center gap-1 w-12 justify-end">
              <span className="text-sm font-medium text-gray-600">{stars}</span>
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>

            {/* Progress Bar */}
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${percentages[stars as keyof typeof percentages]}%` }}
              />
            </div>

            {/* Count */}
            <span className="text-sm text-gray-500 w-8 text-right">
              {distribution[stars as keyof RatingDistribution]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReviewSummary;
