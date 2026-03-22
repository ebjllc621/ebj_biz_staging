/**
 * Review Submission Form - Inline review submission with star rating
 *
 * @authority PHASE_5.4_BRAIN_PLAN.md
 * @complexity STANDARD
 * @governance Authentication gating (general, listing_member, admin - NOT visitors)
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

interface ReviewSubmissionFormProps {
  listingId: number;
  listingName: string;
  onSuccess: () => void;
}

/**
 * ReviewSubmissionForm - Inline review submission
 *
 * @param {object} props - Component props
 * @param {number} props.listingId - Listing ID being reviewed
 * @param {string} props.listingName - Listing name for display
 * @param {function} props.onSuccess - Success callback
 * @returns {JSX.Element}
 */
export function ReviewSubmissionForm({
  listingId,
  listingName,
  onSuccess
}: ReviewSubmissionFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GOVERNANCE: Account type check - general, listing_member, or admin (NOT visitors)
  if (!user || user.role === 'visitor') {
    return (
      <div className="bg-gray-50 p-6 rounded text-center">
        <p className="text-gray-600 mb-4">Sign in to leave a review</p>
        <button
          onClick={() => (window.location.href = '/login')}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (rating === 0) {
      alert('Please select a star rating');
      return;
    }

    if (reviewText.trim().length < 20) {
      alert('Review must be at least 20 characters');
      return;
    }

    setSubmitting(true);
    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listingId,
          rating,
          review_text: reviewText.trim(),
          user_id: user.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to submit review');
      }

      // Success
      setRating(0);
      setReviewText('');
      onSuccess();
      alert('Review submitted successfully! It will appear after moderation.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow">
      <h3 className="text-xl font-medium mb-4">Leave a Review for {listingName}</h3>

      {/* Star Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Your Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-3xl ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              } hover:text-yellow-400 transition`}
            >
              ★
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {rating === 0 && 'Click to rate'}
          {rating === 1 && 'Poor'}
          {rating === 2 && 'Fair'}
          {rating === 3 && 'Good'}
          {rating === 4 && 'Very Good'}
          {rating === 5 && 'Excellent'}
        </div>
      </div>

      {/* Review Text */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          rows={6}
          placeholder="Share your experience with this business... (minimum 20 characters)"
          required
        />
        <div className="text-xs text-gray-500 mt-1">
          {reviewText.length} / 20 characters minimum
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting || rating === 0 || reviewText.trim().length < 20}
        className="w-full px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
