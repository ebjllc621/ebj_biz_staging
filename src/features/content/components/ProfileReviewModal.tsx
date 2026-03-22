/**
 * ProfileReviewModal - Shared modal for submitting reviews to creator profiles
 *
 * @authority Tier3_Phases/PHASE_6_REVIEW_SYSTEM.md
 * @tier STANDARD
 * @reference src/features/content/components/ProfileContactModal.tsx - Exact pattern replicated
 *
 * GOVERNANCE:
 * - Uses branded BizModal from @/components/BizModal (governance mandate)
 * - CSRF protection via useProfileReview hook (fetchWithCsrf)
 * - Client Component ('use client')
 * - ErrorBoundary wrapper export pattern
 * - Auth guard: shows login prompt if user not authenticated
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import BizModal from '@/components/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { useProfileReview } from '../hooks/useProfileReview';
import { CheckCircle, Camera, Video } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { ProfileContactType } from '@core/types/content-contact-proposal';

// ============================================================================
// Props
// ============================================================================

interface ProfileReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileType: ProfileContactType;
  profileId: number;
  profileName: string;
  onReviewSubmitted?: () => void;
}

// ============================================================================
// Type Options
// ============================================================================

const AM_CAMPAIGN_OPTIONS = [
  { value: 'Content Creation', label: 'Content Creation' },
  { value: 'SEO', label: 'SEO' },
  { value: 'Social Media', label: 'Social Media' },
  { value: 'Email Marketing', label: 'Email Marketing' },
  { value: 'PPC', label: 'PPC' },
  { value: 'Other', label: 'Other' },
];

const IP_COLLABORATION_OPTIONS = [
  { value: 'Sponsored Post', label: 'Sponsored Post' },
  { value: 'Brand Ambassador', label: 'Brand Ambassador' },
  { value: 'Product Review', label: 'Product Review' },
  { value: 'Guest Appearance', label: 'Guest Appearance' },
  { value: 'Content Series', label: 'Content Series' },
  { value: 'Other', label: 'Other' },
];

const POD_EPISODE_OPTIONS = [
  { value: 'Sponsorship', label: 'Sponsorship' },
  { value: 'Guest Booking', label: 'Guest Booking' },
  { value: 'Listener', label: 'Regular Listener' },
  { value: 'Guest Appearance', label: 'Guest Appearance' },
  { value: 'Other', label: 'Other' },
];

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

// ============================================================================
// Component (Inner)
// ============================================================================

function ProfileReviewModalContent({
  isOpen,
  onClose,
  profileType,
  profileId,
  profileName,
  onReviewSubmitted,
}: ProfileReviewModalProps) {
  const { user } = useAuth();
  const { submitReview, isLoading, error, reset } = useProfileReview();

  const isAffiliate = profileType === 'affiliate_marketer';
  const isPodcaster = profileType === 'podcaster';
  const typeOptions = isAffiliate
    ? AM_CAMPAIGN_OPTIONS
    : isPodcaster
      ? POD_EPISODE_OPTIONS
      : IP_COLLABORATION_OPTIONS;
  const typeLabel = isAffiliate ? 'Campaign Type' : isPodcaster ? 'How do you know this podcast?' : 'Collaboration Type';

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [typeValue, setTypeValue] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Media state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const MAX_TEXT_LENGTH = 2000;
  const MIN_TEXT_LENGTH = 20;

  const isValid = rating >= 1 && rating <= 5 && (
    !reviewText.trim() || reviewText.trim().length >= MIN_TEXT_LENGTH
  );

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setRating(0);
      setHoverRating(0);
      setReviewText('');
      setTypeValue('');
      setShowSuccess(false);
      setUploadedImages([]);
      setUploadedVideo(null);
      setVideoEmbedUrl('');
      reset();
    }
  }, [isOpen, reset]);

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
        formData.append('entityId', String(profileId));
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
      formData.append('entityId', String(profileId));
      const response = await fetchWithCsrf('/api/media/upload', { method: 'POST', body: formData });
      if (response.ok) {
        const result = await response.json();
        const url = result.data?.file?.url || result.data?.file?.secure_url;
        if (url) setUploadedVideo(url);
      }
    } catch { /* skip failed upload */ }
    setIsUploading(false);
  };

  const handleSubmit = async () => {
    if (!user || !isValid || isLoading) return;

    const allMedia: string[] = [...uploadedImages];
    if (uploadedVideo) allMedia.push(uploadedVideo);
    if (videoEmbedUrl.trim()) allMedia.push(videoEmbedUrl.trim());

    const payload: { rating: number; review_text?: string; campaign_type?: string; collaboration_type?: string; episode_reference?: string; images?: string[] } = {
      rating,
      review_text: reviewText.trim() || undefined,
      ...(allMedia.length > 0 && { images: allMedia }),
    };

    if (isAffiliate && typeValue) {
      payload.campaign_type = typeValue;
    } else if (isPodcaster && typeValue) {
      payload.episode_reference = typeValue;
    } else if (!isAffiliate && !isPodcaster && typeValue) {
      payload.collaboration_type = typeValue;
    }

    const success = await submitReview(profileType, profileId, payload);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        onReviewSubmitted?.();
        onClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const isSubmitDisabled = isLoading || !isValid || showSuccess || !user;
  const displayRating = hoverRating || rating;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Review ${profileName}`}
      subtitle="Share your experience"
      maxWidth="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
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
            {isLoading ? 'Submitting...' : 'Submit Review'}
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

        {/* Star Rating */}
        {user && !showSuccess && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={isLoading}
                    className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed"
                  >
                    <svg
                      className={`w-8 h-8 ${star <= displayRating ? 'text-amber-400' : 'text-gray-300'} transition-colors`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                {displayRating > 0 && (
                  <span className="ml-2 text-sm text-gray-600 font-medium">
                    {STAR_LABELS[displayRating - 1]}
                  </span>
                )}
              </div>
              {rating === 0 && (
                <p className="mt-1 text-xs text-gray-500">Click a star to rate</p>
              )}
            </div>

            {/* Type Selector */}
            <div>
              <label htmlFor="reviewType" className="block text-sm font-medium text-gray-700 mb-2">
                {typeLabel} <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="reviewType"
                value={typeValue}
                onChange={(e) => setTypeValue(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select type...</option>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Review Text */}
            <div>
              <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700 mb-2">
                Review <span className="text-gray-400 font-normal">(optional, min {MIN_TEXT_LENGTH} chars)</span>
              </label>
              <textarea
                id="reviewText"
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={MAX_TEXT_LENGTH}
                placeholder="Share your experience..."
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between items-center mt-1">
                {reviewText.trim().length > 0 && reviewText.trim().length < MIN_TEXT_LENGTH ? (
                  <p className="text-xs text-red-500">Minimum {MIN_TEXT_LENGTH} characters</p>
                ) : (
                  <span />
                )}
                <p
                  className={`text-xs font-medium ${
                    reviewText.length > MAX_TEXT_LENGTH - 100 ? 'text-orange-600' : 'text-gray-500'
                  }`}
                >
                  {reviewText.length}/{MAX_TEXT_LENGTH}
                </p>
              </div>
            </div>

            {/* Image upload */}
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
                    disabled={isUploading || isLoading}
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  />
                </label>
              )}
            </div>

            {/* Video upload */}
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
                    disabled={isUploading || isLoading}
                    onChange={handleVideoUpload}
                  />
                </label>
              )}
            </div>

            {/* Video embed URL (only when no uploaded video) */}
            {!uploadedVideo && (
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
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            )}
          </>
        )}

        {/* Error Display */}
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

export function ProfileReviewModal(props: ProfileReviewModalProps) {
  return (
    <ErrorBoundary componentName="ProfileReviewModal">
      <ProfileReviewModalContent {...props} />
    </ErrorBoundary>
  );
}
