/**
 * NewListingModal - Section 5: Media Uploads
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 5 - Full Implementation
 *
 * FEATURES:
 * - Interactive image croppers (logo + cover)
 * - Drag-and-drop upload areas
 * - Live preview with desktop/mobile toggle
 * - Video and audio URL inputs
 * - URL validation
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ListingFormData, ListingTier, TierLimits } from '../../../types/listing-form.types';
import ImageUploadArea from '../components/ImageUploadArea';
import { ImageCropperModal } from '../shared/ImageCropper';
import { ListingHeroPreview } from '../shared/ListingPreview';

// ============================================================================
// TYPES
// ============================================================================

export interface Section5MediaProps {
  formData: ListingFormData;
  onUpdateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  onUpdateSection: (data: Partial<ListingFormData>) => void;
  tier: ListingTier;
  tierLimits: TierLimits;
}

// ============================================================================
// URL VALIDATION
// ============================================================================

const isValidVideoUrl = (url: string): boolean => {
  if (!url) return true;
  const videoPatterns = [
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    /^https?:\/\/(www\.)?vimeo\.com\/.+/i,
    /^https?:\/\/(www\.)?dailymotion\.com\/.+/i,
    /^https?:\/\/.+\.(mp4|webm|mov)$/i,
  ];
  return videoPatterns.some(pattern => pattern.test(url));
};

const isValidAudioUrl = (url: string): boolean => {
  if (!url) return true;
  const audioPatterns = [
    /^https?:\/\/(www\.)?soundcloud\.com\/.+/i,
    /^https?:\/\/open\.spotify\.com\/.+/i,
    /^https?:\/\/(www\.)?podcasts?\..+/i,
    /^https?:\/\/.+\.(mp3|wav|ogg|m4a)$/i,
  ];
  return audioPatterns.some(pattern => pattern.test(url));
};

// ============================================================================
// COMPONENT
// ============================================================================

export function Section5Media({
  formData,
  onUpdateField,
  tier,
}: Section5MediaProps) {
  // Component-level state for uploaded images (blob URLs)
  const [uploadedImages, setUploadedImages] = useState<{
    logo?: string;
    cover?: string;
  }>({});

  // Cropper modal state
  const [cropperState, setCropperState] = useState<{
    isOpen: boolean;
    context: 'logo' | 'cover' | null;
  }>({ isOpen: false, context: null });

  // Video/Audio URL validation errors
  const [videoError, setVideoError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (uploadedImages.logo) URL.revokeObjectURL(uploadedImages.logo);
      if (uploadedImages.cover) URL.revokeObjectURL(uploadedImages.cover);
    };
  }, [uploadedImages]);

  // Handle logo upload
  const handleLogoSelect = useCallback((file: File) => {
    const blobUrl = URL.createObjectURL(file);
    setUploadedImages(prev => ({
      ...prev,
      logo: blobUrl
    }));
    setCropperState({ isOpen: true, context: 'logo' });
  }, []);

  // Handle cover image upload
  const handleCoverSelect = useCallback((file: File) => {
    const blobUrl = URL.createObjectURL(file);
    setUploadedImages(prev => ({
      ...prev,
      cover: blobUrl
    }));
    setCropperState({ isOpen: true, context: 'cover' });
  }, []);

  // Handle cropper apply - stores both data URL (for preview) and File (for upload)
  const handleCropperApply = useCallback(async (croppedImageDataUrl: string) => {
    // Convert data URL to File for Cloudinary upload
    const response = await fetch(croppedImageDataUrl);
    const blob = await response.blob();
    const timestamp = Date.now();

    if (cropperState.context === 'logo') {
      const file = new File([blob], `logo-${timestamp}.png`, { type: 'image/png' });
      onUpdateField('logoUrl', croppedImageDataUrl); // For preview
      onUpdateField('logoFile', file); // For Cloudinary upload
    } else if (cropperState.context === 'cover') {
      const file = new File([blob], `cover-${timestamp}.png`, { type: 'image/png' });
      onUpdateField('coverImageUrl', croppedImageDataUrl); // For preview
      onUpdateField('coverFile', file); // For Cloudinary upload
    }
  }, [cropperState.context, onUpdateField]);

  // Handle cropper close
  const handleCropperClose = useCallback(() => {
    setCropperState({ isOpen: false, context: null });
  }, []);

  // Handle logo remove
  const handleLogoRemove = useCallback(() => {
    if (uploadedImages.logo) {
      URL.revokeObjectURL(uploadedImages.logo);
    }
    setUploadedImages(prev => ({ ...prev, logo: undefined }));
    onUpdateField('logoUrl', null);
    onUpdateField('logoFile', null);
  }, [uploadedImages.logo, onUpdateField]);

  // Handle cover remove
  const handleCoverRemove = useCallback(() => {
    if (uploadedImages.cover) {
      URL.revokeObjectURL(uploadedImages.cover);
    }
    setUploadedImages(prev => ({ ...prev, cover: undefined }));
    onUpdateField('coverImageUrl', null);
    onUpdateField('coverFile', null);
  }, [uploadedImages.cover, onUpdateField]);

  // Handle video URL change
  const handleVideoUrlChange = useCallback((value: string) => {
    onUpdateField('videoUrl', value || null);
    if (value && !isValidVideoUrl(value)) {
      setVideoError('Please enter a valid video URL (YouTube, Vimeo, Dailymotion, or direct .mp4/.webm/.mov link)');
    } else {
      setVideoError(null);
    }
  }, [onUpdateField]);

  // Handle audio URL change
  const handleAudioUrlChange = useCallback((value: string) => {
    onUpdateField('audioUrl', value || null);
    if (value && !isValidAudioUrl(value)) {
      setAudioError('Please enter a valid audio URL (SoundCloud, Spotify, Podcast, or direct .mp3/.wav/.ogg/.m4a link)');
    } else {
      setAudioError(null);
    }
  }, [onUpdateField]);

  return (
    <div className="space-y-6">
      {/* Visual Media Guidelines */}
      <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <svg className="w-5 h-5 text-[#ed6437] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-[#ed6437] mb-1">Visual Media Guidelines</h4>
          <p className="text-sm text-gray-700">
            High-quality images help customers trust your business and increase engagement. Upload clear, professional photos that represent your brand.
          </p>
        </div>
      </div>

      {/* Upload Areas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <div>
          <ImageUploadArea
            label="Business Logo"
            currentImage={formData.logoUrl}
            onImageSelect={handleLogoSelect}
            onRemove={handleLogoRemove}
            context="logo"
            sizeSpecs={"Recommended: 300×300px\nMinimum: 150×150px"}
          />
          <p className="mt-3 text-xs text-gray-600">
            <span className="text-[#ed6437] font-medium">Logo Tips:</span> Use a clear, high-contrast logo that works on both light and dark backgrounds. Square format works best. Your logo appears up to 176px on hero banners and 64px in listing cards.
          </p>
        </div>

        {/* Cover Image Upload */}
        <div>
          <ImageUploadArea
            label="Cover Image"
            currentImage={formData.coverImageUrl}
            onImageSelect={handleCoverSelect}
            onRemove={handleCoverRemove}
            context="cover"
            sizeSpecs={"Hero Banner: 1920×600px\nRecommended: 1920×900px+"}
          />
          <p className="mt-3 text-xs text-gray-600">
            <span className="text-[#ed6437] font-medium">Cover Image Tips:</span> Use a high-quality image that represents your business. This appears as your hero banner at 1920×600px on desktop. Landscape format with 3.2:1 aspect ratio works best.
          </p>
        </div>
      </div>

      {/* Live Preview (only show when images are uploaded) */}
      {(formData.logoUrl || formData.coverImageUrl) && (
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-[#022641] mb-4">Live Preview</h3>
          <ListingHeroPreview
            name={formData.name || 'Your Business Name'}
            slogan={formData.slogan}
            type={formData.type}
            logo={formData.logoUrl}
            coverImage={formData.coverImageUrl}
            originalCoverImage={uploadedImages.cover}
            showViewToggle={true}
          />
        </div>
      )}

      {/* Additional Media */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-[#022641] mb-2">Additional Media</h3>

        {/* Video & Audio Content header with icon */}
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-100 rounded-lg mb-4">
          <svg className="w-5 h-5 text-[#ed6437] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-[#022641]">Video &amp; Audio Content:</span> Share promotional videos, virtual tours, or podcasts to showcase your business personality and expertise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Video URL */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="videoUrl" className="text-sm font-medium text-[#022641]">
                Video URL
              </label>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="url"
              id="videoUrl"
              value={formData.videoUrl || ''}
              onChange={(e) => handleVideoUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className={`w-full px-3 py-2 border ${
                videoError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-[#ed6437] focus:ring-[#ed6437]'
              } rounded-md focus:outline-none focus:ring-2 bg-gray-50`}
            />
            {videoError && (
              <p className="mt-1 text-sm text-red-600">{videoError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              YouTube, Vimeo, or other video platform links
            </p>
          </div>

          {/* Audio URL */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="audioUrl" className="text-sm font-medium text-[#022641]">
                Audio URL
              </label>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <input
              type="url"
              id="audioUrl"
              value={formData.audioUrl || ''}
              onChange={(e) => handleAudioUrlChange(e.target.value)}
              placeholder="https://soundcloud.com/..."
              className={`w-full px-3 py-2 border ${
                audioError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-[#ed6437] focus:ring-[#ed6437]'
              } rounded-md focus:outline-none focus:ring-2 bg-gray-50`}
            />
            {audioError && (
              <p className="mt-1 text-sm text-red-600">{audioError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              SoundCloud, Spotify, or podcast platform links
            </p>
          </div>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {cropperState.isOpen && cropperState.context && uploadedImages[cropperState.context] && (
        <ImageCropperModal
          isOpen={cropperState.isOpen}
          onClose={handleCropperClose}
          onApply={handleCropperApply}
          imageUrl={uploadedImages[cropperState.context]!}
          context={cropperState.context}
        />
      )}
    </div>
  );
}
