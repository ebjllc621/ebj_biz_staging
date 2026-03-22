/**
 * EditReviewModal - Edit Own Review Modal
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4A - 3-Modal Review System
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - BizModal wrapper (maxWidth="lg")
 * - Pre-populates from SharedReview prop (rating, title, review_text)
 * - Only listing reviews support editing (PATCH /api/reviews/{id})
 * - Non-listing entity types show "Editing not supported" message
 * - fetchWithCsrf for PATCH request
 * - Success state (CheckCircle) with 2s auto-close
 * - ErrorBoundary wrapper export
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { CheckCircle, Camera } from 'lucide-react';
import BizModal from '@/components/BizModal';
import { StarRating } from './StarRating';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { SharedReview } from './types';
import type { ReviewEntityType } from './ReviewModal';

// ============================================================================
// Props
// ============================================================================

export interface EditReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: SharedReview;
  entityType: ReviewEntityType;
  onSuccess?: () => void;
}

// ============================================================================
// Validation
// ============================================================================

const MAX_REVIEW_TEXT = 2000;
const MIN_REVIEW_TEXT = 20;
const MAX_TITLE = 100;

// ============================================================================
// EditReviewModal Content (Inner)
// ============================================================================

function EditReviewModalContent({
  isOpen,
  onClose,
  review,
  entityType,
  onSuccess,
}: EditReviewModalProps) {
  // Pre-populate from review prop
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title || '');
  const [reviewText, setReviewText] = useState(review.review_text || '');

  // Media state — pre-populate from existing review images (Task 7.6)
  const [images, setImages] = useState<string[]>(review.images || []);
  const [isUploading, setIsUploading] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-populate state whenever the review prop changes (or modal reopens on a different review)
  useEffect(() => {
    if (isOpen) {
      setRating(review.rating);
      setTitle(review.title || '');
      setReviewText(review.review_text || '');
      setImages(review.images || []);
      setShowSuccess(false);
      setError(null);
    }
  }, [isOpen, review]);

  // -------------------------------------------------------------------------
  // Media handler (Task 7.6 — listing reviews only)
  // -------------------------------------------------------------------------

  const handleImageUpload = async (files: FileList) => {
    const remaining = 5 - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;
    setIsUploading(true);
    for (const file of toUpload) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', 'review');
        formData.append('entityId', String(review.id));
        const response = await fetchWithCsrf('/api/media/upload', { method: 'POST', body: formData });
        if (response.ok) {
          const result = await response.json();
          const url = result.data?.file?.url || result.data?.file?.secure_url;
          if (url) setImages(prev => [...prev, url]);
        }
      } catch { /* skip failed uploads */ }
    }
    setIsUploading(false);
  };

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleSave = async () => {
    if (isSubmitting || showSuccess) return;

    // Only listing reviews can be edited
    if (entityType !== 'listing') {
      setError('Editing is not yet supported for this review type.');
      return;
    }

    // Validation
    if (rating < 1 || rating > 5) {
      setError('Please select a rating.');
      return;
    }
    const trimmedText = reviewText.trim();
    if (trimmedText.length < MIN_REVIEW_TEXT) {
      setError(`Review must be at least ${MIN_REVIEW_TEXT} characters.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          rating,
          title: title.trim() || null,
          review_text: trimmedText,
          images,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData?.error?.message || errorData?.message || 'Failed to update review';
        throw new Error(message);
      }

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSaveDisabled = isSubmitting || showSuccess || entityType !== 'listing';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Your Review"
      subtitle="Update your rating and feedback"
      maxWidth="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Not-supported notice for non-listing entities */}
        {entityType !== 'listing' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Editing is not yet supported for this review type.
            </p>
          </div>
        )}

        {/* Success State */}
        {showSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800">
                Review updated successfully!
              </p>
            </div>
          </div>
        )}

        {/* Edit form (listing reviews only) */}
        {entityType === 'listing' && !showSuccess && (
          <>
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onChange={setRating}
              />
            </div>

            {/* Title */}
            <div>
              <label htmlFor="editReviewTitle" className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-gray-400 font-normal">(optional, max {MAX_TITLE} chars)</span>
              </label>
              <input
                id="editReviewTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={MAX_TITLE}
                placeholder="Summarise your experience..."
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Review text */}
            <div>
              <label htmlFor="editReviewText" className="block text-sm font-medium text-gray-700 mb-2">
                Review <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal"> (min {MIN_REVIEW_TEXT} chars)</span>
              </label>
              <textarea
                id="editReviewText"
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={MAX_REVIEW_TEXT}
                placeholder="Share your experience..."
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between items-center mt-1">
                {reviewText.trim().length > 0 && reviewText.trim().length < MIN_REVIEW_TEXT ? (
                  <p className="text-xs text-red-500">Minimum {MIN_REVIEW_TEXT} characters</p>
                ) : (
                  <span />
                )}
                <p
                  className={`text-xs font-medium ml-auto ${
                    reviewText.length > MAX_REVIEW_TEXT - 100 ? 'text-orange-600' : 'text-gray-500'
                  }`}
                >
                  {reviewText.length}/{MAX_REVIEW_TEXT}
                </p>
              </div>
            </div>

            {/* Image management (Task 7.6) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos <span className="text-gray-400 font-normal">(optional, up to 5)</span>
              </label>

              {/* Existing + newly added image previews */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 group">
                      <Image
                        src={url}
                        alt={`Image ${idx + 1}`}
                        fill
                        className="object-cover rounded-lg"
                        sizes="80px"
                      />
                      <button
                        type="button"
                        onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove image ${idx + 1}`}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {images.length < 5 && (
                <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 transition-colors">
                  <Camera className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {isUploading ? 'Uploading...' : `Add photos (${images.length}/5)`}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={isUploading || isSubmitting}
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  />
                </label>
              )}
            </div>
          </>
        )}

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </BizModal>
  );
}

// ============================================================================
// Exported Component (with ErrorBoundary)
// ============================================================================

export function EditReviewModal(props: EditReviewModalProps) {
  return (
    <ErrorBoundary componentName="EditReviewModal">
      <EditReviewModalContent {...props} />
    </ErrorBoundary>
  );
}

export default EditReviewModal;
