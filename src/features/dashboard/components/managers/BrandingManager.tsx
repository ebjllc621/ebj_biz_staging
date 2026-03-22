/**
 * BrandingManager - Manage Logo, Cover Image & SEO Metadata
 *
 * @description Edit logo and cover image with upload, crop, and Cloudinary save workflow.
 *   SEO metadata (alt text, title) inline below each image, saved to DB + pushed to Cloudinary.
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase Branding - Listing Manager Branding Page
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_BRANDING_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for edit/save buttons
 * - Uses useListingData hook to fetch FULL listing data
 * - Uses useListingUpdate hook for listing field mutations
 * - Upload flow replicates EditListingModal useListingUpdate pattern
 * - SEO metadata flow replicates DescriptionManager EmbedPanel pattern
 * - Reuses ImageUploadArea + ImageCropperModal from NewListingModal
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Save, AlertCircle, Check } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { fetchWithCsrf, fetchCsrfToken } from '@core/utils/csrf';
import ImageUploadArea from '@features/listings/components/NewListingModal/components/ImageUploadArea';
import { ImageCropperModal } from '@features/listings/components/NewListingModal/shared/ImageCropper';

// ============================================================================
// TYPES
// ============================================================================

interface SeoState {
  altText: string;
  titleText: string;
  showFields: boolean;
  isSaving: boolean;
  savedUrl: string;
}

const DEFAULT_SEO_STATE: SeoState = {
  altText: '',
  titleText: '',
  showFields: false,
  isSaving: false,
  savedUrl: '',
};

// ============================================================================
// SEO METADATA INLINE COMPONENT
// (Replicates DescriptionManager EmbedPanel SEO pattern)
// ============================================================================

interface SeoMetadataFieldsProps {
  imageUrl: string | null;
  seoState: SeoState;
  onAltTextChange: (value: string) => void;
  onTitleTextChange: (value: string) => void;
  onToggleFields: () => void;
  onSave: () => void;
}

function SeoMetadataFields({
  imageUrl,
  seoState,
  onAltTextChange,
  onTitleTextChange,
  onToggleFields,
  onSave,
}: SeoMetadataFieldsProps) {
  if (!imageUrl) return null;

  return (
    <div className="mt-3 border-t border-gray-200/60 pt-2">
      <button
        type="button"
        onClick={onToggleFields}
        className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        {seoState.showFields ? 'Hide' : 'Edit'} SEO Metadata
      </button>
      {seoState.showFields && (
        <div className="mt-2 space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Alt Text <span className="text-gray-400">(describes the content for accessibility)</span>
            </label>
            <input
              type="text"
              value={seoState.altText}
              onChange={(e) => onAltTextChange(e.target.value)}
              maxLength={255}
              placeholder="Describe what this image shows..."
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title <span className="text-gray-400">(displayed on hover, used by search engines)</span>
            </label>
            <input
              type="text"
              value={seoState.titleText}
              onChange={(e) => onTitleTextChange(e.target.value)}
              maxLength={60}
              placeholder="Brief title for this image..."
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white"
            />
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={seoState.isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md hover:bg-[#d55a31] transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#ed6437' }}
          >
            {seoState.isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {seoState.isSaving ? 'Saving...' : 'Save SEO'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function BrandingManagerContent() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading, error: loadError, refreshListing } = useListingData(selectedListingId);

  // Image display URLs (Cloudinary URL or data URL after crop)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // File objects for Cloudinary upload (populated after cropping)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Blob URLs for cropper source (revoked on unmount)
  const [uploadedImages, setUploadedImages] = useState<{ logo?: string; cover?: string }>({});

  // Cropper modal state
  const [cropperState, setCropperState] = useState<{
    isOpen: boolean;
    context: 'logo' | 'cover' | null;
  }>({ isOpen: false, context: null });

  // SEO metadata state (per image)
  const [logoSeo, setLogoSeo] = useState<SeoState>({ ...DEFAULT_SEO_STATE });
  const [coverSeo, setCoverSeo] = useState<SeoState>({ ...DEFAULT_SEO_STATE });

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ========================================================================
  // Initialize from listing data
  // ========================================================================

  useEffect(() => {
    if (listing) {
      setLogoUrl(listing.logo_url);
      setCoverImageUrl(listing.cover_image_url);
      setLogoFile(null);
      setCoverFile(null);
      setHasChanges(false);
      setSaveSuccess(false);
    }
  }, [listing]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (uploadedImages.logo) URL.revokeObjectURL(uploadedImages.logo);
      if (uploadedImages.cover) URL.revokeObjectURL(uploadedImages.cover);
    };
  }, [uploadedImages]);

  // ========================================================================
  // Load SEO metadata for images (DescriptionManager EmbedPanel pattern)
  // ========================================================================

  useEffect(() => {
    const url = listing?.logo_url;
    if (!url || url === logoSeo.savedUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithCsrf('/api/media/by-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ urls: [url] }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const items = data?.data?.items ?? data?.items ?? [];
        const item = items[0];
        if (item && !cancelled) {
          setLogoSeo(prev => ({
            ...prev,
            altText: item.altText || '',
            titleText: item.titleText || '',
            savedUrl: url,
          }));
        }
      } catch {
        // Non-critical
      }
    })();
    return () => { cancelled = true; };
  }, [listing?.logo_url, logoSeo.savedUrl]);

  useEffect(() => {
    const url = listing?.cover_image_url;
    if (!url || url === coverSeo.savedUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithCsrf('/api/media/by-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ urls: [url] }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const items = data?.data?.items ?? data?.items ?? [];
        const item = items[0];
        if (item && !cancelled) {
          setCoverSeo(prev => ({
            ...prev,
            altText: item.altText || '',
            titleText: item.titleText || '',
            savedUrl: url,
          }));
        }
      } catch {
        // Non-critical
      }
    })();
    return () => { cancelled = true; };
  }, [listing?.cover_image_url, coverSeo.savedUrl]);

  // ========================================================================
  // Image upload handlers (Section5Media pattern)
  // ========================================================================

  const handleLogoSelect = useCallback((file: File) => {
    const blobUrl = URL.createObjectURL(file);
    setUploadedImages(prev => ({ ...prev, logo: blobUrl }));
    setCropperState({ isOpen: true, context: 'logo' });
  }, []);

  const handleCoverSelect = useCallback((file: File) => {
    const blobUrl = URL.createObjectURL(file);
    setUploadedImages(prev => ({ ...prev, cover: blobUrl }));
    setCropperState({ isOpen: true, context: 'cover' });
  }, []);

  const handleCropperApply = useCallback(async (croppedImageDataUrl: string) => {
    const response = await fetch(croppedImageDataUrl);
    const blob = await response.blob();
    const timestamp = Date.now();

    if (cropperState.context === 'logo') {
      const file = new File([blob], `logo-${timestamp}.png`, { type: 'image/png' });
      setLogoUrl(croppedImageDataUrl);
      setLogoFile(file);
    } else if (cropperState.context === 'cover') {
      const file = new File([blob], `cover-${timestamp}.png`, { type: 'image/png' });
      setCoverImageUrl(croppedImageDataUrl);
      setCoverFile(file);
    }

    setHasChanges(true);
    setSaveSuccess(false);
  }, [cropperState.context]);

  const handleCropperClose = useCallback(() => {
    setCropperState({ isOpen: false, context: null });
  }, []);

  const handleLogoRemove = useCallback(() => {
    if (uploadedImages.logo) URL.revokeObjectURL(uploadedImages.logo);
    setUploadedImages(prev => ({ ...prev, logo: undefined }));
    setLogoUrl(null);
    setLogoFile(null);
    setHasChanges(true);
    setSaveSuccess(false);
  }, [uploadedImages.logo]);

  const handleCoverRemove = useCallback(() => {
    if (uploadedImages.cover) URL.revokeObjectURL(uploadedImages.cover);
    setUploadedImages(prev => ({ ...prev, cover: undefined }));
    setCoverImageUrl(null);
    setCoverFile(null);
    setHasChanges(true);
    setSaveSuccess(false);
  }, [uploadedImages.cover]);

  // ========================================================================
  // SEO metadata save (DescriptionManager handleSaveSeo pattern)
  // ========================================================================

  const handleSaveSeo = useCallback(async (
    url: string,
    altText: string,
    titleText: string,
    setSeo: React.Dispatch<React.SetStateAction<SeoState>>
  ) => {
    if (!url) return;
    setSeo(prev => ({ ...prev, isSaving: true }));
    try {
      // Step 1: Look up or auto-register media record
      const lookupRes = await fetchWithCsrf('/api/media/by-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ urls: [url] }),
      });
      if (!lookupRes.ok) return;
      const lookupData = await lookupRes.json();
      const items = lookupData?.data?.items ?? lookupData?.items ?? [];
      const mediaItem = items[0];
      if (!mediaItem?.fileId) return;

      // Step 2: Save SEO metadata (pushes to Cloudinary context via service)
      await fetchWithCsrf(`/api/media/${mediaItem.fileId}/seo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          altText: altText.trim(),
          titleText: titleText.trim(),
        }),
      });
      setSeo(prev => ({ ...prev, savedUrl: url }));
    } catch {
      // Non-critical
    } finally {
      setSeo(prev => ({ ...prev, isSaving: false }));
    }
  }, []);

  const handleSaveLogoSeo = useCallback(() => {
    const url = logoUrl;
    if (url) handleSaveSeo(url, logoSeo.altText, logoSeo.titleText, setLogoSeo);
  }, [logoUrl, logoSeo.altText, logoSeo.titleText, handleSaveSeo]);

  const handleSaveCoverSeo = useCallback(() => {
    const url = coverImageUrl;
    if (url) handleSaveSeo(url, coverSeo.altText, coverSeo.titleText, setCoverSeo);
  }, [coverImageUrl, coverSeo.altText, coverSeo.titleText, handleSaveSeo]);

  // ========================================================================
  // Save images (upload to Cloudinary + update listing)
  // Replicates EditListingModal useListingUpdate upload pattern
  // ========================================================================

  const handleSave = useCallback(async () => {
    if (!selectedListingId) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const csrfToken = await fetchCsrfToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: Record<string, any> = {};

      // Upload logo file if changed
      if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append('file', logoFile);
        logoFormData.append('entityType', 'listings');
        logoFormData.append('entityId', String(selectedListingId));
        logoFormData.append('mediaType', 'logo');

        const headers: HeadersInit = {};
        if (csrfToken) headers['x-csrf-token'] = csrfToken;

        const logoResponse = await fetch('/api/media/upload', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: logoFormData,
        });

        if (logoResponse.ok) {
          const logoResult = await logoResponse.json();
          const url = logoResult.data?.file?.url;
          if (url) updatePayload.logo_url = url;
        } else {
          throw new Error('Failed to upload logo');
        }
      }

      // Upload cover file if changed
      if (coverFile) {
        const coverFormData = new FormData();
        coverFormData.append('file', coverFile);
        coverFormData.append('entityType', 'listings');
        coverFormData.append('entityId', String(selectedListingId));
        coverFormData.append('mediaType', 'cover');

        const headers: HeadersInit = {};
        if (csrfToken) headers['x-csrf-token'] = csrfToken;

        const coverResponse = await fetch('/api/media/upload', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: coverFormData,
        });

        if (coverResponse.ok) {
          const coverResult = await coverResponse.json();
          const url = coverResult.data?.file?.url;
          if (url) updatePayload.cover_image_url = url;
        } else {
          throw new Error('Failed to upload cover image');
        }
      }

      // Handle removal (set to null)
      if (!logoUrl && listing?.logo_url) {
        updatePayload.logo_url = null;
      }
      if (!coverImageUrl && listing?.cover_image_url) {
        updatePayload.cover_image_url = null;
      }

      // Only update if there are changes
      if (Object.keys(updatePayload).length > 0) {
        const response = await fetchWithCsrf(`/api/listings/${selectedListingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Failed to update listing (${response.status})`);
        }
      }

      // Success
      setLogoFile(null);
      setCoverFile(null);
      setHasChanges(false);
      setSaveSuccess(true);
      await refreshListing();
      await refreshListings();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [selectedListingId, logoFile, coverFile, logoUrl, coverImageUrl, listing, refreshListing, refreshListings]);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#ed6437]" />
        <span className="ml-2 text-gray-600">Loading branding data...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <p className="text-sm text-red-700">{loadError}</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Select a listing to manage branding.</p>
      </div>
    );
  }

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
            currentImage={logoUrl}
            onImageSelect={handleLogoSelect}
            onRemove={handleLogoRemove}
            context="logo"
            sizeSpecs={"Recommended: 300\u00d7300px\nMinimum: 150\u00d7150px"}
          />
          <p className="mt-3 text-xs text-gray-600">
            <span className="text-[#ed6437] font-medium">Logo Tips:</span> Use a clear, high-contrast logo that works on both light and dark backgrounds. Square format works best. Your logo appears up to 176px on hero banners and 64px in listing cards.
          </p>

          {/* Logo SEO Metadata */}
          <SeoMetadataFields
            imageUrl={logoUrl}
            seoState={logoSeo}
            onAltTextChange={(v) => setLogoSeo(prev => ({ ...prev, altText: v }))}
            onTitleTextChange={(v) => setLogoSeo(prev => ({ ...prev, titleText: v }))}
            onToggleFields={() => setLogoSeo(prev => ({ ...prev, showFields: !prev.showFields }))}
            onSave={handleSaveLogoSeo}
          />
        </div>

        {/* Cover Image Upload */}
        <div>
          <ImageUploadArea
            label="Cover Image"
            currentImage={coverImageUrl}
            onImageSelect={handleCoverSelect}
            onRemove={handleCoverRemove}
            context="cover"
            sizeSpecs={"Hero Banner: 1920\u00d7600px\nRecommended: 1920\u00d7900px+"}
          />
          <p className="mt-3 text-xs text-gray-600">
            <span className="text-[#ed6437] font-medium">Cover Image Tips:</span> Use a high-quality image that represents your business. This appears as your hero banner at 1920×600px on desktop. Landscape format with 3.2:1 aspect ratio works best.
          </p>

          {/* Cover SEO Metadata */}
          <SeoMetadataFields
            imageUrl={coverImageUrl}
            seoState={coverSeo}
            onAltTextChange={(v) => setCoverSeo(prev => ({ ...prev, altText: v }))}
            onTitleTextChange={(v) => setCoverSeo(prev => ({ ...prev, titleText: v }))}
            onToggleFields={() => setCoverSeo(prev => ({ ...prev, showFields: !prev.showFields }))}
            onSave={handleSaveCoverSeo}
          />
        </div>
      </div>

      {/* Save Changes Button (only when images changed) */}
      {hasChanges && (
        <div className="pt-4 border-t border-gray-200">
          {saveError && (
            <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#ed6437' }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

      {/* Success message */}
      {saveSuccess && !hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">Branding updated successfully!</p>
        </div>
      )}

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

// ============================================================================
// EXPORTED COMPONENT (ErrorBoundary wrapped - ADVANCED tier)
// ============================================================================

export function BrandingManager() {
  return (
    <ErrorBoundary componentName="BrandingManager" fallback={<div className="p-4 text-red-600">Failed to load branding manager.</div>}>
      <BrandingManagerContent />
    </ErrorBoundary>
  );
}
