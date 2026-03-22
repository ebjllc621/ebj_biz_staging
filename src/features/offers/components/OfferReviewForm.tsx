/**
 * OfferReviewForm - Quick rating form for post-redemption review
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, Send } from 'lucide-react';
import { OfferRatingStars } from './OfferRatingStars';
import type { ReviewInput } from '@features/offers/types';

interface OfferReviewFormProps {
  claimId: number;
  offerId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function OfferReviewForm({
  claimId,
  offerId,
  onSuccess,
  onCancel,
  compact = false,
}: OfferReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [wasAsDescribed, setWasAsDescribed] = useState<boolean | null>(null);
  const [wasEasyToRedeem, setWasEasyToRedeem] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reviewInput: ReviewInput & { claim_id: number } = {
        claim_id: claimId,
        rating: rating as 1 | 2 | 3 | 4 | 5,
        was_as_described: wasAsDescribed ?? undefined,
        was_easy_to_redeem: wasEasyToRedeem ?? undefined,
        comment: comment.trim() || undefined,
      };

      const response = await fetch(`/api/offers/${offerId}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewInput),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="font-medium text-gray-900">Thank you for your review!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How would you rate this offer?
        </label>
        <OfferRatingStars
          rating={rating}
          interactive
          onChange={setRating}
          size="lg"
        />
      </div>

      {!compact && (
        <>
          {/* Quick Questions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Was it as described?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWasAsDescribed(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    wasAsDescribed === true
                      ? 'bg-green-100 text-green-700 border-2 border-green-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setWasAsDescribed(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    wasAsDescribed === false
                      ? 'bg-red-100 text-red-700 border-2 border-red-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Easy to redeem?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWasEasyToRedeem(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    wasEasyToRedeem === true
                      ? 'bg-green-100 text-green-700 border-2 border-green-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setWasEasyToRedeem(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    wasEasyToRedeem === false
                      ? 'bg-red-100 text-red-700 border-2 border-red-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm text-gray-600 mb-2">
              Additional comments (optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{comment.length}/500</p>
          </div>
        </>
      )}

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Review
            </>
          )}
        </button>
      </div>
    </form>
  );
}
