/**
 * ReviewCard - Individual Review Display
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 9 - Performance & SEO (Image Optimization)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - User avatar with initials fallback
 * - Star rating display
 * - Review title and text with "Show More"
 * - Helpful/Not Helpful buttons
 * - Owner response display (indented)
 * - Report functionality
 * - Relative date display
 * - Optimized review images with next/image
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_9_BRAIN_PLAN.md
 */
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Flag, MessageCircle } from 'lucide-react';
import type { Review } from '@core/services/ReviewService';
import { getAvatarInitials } from '@core/utils/avatar';
import { StarRating } from '@/components/reviews/StarRating';
import { HelpfulButtons } from '@/components/reviews/HelpfulButtons';

interface ReviewCardProps {
  /** Review data */
  review: Review;
  /** Listing owner ID for response display */
  listingOwnerId: number;
  /** Callback when helpfulness vote is cast */
  onHelpfulVote?: () => void;
}

/**
 * Format date as relative time or date string
 */
function formatReviewDate(date: Date): string {
  const now = new Date();
  const reviewDate = new Date(date);
  const diffMs = now.getTime() - reviewDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    return reviewDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

// StarRating is now imported from shared components library

/**
 * Generate consistent color from user ID
 */
function getAvatarColor(userId: number): string {
  const colors: string[] = [
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#14B8A6', // Teal
  ];
  return colors[userId % colors.length] || '#6366F1';
}

export function ReviewCard({ review, listingOwnerId: _listingOwnerId, onHelpfulVote }: ReviewCardProps) {
  const [showFullText, setShowFullText] = useState(false);

  // Truncate text if longer than threshold
  const textThreshold = 300;
  const reviewText = review.review_text || '';
  const shouldTruncate = reviewText.length > textThreshold;
  const displayText = showFullText || !shouldTruncate
    ? reviewText
    : reviewText.substring(0, textThreshold) + '...';

  const avatarInitials = getAvatarInitials(`User ${review.user_id}`, null);
  const avatarColor = getAvatarColor(review.user_id);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
          style={{ backgroundColor: avatarColor }}
        >
          {avatarInitials}
        </div>

        {/* User Info & Rating */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">
              User #{review.user_id}
            </span>
            {review.is_verified_purchase && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={review.rating} />
            <span className="text-sm text-gray-500">
              {formatReviewDate(review.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-medium text-gray-900 mt-3">
          {review.title}
        </h4>
      )}

      {/* Review Text */}
      <div className="mt-2 text-gray-700">
        <p className="whitespace-pre-wrap">{displayText}</p>
        {shouldTruncate && (
          <button
            onClick={() => setShowFullText(!showFullText)}
            className="text-biz-orange hover:text-biz-orange/80 text-sm font-medium mt-1"
          >
            {showFullText ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>

      {/* Review Images (if any) */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {review.images.map((imageUrl, index) => (
            <div key={index} className="relative w-20 h-20 flex-shrink-0">
              <Image
                src={imageUrl}
                alt={`Review image ${index + 1}`}
                fill
                className="object-cover rounded-lg"
                sizes="80px"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
        <HelpfulButtons
          reviewId={review.id}
          reviewUserId={review.user_id}
          helpfulCount={review.helpful_count}
          notHelpfulCount={review.not_helpful_count}
          onVote={onHelpfulVote}
        />

        {/* Report */}
        <button
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors ml-auto"
          aria-label="Report review"
        >
          <Flag className="w-4 h-4" />
          <span>Report</span>
        </button>
      </div>

      {/* Owner Response */}
      {review.owner_response && (
        <div className="mt-4 ml-8 p-3 bg-gray-50 rounded-lg border-l-4 border-biz-orange">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-biz-orange" />
            <span className="text-sm font-medium text-gray-700">
              Response from Owner
            </span>
            {review.owner_response_date && (
              <span className="text-xs text-gray-500">
                {formatReviewDate(review.owner_response_date)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {review.owner_response}
          </p>
        </div>
      )}
    </div>
  );
}

export default ReviewCard;
