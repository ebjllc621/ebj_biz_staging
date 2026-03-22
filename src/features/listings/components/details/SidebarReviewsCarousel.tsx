/**
 * SidebarReviewsCarousel - Rotating review highlights in sidebar
 *
 * @component Client Component
 * @tier SIMPLE
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Auto-rotating review cards (5s interval)
 * - Manual prev/next navigation
 * - Star rating display
 * - Reviewer name + avatar
 * - Dot indicators
 * - Links to full reviews section
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Star, MessageSquare } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import { StarRating } from '@/components/reviews/StarRating';
import { SidebarFeatureCard } from './SidebarFeatureCard';

interface SidebarReview {
  id: number;
  user_id: number;
  rating: number;
  title: string | null;
  review_text: string | null;
  reviewer_name?: string | null;
  reviewer_avatar_url?: string | null;
  created_at: string;
}

interface SidebarReviewsCarouselProps {
  listingId: number;
  onViewAllReviews?: () => void;
}

const AVATAR_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6'];

export function SidebarReviewsCarousel({ listingId, onViewAllReviews }: SidebarReviewsCarouselProps) {
  const [reviews, setReviews] = useState<SidebarReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch approved reviews
  useEffect(() => {
    if (!listingId) return;
    fetch(`/api/listings/${listingId}/reviews?limit=10`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const items = data?.data?.data;
        if (Array.isArray(items) && items.length > 0) {
          setReviews(items);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setIsLoading(false));
  }, [listingId]);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (reviews.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  }, [reviews.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  }, [reviews.length]);

  // Loading state
  if (isLoading) {
    return (
      <SidebarFeatureCard title="Reviews">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </SidebarFeatureCard>
    );
  }

  // No reviews
  if (reviews.length === 0) {
    return (
      <SidebarFeatureCard title="Reviews">
        <div className="text-center py-4 text-gray-500">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No reviews yet</p>
        </div>
      </SidebarFeatureCard>
    );
  }

  const review = reviews[currentIndex];
  if (!review) return null;

  const displayName = review.reviewer_name || `User #${review.user_id}`;
  const avatarColor = AVATAR_COLORS[review.user_id % AVATAR_COLORS.length] || '#6366F1';
  const avatarInitials = getAvatarInitials(displayName, null);
  const truncatedText = review.review_text
    ? review.review_text.length > 120
      ? review.review_text.substring(0, 120) + '...'
      : review.review_text
    : '';

  return (
    <SidebarFeatureCard>
      <div className="relative">
        {/* Header with average rating bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">Reviews</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => {
                const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                return (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < Math.floor(avg) ? 'text-yellow-400 fill-yellow-400' : i < avg ? 'text-yellow-400 fill-yellow-400/50' : 'text-gray-300'}`}
                  />
                );
              })}
            </div>
            <span className="text-xs text-gray-500">
              {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} ({reviews.length})
            </span>
          </div>
          {reviews.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Previous review"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={goNext}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Next review"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {/* Review Card */}
        <div className="space-y-2">
          {/* Reviewer */}
          <div className="flex items-center gap-2">
            {review.reviewer_avatar_url ? (
              <div className="w-8 h-8 rounded-full overflow-hidden relative flex-shrink-0">
                <Image src={review.reviewer_avatar_url} alt={displayName} fill className="object-cover" sizes="32px" />
              </div>
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <StarRating rating={review.rating} size="sm" />
            </div>
          </div>

          {/* Title */}
          {review.title && (
            <p className="text-sm font-medium text-gray-800">{review.title}</p>
          )}

          {/* Text */}
          {truncatedText && (
            <p className="text-xs text-gray-600 leading-relaxed">{truncatedText}</p>
          )}
        </div>

        {/* Dot indicators */}
        {reviews.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-orange-500' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to review ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* View all link */}
        {onViewAllReviews ? (
          <button
            type="button"
            onClick={onViewAllReviews}
            className="block w-full text-center text-xs text-orange-600 hover:text-orange-700 font-medium mt-3"
          >
            View all reviews
          </button>
        ) : (
          <a
            href="#reviews"
            className="block text-center text-xs text-orange-600 hover:text-orange-700 font-medium mt-3"
          >
            View all reviews
          </a>
        )}
      </div>
    </SidebarFeatureCard>
  );
}

export default SidebarReviewsCarousel;
