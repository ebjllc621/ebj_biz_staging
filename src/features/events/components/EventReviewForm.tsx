/**
 * EventReviewForm - Star rating + review text submission form for events
 *
 * Inline form rendered within EventReviewPrompt. Includes:
 * - Interactive 1-5 star rating picker
 * - Optional review textarea (min 20 chars, max 2000 chars)
 * - Testimonial opt-in for 4-5 star reviews
 *
 * Pattern: Follows ReviewSubmissionForm + OfferReviewForm canon patterns
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Task 4.5: EventReviewForm
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { EventReview } from '@features/events/types';

interface EventReviewFormProps {
  eventId: number;
  eventTitle: string;
  businessName: string | null;
  onSuccess?: (_review: EventReview) => void;
  onCancel?: () => void;
}

export function EventReviewForm({
  eventId,
  eventTitle,
  businessName,
  onSuccess,
  onCancel,
}: EventReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReview, setSubmittedReview] = useState<EventReview | null>(null);
  const [testimonialSubmitting, setTestimonialSubmitting] = useState(false);
  const [testimonialDone, setTestimonialDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }

    const trimmedText = reviewText.trim();
    if (trimmedText && trimmedText.length < 20) {
      setError('Review text must be at least 20 characters if provided');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/events/${eventId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          review_text: trimmedText || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(data.error?.message || 'You are not eligible to review this event');
        }
        if (response.status === 409) {
          throw new Error('You have already reviewed this event');
        }
        throw new Error(data.error?.message || 'Failed to submit review');
      }

      const review = data.data?.review as EventReview;
      setSubmittedReview(review);
      onSuccess?.(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestimonialApprove = async () => {
    if (!submittedReview) return;
    setTestimonialSubmitting(true);

    try {
      await fetchWithCsrf(`/api/events/${eventId}/reviews/testimonial`, {
        method: 'PATCH',
        body: JSON.stringify({ review_id: submittedReview.id }),
      });
      setTestimonialDone(true);
    } catch {
      // Silently fail — testimonial is optional
      setTestimonialDone(true);
    } finally {
      setTestimonialSubmitting(false);
    }
  };

  // Success state — show thank you + optional testimonial prompt
  if (submittedReview) {
    if (testimonialDone) {
      return (
        <div className="text-center py-4">
          <p className="font-medium text-gray-900">Thank you for your review!</p>
          {submittedReview.rating >= 4 && (
            <p className="text-sm text-gray-600 mt-1">Your review has been featured as a testimonial.</p>
          )}
        </div>
      );
    }

    if (submittedReview.rating >= 4 && businessName) {
      return (
        <div className="space-y-4">
          <div className="text-center py-2">
            <p className="font-medium text-gray-900">Thank you for your review!</p>
            <p className="text-sm text-gray-600 mt-1">
              Would you like {businessName} to feature this as a testimonial?
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setTestimonialDone(true)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            >
              No thanks
            </button>
            <button
              onClick={handleTestimonialApprove}
              disabled={testimonialSubmitting}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {testimonialSubmitting ? 'Saving...' : 'Yes, feature my review'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-4">
        <p className="font-medium text-gray-900">Thank you for your feedback!</p>
        <p className="text-sm text-gray-600 mt-1">
          Your review of {eventTitle} has been submitted.
        </p>
      </div>
    );
  }

  const displayRating = hoveredRating || rating;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Star Rating Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1" role="group" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              className={`transition-colors ${
                star <= displayRating ? 'text-yellow-400' : 'text-gray-300'
              } hover:text-yellow-400`}
            >
              <Star className="w-8 h-8" fill={star <= displayRating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>

      {/* Review Text (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Review <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          rows={4}
          maxLength={2000}
          placeholder="Share your experience at this event..."
        />
        <p className="text-xs text-gray-500 mt-1">
          {reviewText.length > 0 && reviewText.length < 20
            ? `${20 - reviewText.length} more characters required`
            : `${reviewText.length}/2000 characters`}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || rating === 0 || (reviewText.trim().length > 0 && reviewText.trim().length < 20)}
          className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
