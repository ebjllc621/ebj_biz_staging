/**
 * StarRating - Shared star rating display and input component
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 1 - Review System Foundation
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Interactive mode with hover state
 * - Half-star display via overlay technique
 * - sm/md/lg sizes
 * - ARIA labels for accessibility
 * - Optional numeric value display
 *
 * Canonicalized from:
 * - src/features/offers/components/OfferRatingStars.tsx (interactive mode, hover, ARIA)
 * - src/features/listings/components/details/ReviewSummary.tsx (half-star overlay)
 */

'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

export interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
  showValue = false,
  className = '',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // In interactive mode use hover rating, otherwise use the prop directly
  const displayRating = interactive ? (hoverRating || rating) : rating;

  const handleClick = (starIndex: number) => {
    if (interactive && onChange) {
      onChange(starIndex);
    }
  };

  if (interactive) {
    return (
      <div
        className={`inline-flex items-center gap-0.5 ${className}`}
        onMouseLeave={() => setHoverRating(0)}
        aria-label={`${rating} out of ${maxRating} stars`}
      >
        {Array.from({ length: maxRating }, (_, index) => {
          const starIndex = index + 1;
          const isFilled = starIndex <= displayRating;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(starIndex)}
              onMouseEnter={() => setHoverRating(starIndex)}
              className="cursor-pointer hover:scale-110 transition-transform"
              aria-label={`${starIndex} star${starIndex !== 1 ? 's' : ''}`}
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-300'
                } transition-colors`}
              />
            </button>
          );
        })}
        {showValue && (
          <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
        )}
      </div>
    );
  }

  // Non-interactive: support half-star display
  const fullStars = Math.floor(displayRating);
  const hasHalfStar = displayRating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={`${rating.toFixed(1)} out of ${maxRating} stars`}
    >
      {Array.from({ length: fullStars }, (_, i) => (
        <Star
          key={`full-${i}`}
          className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400`}
        />
      ))}

      {hasHalfStar && (
        <div className="relative" key="half">
          <Star className={`${sizeClasses[size]} text-gray-300`} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400`} />
          </div>
        </div>
      )}

      {Array.from({ length: emptyStars }, (_, i) => (
        <Star
          key={`empty-${i}`}
          className={`${sizeClasses[size]} text-gray-300`}
        />
      ))}

      {showValue && (
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}

export default StarRating;
