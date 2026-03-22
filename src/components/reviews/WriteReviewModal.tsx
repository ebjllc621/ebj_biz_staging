/**
 * WriteReviewModal - Create Review Modal (Entity-Agnostic)
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4A - 3-Modal Review System
 * @governance Build Map v2.1 ENHANCED
 *
 * Canon pattern: Replicates ProfileReviewModal.tsx exactly with entity-agnostic adaptations:
 * - BizModal wrapper, auth gate, interactive star picker, text input with char counter
 * - Success state (CheckCircle) with 2s auto-close, form reset on close, error display
 * - footer with Cancel + Submit buttons
 *
 * Entity differences:
 * - Listing: title input, review_text required (min 20), POST /api/reviews
 * - Event: no title, review_text optional (min 20 if provided), POST /api/events/{id}/reviews
 * - Offer: no title, comment optional (max 500), boolean quick-feedback, POST /api/offers/{id}/reviews
 *
 * ErrorBoundary wrapper export pattern.
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { CheckCircle, Camera, Video } from 'lucide-react';
import BizModal from '@/components/BizModal';
import { StarRating } from './StarRating';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { ReviewEntityType } from './ReviewModal';

// ============================================================================
// Props
// ============================================================================

export interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: ReviewEntityType;
  entityId: number;
  entityName: string;
  onSuccess?: () => void;
  /** Offer-specific: required to create an offer review */
  claimId?: number;
}

// ============================================================================
// Validation helpers
// ============================================================================

const MAX_REVIEW_TEXT = 2000;
const MIN_REVIEW_TEXT = 20;
const MAX_OFFER_COMMENT = 500;
const MAX_TITLE = 100;

function validateForm(
  entityType: ReviewEntityType,
  rating: number,
  reviewText: string,
  claimId: number | undefined
): string | null {
  if (rating < 1 || rating > 5) {
    return 'Please select a rating.';
  }

  if (entityType === 'listing') {
    const trimmed = reviewText.trim();
    if (trimmed.length === 0) {
      return 'Review text is required for listing reviews.';
    }
    if (trimmed.length < MIN_REVIEW_TEXT) {
      return `Review must be at least ${MIN_REVIEW_TEXT} characters.`;
    }
  }

  if (
    entityType === 'event' ||
    entityType === 'article' ||
    entityType === 'video' ||
    entityType === 'guide' ||
    entityType === 'podcast' ||
    entityType === 'affiliate_marketer' ||
    entityType === 'internet_personality' ||
    entityType === 'podcaster'
  ) {
    const trimmed = reviewText.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_REVIEW_TEXT) {
      return `Review must be at least ${MIN_REVIEW_TEXT} characters if provided.`;
    }
  }

  if (entityType === 'offer') {
    if (!claimId) {
      return 'You must claim this offer before leaving a review.';
    }
    const trimmed = reviewText.trim();
    if (trimmed.length > MAX_OFFER_COMMENT) {
      return `Comment must not exceed ${MAX_OFFER_COMMENT} characters.`;
    }
  }

  return null;
}

// ============================================================================
// WriteReviewModal Content (Inner)
// ============================================================================

