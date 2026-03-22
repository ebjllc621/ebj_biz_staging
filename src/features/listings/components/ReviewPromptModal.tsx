/**
 * ReviewPromptModal - Post-visit review prompt modal
 *
 * Shown to authenticated users who have interacted with a listing (directions,
 * contact) to prompt them to leave a review. Replicates the OfferReviewPrompt
 * flow wrapped in BizModal.
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 * @reference src/features/offers/components/OfferReviewPrompt.tsx
 */
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import BizModal from '@/components/BizModal/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// Props
// ============================================================================

interface ReviewPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  listingName: string;
  onReviewSubmitted?: () => void;
}

// ============================================================================
// ReviewPromptModal Component
// ============================================================================

export function ReviewPromptModal({
  isOpen,
  onClose,
  listingId,
  listingName,
  onReviewSubmitted
}: ReviewPromptModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = async () => {
    // Cancel the prompt so it doesn't show again
    try {
      await fetchWithCsrf('/api/notifications/review-prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId })
      });
    } catch {
      // Non-blocking — dismiss anyway
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/listings/${listingId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: reviewText })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to submit review');
      }

      // Cancel the prompt now that review is submitted
      await fetchWithCsrf('/api/notifications/review-prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId })
      }).catch(() => {});

      onReviewSubmitted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleDismiss}
      title="How was your experience?"
      subtitle={`Share your feedback about ${listingName}`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isSubmitting}
          >
            Not now
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="px-6 py-2 bg-[#ed6437] text-white rounded-lg text-sm font-medium
                       hover:bg-[#d55830] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        {/* Star Rating */}
        <div>
          <p className="text-sm text-gray-600 mb-3">Select a rating</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
                aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    displayRating >= star
                      ? 'fill-[#ed6437] text-[#ed6437]'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent'}
              </span>
            )}
          </div>
        </div>

        {/* Optional Review Text */}
        <div>
          <label htmlFor="review-text" className="block text-sm text-gray-600 mb-2">
            Tell others about your experience (optional)
          </label>
          <textarea
            id="review-text"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder={`Share what you liked or didn't like about ${listingName}...`}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent
                       resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </BizModal>
  );
}

export default ReviewPromptModal;
