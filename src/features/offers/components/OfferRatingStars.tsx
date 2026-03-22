/**
 * OfferRatingStars - Star rating display/input component
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 *
 * Delegates to shared StarRating component.
 * Re-exported with offer-specific interface for backward compatibility.
 */

'use client';

import { StarRating } from '@/components/reviews/StarRating';

export interface OfferRatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export function OfferRatingStars({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
  className = '',
}: OfferRatingStarsProps) {
  return (
    <StarRating
      rating={rating}
      maxRating={maxRating}
      size={size}
      interactive={interactive}
      onChange={onChange}
      className={className}
    />
  );
}

export default OfferRatingStars;
