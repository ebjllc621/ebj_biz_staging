/**
 * ReviewCard - Individual Review Display (Shared / Entity-Agnostic)
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 1 - Review System Foundation
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - User avatar with initials fallback
 * - Shared StarRating display
 * - Review title and text with "Show More" truncation
 * - Shared HelpfulButtons
 * - Owner response display (indented)
 * - Report functionality
 * - Relative date display
 * - Optimized review images with next/image
 *
 * Promoted from src/features/listings/components/details/ReviewCard.tsx
 * - listingOwnerId renamed to entityOwnerId
 * - helpfulVoteEndpoint prop added (optional)
 * - showOwnerResponse / showHelpfulButtons / showReportButton toggle props added
 * - reviewer_name prop added for display (falls back to User #{id})
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Flag, MessageCircle } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import { StarRating } from './StarRating';
import { HelpfulButtons } from './HelpfulButtons';
import { ReviewMediaGallery } from './ReviewMediaGallery';
import { ReviewMediaViewer } from './ReviewMediaViewer';
import type { SharedReview } from './types';

export interface ReviewCardProps {
  review: SharedReview & { reviewer_name?: string; reviewer_avatar_url?: string };
  entityOwnerId: number;
  helpfulVoteEndpoint?: string;
  onHelpfulVote?: () => void;
  showOwnerResponse?: boolean;
  showHelpfulButtons?: boolean;
  showReportButton?: boolean;
}

/**
 * Format date as relative time or absolute date string
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
      day: 'numeric',
    });
  }
}

/**
 * Generate consistent avatar color from user ID
 */
function getAvatarColor(userId: number): string {
  const colors: string[] = [
    '#6366F1',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#3B82F6',
    '#EF4444',
    '#14B8A6',
  ];
  return colors[userId % colors.length] || '#6366F1';
}

export function ReviewCard({
  review,
  entityOwnerId: _entityOwnerId,
  helpfulVoteEndpoint,
  onHelpfulVote,
  showOwnerResponse = true,
  showHelpfulButtons = true,
  showReportButton = true,
}: ReviewCardProps) {
  const [showFullText, setShowFullText] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const textThreshold = 300;
  const reviewText = review.review_text || '';
  const shouldTruncate = reviewText.length > textThreshold;
  const displayText =
    showFullText || !shouldTruncate
      ? reviewText
      : reviewText.substring(0, textThreshold) + '...';

  const displayName = review.reviewer_name || `User #${review.user_id}`;
  const avatarInitials = getAvatarInitials(displayName, null);
  const avatarColor = getAvatarColor(review.user_id);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {review.reviewer_avatar_url ? (
          <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden relative">
            <Image
              src={review.reviewer_avatar_url}
              alt={displayName}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        ) : (
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarInitials}
          </div>
        )}

        {/* User Info and Rating */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{displayName}</span>
            {review.is_verified_purchase && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-sm text-gray-500">
              {formatReviewDate(review.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-medium text-gray-900 mt-3">{review.title}</h4>
      )}

      {/* Review Text */}
      {reviewText && (
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
      )}

      {/* Review Media — gallery thumbnails + lightbox viewer (Task 7.8) */}
      {review.images && review.images.length > 0 && (
        <>
          <ReviewMediaGallery
            media={review.images}
            onImageClick={(idx) => { setLightboxIndex(idx); setLightboxOpen(true); }}
          />
          {lightboxOpen && (
            <ReviewMediaViewer
              media={review.images}
              currentIndex={lightboxIndex}
              onClose={() => setLightboxOpen(false)}
              onNavigate={setLightboxIndex}
            />
          )}
        </>
      )}

      {/* Actions */}
      {(showHelpfulButtons || showReportButton) && (
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
          {showHelpfulButtons && (
            <HelpfulButtons
              reviewId={review.id}
              reviewUserId={review.user_id}
              helpfulCount={review.helpful_count}
              notHelpfulCount={review.not_helpful_count}
              endpoint={helpfulVoteEndpoint}
              onVote={onHelpfulVote}
            />
          )}

          {showReportButton && (
            <button
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors ml-auto"
              aria-label="Report review"
            >
              <Flag className="w-4 h-4" />
              <span>Report</span>
            </button>
          )}
        </div>
      )}

      {/* Owner Response */}
      {showOwnerResponse && review.owner_response && (
        <div className="mt-4 ml-8 p-3 bg-gray-50 rounded-lg border-l-4 border-biz-orange">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-biz-orange" />
            <span className="text-sm font-medium text-gray-700">Response from Owner</span>
            {review.owner_response_date && (
              <span className="text-xs text-gray-500">
                {formatReviewDate(review.owner_response_date)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{review.owner_response}</p>
        </div>
      )}
    </div>
  );
}

export default ReviewCard;