function WriteReviewModalContent({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  onSuccess,
  claimId,
}: WriteReviewModalProps) {
  const { user } = useAuth();

  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');          // Listing only
  const [reviewText, setReviewText] = useState('');
  const [wasAsDescribed, setWasAsDescribed] = useState<boolean | null>(null);   // Offer only
  const [wasEasyToRedeem, setWasEasyToRedeem] = useState<boolean | null>(null); // Offer only

  // Media state (listing + offer reviews — Tasks 7.1-7.3)
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived
  const supportsMedia = true; // All review types now support media uploads
  const maxText = entityType === 'offer' ? MAX_OFFER_COMMENT : MAX_REVIEW_TEXT;
  const textLabel = entityType === 'offer' ? 'Comment' : 'Review';
  const textRequired = entityType === 'listing';

  // -------------------------------------------------------------------------
  // Form reset on close (canon from ProfileReviewModal)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) {
      setRating(0);
      setTitle('');
      setReviewText('');
      setWasAsDescribed(null);
      setWasEasyToRedeem(null);
      setShowSuccess(false);
      setError(null);
      setUploadedImages([]);
      setUploadedVideo(null);
      setVideoEmbedUrl('');
    }
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Media handlers (Tasks 7.1-7.3 — listing + offer reviews)
  // -------------------------------------------------------------------------

  const handleImageUpload = async (files: FileList) => {
    const remaining = 5 - uploadedImages.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;
    setIsUploading(true);
    for (const file of toUpload) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', 'review');
        formData.append('entityId', String(entityId));
        const response = await fetchWithCsrf('/api/media/upload', { method: 'POST', body: formData });
        if (response.ok) {
          const result = await response.json();
          const url = result.data?.file?.url || result.data?.file?.secure_url;
          if (url) setUploadedImages(prev => [...prev, url]);
        }
      } catch { /* skip failed uploads */ }
    }
    setIsUploading(false);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'review');
      formData.append('entityId', String(entityId));
      const response = await fetchWithCsrf('/api/media/upload', { method: 'POST', body: formData });
      if (response.ok) {
        const result = await response.json();
        const url = result.data?.file?.url || result.data?.file?.secure_url;
        if (url) setUploadedVideo(url);
      }
    } catch { /* skip failed upload */ }
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

  const handleSubmit = async () => {
    if (!user || isSubmitting || showSuccess) return;

    const validationError = validateForm(entityType, rating, reviewText, claimId);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let url: string;
      let body: Record<string, unknown>;

      switch (entityType) {
        case 'listing': {
          url = '/api/reviews';
          const allMedia: string[] = [...uploadedImages];
          if (uploadedVideo) allMedia.push(uploadedVideo);
          if (videoEmbedUrl.trim()) allMedia.push(videoEmbedUrl.trim());
          body = {
            listing_id: entityId,
            rating,
            title: title.trim() || null,
            review_text: reviewText.trim(),
            user_id: Number(user.id),
            ...(allMedia.length > 0 && { images: allMedia }),
          };
          break;
        }
        case 'event':
          url = `/api/events/${entityId}/reviews`;
          body = {
            rating,
            review_text: reviewText.trim() || undefined,
          };
          break;
        case 'offer': {
          url = `/api/offers/${entityId}/reviews`;
          const offerMedia: string[] = [...uploadedImages];
          if (uploadedVideo) offerMedia.push(uploadedVideo);
          if (videoEmbedUrl.trim()) offerMedia.push(videoEmbedUrl.trim());
          body = {
            claim_id: claimId,
            rating,
            was_as_described: wasAsDescribed,
            was_easy_to_redeem: wasEasyToRedeem,
            comment: reviewText.trim() || undefined,
            ...(offerMedia.length > 0 && { images: offerMedia }),
          };
          break;
        }
        case 'article':
        case 'video':
        case 'guide':
        case 'podcast': {
          const pluralMap: Record<string, string> = {
            article: 'articles',
            video: 'videos',
            guide: 'guides',
            podcast: 'podcasts',
          };
          url = `/api/content/${pluralMap[entityType]}/${entityId}/ratings`;
          const contentMedia: string[] = [...uploadedImages];
          if (uploadedVideo) contentMedia.push(uploadedVideo);
          if (videoEmbedUrl.trim()) contentMedia.push(videoEmbedUrl.trim());
          body = {
            rating,
            title: title.trim() || null,
            comment: reviewText.trim() || undefined,
            ...(contentMedia.length > 0 && { images: contentMedia }),
          };
          break;
        }
        case 'affiliate_marketer': {
          url = `/api/content/affiliate-marketers/${entityId}/reviews`;
          const affiliateMedia: string[] = [...uploadedImages];
          if (uploadedVideo) affiliateMedia.push(uploadedVideo);
          if (videoEmbedUrl.trim()) affiliateMedia.push(videoEmbedUrl.trim());
          body = {
            rating,
            review_text: reviewText.trim() || undefined,
            campaign_type: null,
            ...(affiliateMedia.length > 0 && { images: affiliateMedia }),
          };
          break;
        }
        case 'internet_personality': {
          url = `/api/content/internet-personalities/${entityId}/reviews`;
          const personalityMedia: string[] = [...uploadedImages];
          if (uploadedVideo) personalityMedia.push(uploadedVideo);
          if (videoEmbedUrl.trim()) personalityMedia.push(videoEmbedUrl.trim());
          body = {
            rating,
            review_text: reviewText.trim() || undefined,
            collaboration_type: null,
            ...(personalityMedia.length > 0 && { images: personalityMedia }),
          };
          break;
        }
        case 'podcaster': {
          url = `/api/content/podcasters/${entityId}/reviews`;
          const podcasterMedia: string[] = [...uploadedImages];
          if (uploadedVideo) podcasterMedia.push(uploadedVideo);
          if (videoEmbedUrl.trim()) podcasterMedia.push(videoEmbedUrl.trim());
          body = {
            rating,
            review_text: reviewText.trim() || undefined,
            episode_reference: null,
            ...(podcasterMedia.length > 0 && { images: podcasterMedia }),
          };
          break;
        }
        default:
          throw new Error(`Unrecognized review entity type: ${entityType as string}`);
      }

      const response = await fetchWithCsrf(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData?.error?.message || errorData?.message || 'Failed to submit review';
        throw new Error(message);
      }

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || showSuccess || !user || rating === 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Review ${entityName}`}
      subtitle="Share your experience"
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
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Auth Guard */}
        {!user && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Please{' '}
              <a href="/auth/login" className="font-semibold underline hover:text-blue-900">
                sign in
              </a>{' '}
              to leave a review.
            </p>
          </div>
        )}

        {/* Success State */}
        {showSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800">
                Review submitted! It will appear after moderation.
              </p>
            </div>
          </div>
        )}

        {/* Form (only shown when authed and not yet successful) */}
        {user && !showSuccess && (
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
              {rating === 0 && (
                <p className="mt-1 text-xs text-gray-500">Click a star to rate</p>
              )}
            </div>

            {/* Title (listing only) */}
            {entityType === 'listing' && (
              <div>
                <label htmlFor="reviewTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-gray-400 font-normal">(optional, max {MAX_TITLE} chars)</span>
                </label>
                <input
                  id="reviewTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={MAX_TITLE}
                  placeholder="Summarise your experience..."
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {/* Offer quick feedback (offer only) */}
            {entityType === 'offer' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Quick Feedback</p>

                {/* Was as described */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Was the offer as described?</p>
                  <div className="flex gap-2">
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setWasAsDescribed(wasAsDescribed === val ? null : val)}
                        disabled={isSubmitting}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors disabled:cursor-not-allowed ${
                          wasAsDescribed === val
                            ? val
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {val ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Was easy to redeem */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Was it easy to redeem?</p>
                  <div className="flex gap-2">
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setWasEasyToRedeem(wasEasyToRedeem === val ? null : val)}
                        disabled={isSubmitting}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors disabled:cursor-not-allowed ${
                          wasEasyToRedeem === val
                            ? val
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {val ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Review text / Comment */}
            <div>
              <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700 mb-2">
                {textLabel}{' '}
                {textRequired ? (
                  <>
                    <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal"> (min {MIN_REVIEW_TEXT} chars)</span>
                  </>
                ) : (
                  <span className="text-gray-400 font-normal">(optional)</span>
                )}
              </label>
              <textarea
                id="reviewText"
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={maxText}
                placeholder={entityType === 'offer' ? 'Any additional comments...' : 'Share your experience...'}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between items-center mt-1">
                {reviewText.trim().length > 0 && reviewText.trim().length < MIN_REVIEW_TEXT && textRequired ? (
                  <p className="text-xs text-red-500">Minimum {MIN_REVIEW_TEXT} characters</p>
                ) : (
                  <span />
                )}
                <p
                  className={`text-xs font-medium ml-auto ${
                    reviewText.length > maxText - 100 ? 'text-orange-600' : 'text-gray-500'
                  }`}
                >
                  {reviewText.length}/{maxText}
                </p>
              </div>
            </div>

            {/* Image upload (listing + offer reviews — Task 7.1) */}
            {supportsMedia && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos <span className="text-gray-400 font-normal">(optional, up to 5)</span>
                </label>

                {/* Preview grid */}
                {uploadedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {uploadedImages.map((url, idx) => (
                      <div key={idx} className="relative w-20 h-20 group">
                        <Image
                          src={url}
                          alt={`Upload ${idx + 1}`}
                          fill
                          className="object-cover rounded-lg"
                          sizes="80px"
                        />
                        <button
                          type="button"
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
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
                {uploadedImages.length < 5 && (
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg cursor-pointer hover:bg-orange-700 transition-colors font-medium text-sm shadow-sm">
                    <Camera className="w-4 h-4" />
                    <span>
                      {isUploading ? 'Uploading...' : `Add photos (${uploadedImages.length}/5)`}
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
            )}

            {/* Video upload (listing + offer reviews — Task 7.2) */}
            {supportsMedia && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video <span className="text-gray-400 font-normal">(optional, 1 max)</span>
                </label>

                {uploadedVideo ? (
                  <div className="relative">
                    <video
                      src={uploadedVideo}
                      className="w-full max-h-40 rounded-lg object-cover"
                      controls
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedVideo(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                      aria-label="Remove video"
                    >
                      x
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                    <Video className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-orange-600 font-medium">
                      {isUploading ? 'Uploading...' : 'Add video'}
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      className="hidden"
                      disabled={isUploading || isSubmitting}
                      onChange={handleVideoUpload}
                    />
                  </label>
                )}
              </div>
            )}

            {/* Video embed URL (listing + offer reviews, only when no uploaded video — Task 7.3) */}
            {supportsMedia && !uploadedVideo && (
              <div>
                <label htmlFor="videoEmbedUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Or paste a video URL{' '}
                  <span className="text-gray-400 font-normal">(YouTube, Vimeo, Rumble — optional)</span>
                </label>
                <input
                  id="videoEmbedUrl"
                  type="url"
                  value={videoEmbedUrl}
                  onChange={(e) => setVideoEmbedUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            )}
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

export function WriteReviewModal(props: WriteReviewModalProps) {
  return (
    <ErrorBoundary componentName="WriteReviewModal">
      <WriteReviewModalContent {...props} />
    </ErrorBoundary>
  );
}

export default WriteReviewModal;
