/**
 * GalleryManager - Gallery Image Management
 *
 * @description Manage gallery images with upload, delete, reorder, crop,
 *   multi-select batch operations, right-click context menu, and SEO editing.
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Gallery Grid Enhancement - Brain Plan 3-9-26
 * @authority docs/media/galleryformat/phases/3-9-26/GALLERY_GRID_ENHANCEMENT_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY)
 * - Updates listing.gallery_images via PUT /api/listings/[id]
 * - Tier limits: essentials(6), plus(12), preferred(100), premium(100)
 * - fetchWithCsrf for all mutating API calls
 * - EnhancedImageCropperModal lazy loaded with dynamic()
 */
'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import { TierLimitBanner } from '../shared/TierLimitBanner';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { GalleryGrid } from './gallery/GalleryGrid';
import { ImageUploadModal } from './gallery/ImageUploadModal';
import { GalleryLayoutSelector } from './gallery/GalleryLayoutSelector';
import { GallerySEOEditModal } from './gallery/GallerySEOEditModal';
import { GalleryDisplay } from '@features/media/gallery';
import { Image as ImageIcon } from 'lucide-react';
import { useListingSectionLayout } from '@features/listings/hooks/useListingSectionLayout';
import type { GalleryLayout, GalleryItem } from '@features/media/gallery';
import type { GalleryImageSEOItem } from './gallery/GallerySEOEditModal';

// Lazy load EnhancedImageCropperModal (heavy dependency - only needed on edit)
const EnhancedImageCropperModal = dynamic(
  () => import('@features/listings/components/NewListingModal/shared/ImageCropper/EnhancedImageCropperModal'),
  { ssr: false }
);

// ============================================================================
// TYPES
// ============================================================================

interface TierLimits {
  essentials: number;
  plus: number;
  preferred: number;
  premium: number;
}

const GALLERY_LIMITS: TierLimits = {
  essentials: 6,
  plus: 12,
  preferred: 100,
  premium: 100
};

interface ByUrlsItem {
  url: string;
  fileId: number;
  altText: string;
  titleText: string;
  cloudinaryPublicId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

function GalleryManagerContent() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  // Base modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingImageUrl, setDeletingImageUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeLayout, setActiveLayout] = useState<GalleryLayout>(
    (listing?.gallery_layout as GalleryLayout) || 'grid'
  );

  // Sync activeLayout when listing data loads/changes
  useEffect(() => {
    if (listing?.gallery_layout) {
      setActiveLayout(listing.gallery_layout as GalleryLayout);
    }
  }, [listing?.gallery_layout]);

  // Section layout for gallery visibility toggle
  const {
    layout: sectionLayout,
    updateLayout: updateSectionLayout,
    isLoading: isLoadingLayout
  } = useListingSectionLayout({ listingId: selectedListingId!, autoLoad: !!selectedListingId });

  // Derive gallery visibility from section layout
  const isGalleryVisible = useMemo(() => {
    if (!sectionLayout) return true;
    const featuresSection = sectionLayout.sections.find(s => s.id === 'features');
    if (!featuresSection) return true;
    const galleryFeature = featuresSection.features.find(f => f.id === 'gallery');
    return galleryFeature?.visible ?? true;
  }, [sectionLayout]);

  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  const handleToggleGalleryVisibility = useCallback(async () => {
    if (!sectionLayout) return;
    setIsTogglingVisibility(true);
    try {
      const updatedSections = sectionLayout.sections.map(section => {
        if (section.id !== 'features') return section;
        return {
          ...section,
          features: section.features.map(feature => {
            if (feature.id !== 'gallery') return feature;
            return { ...feature, visible: !feature.visible };
          })
        };
      });
      await updateSectionLayout({
        ...sectionLayout,
        sections: updatedSections,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Error handled by hook
    } finally {
      setIsTogglingVisibility(false);
    }
  }, [sectionLayout, updateSectionLayout]);

  // New: image crop editing
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);

  // New: SEO modal
  const [showSEOModal, setShowSEOModal] = useState(false);
  const [seoEditUrls, setSeoEditUrls] = useState<string[]>([]);
  const [isSavingSEO, setIsSavingSEO] = useState(false);

  // New: image metadata map keyed by URL
  const [imageMetadata, setImageMetadata] = useState<Map<string, { altText?: string; titleText?: string }>>(new Map());

  const images: string[] = useMemo(() => listing?.gallery_images || [], [listing?.gallery_images]);
  const tier = listing?.tier || 'essentials';
  const limit = GALLERY_LIMITS[tier as keyof TierLimits] || 5;
  const canAddMore = images.length < limit;

  // Convert image URLs to GalleryItem[] for the layout preview
  const galleryItems: GalleryItem[] = useMemo(
    () => images.map((url: string, index: number) => ({
      id: `gallery-${index}`,
      type: 'image' as const,
      url,
      alt: imageMetadata.get(url)?.altText || `Gallery image ${index + 1}`
    })),
    [images, imageMetadata]
  );

  // ---- Fetch image metadata on mount / when images change ----
  const fetchImageMetadata = useCallback(async () => {
    if (images.length === 0) return;

    try {
      const response = await fetchWithCsrf('/api/media/by-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ urls: images }),
      });

      if (response.ok) {
        const result = await response.json() as { data?: { items?: ByUrlsItem[] } };
        const items = result.data?.items;
        if (Array.isArray(items)) {
          const map = new Map<string, { altText?: string; titleText?: string }>();
          for (const item of items) {
            map.set(item.url, {
              altText: item.altText || undefined,
              titleText: item.titleText || undefined,
            });
          }
          setImageMetadata(map);
        }
      }
    } catch {
      // Non-fatal: metadata just won't display
    }
  }, [images]);

  // Fetch metadata when listing images load or change
  useEffect(() => {
    if (images.length > 0) {
      void fetchImageMetadata();
    }
    // We intentionally depend on images.join to avoid re-running on reference equality change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.join(',')]);

  // ---- Handle add images ----
  const handleAddImages = useCallback(async (newImageUrls: string[]) => {
    if (!listing) return;

    const updatedImages = [...images, ...newImageUrls].slice(0, limit);

    try {
      await updateListing({ gallery_images: updatedImages });
      await refreshListing();
      await refreshListings();
      setShowUploadModal(false);
    } catch {
      // Error already set in hook
    }
  }, [listing, images, limit, updateListing, refreshListing, refreshListings]);

  // ---- Extract Cloudinary public_id from a Cloudinary URL ----
  // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{ver}/{public_id}.{ext}
  const extractPublicId = useCallback((url: string): string | null => {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }, []);

  // ---- Delete media files from Cloudinary by extracting public_id from URL ----
  const deleteMediaByUrls = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return;

    for (const url of urls) {
      const publicId = extractPublicId(url);
      if (!publicId) continue;

      try {
        await fetchWithCsrf(
          `/api/media/upload?fileId=${encodeURIComponent(publicId)}`,
          { method: 'DELETE', credentials: 'include' }
        );
      } catch {
        // Non-fatal: gallery array update still proceeds even if Cloudinary cleanup fails
        console.warn('[GalleryManager] Cloudinary cleanup failed for:', publicId);
      }
    }
  }, [extractPublicId]);

  // ---- Handle single delete ----
  const handleDeleteImage = useCallback(async () => {
    if (!listing || !deletingImageUrl) return;

    setIsDeleting(true);
    clearError();

    try {
      // Delete from Cloudinary + media_files table first
      await deleteMediaByUrls([deletingImageUrl]);

      const updatedImages = images.filter((url: string) => url !== deletingImageUrl);
      await updateListing({ gallery_images: updatedImages });
      await refreshListing();
      await refreshListings();
      setDeletingImageUrl(null);
    } catch {
      // Error already set in hook
    } finally {
      setIsDeleting(false);
    }
  }, [listing, deletingImageUrl, images, updateListing, refreshListing, refreshListings, clearError, deleteMediaByUrls]);

  // ---- Handle batch delete ----
  const handleDeleteBatch = useCallback(async (urls: string[]) => {
    if (!listing || urls.length === 0) return;

    clearError();

    try {
      // Delete from Cloudinary + media_files table first
      await deleteMediaByUrls(urls);

      const urlSet = new Set(urls);
      const updatedImages = images.filter((url: string) => !urlSet.has(url));
      await updateListing({ gallery_images: updatedImages });
      await refreshListing();
      await refreshListings();
    } catch {
      // Error already set in hook
    }
  }, [listing, images, updateListing, refreshListing, refreshListings, clearError, deleteMediaByUrls]);

  // ---- Handle reorder ----
  const handleReorder = useCallback(async (reorderedUrls: string[]) => {
    if (!listing) return;

    try {
      await updateListing({ gallery_images: reorderedUrls });
      await refreshListing();
      await refreshListings();
    } catch {
      // Error already set in hook
    }
  }, [listing, updateListing, refreshListing, refreshListings]);

  // ---- Handle edit image (crop) ----
  const handleEditImage = useCallback((url: string) => {
    setEditingImageUrl(url);
  }, []);

  // ---- Handle crop apply ----
  const handleCropApply = useCallback(async (croppedDataUrl: string) => {
    if (!editingImageUrl || !listing) {
      setEditingImageUrl(null);
      return;
    }

    try {
      // Convert data URL to blob then upload
      const fetchResponse = await fetch(croppedDataUrl);
      const blob = await fetchResponse.blob();
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'listings');
      formData.append('entityId', String(selectedListingId));
      formData.append('mediaType', 'gallery');

      const uploadResponse = await fetchWithCsrf('/api/media/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (uploadResponse.ok) {
        const result = await uploadResponse.json() as { data?: { file?: { url?: string } } };
        const newUrl = result.data?.file?.url;

        if (newUrl) {
          // Delete the original image from Cloudinary + media_files table
          await deleteMediaByUrls([editingImageUrl]);

          // Replace old URL with new cropped URL
          const updatedImages = images.map((url) =>
            url === editingImageUrl ? newUrl : url
          );
          await updateListing({ gallery_images: updatedImages });
          await refreshListing();
          await refreshListings();
        }
      }
    } catch {
      // Non-fatal: user stays in edit state if needed
    } finally {
      setEditingImageUrl(null);
    }
  }, [editingImageUrl, listing, selectedListingId, images, updateListing, refreshListing, refreshListings, deleteMediaByUrls]);

  // ---- Handle SEO edit ----
  const handleEditSEO = useCallback((urls: string[]) => {
    setSeoEditUrls(urls);
    setShowSEOModal(true);
  }, []);

  // ---- Handle SEO save ----
  const handleSaveSEO = useCallback(async (
    updates: Array<{ url: string; altText: string; titleText: string }>
  ) => {
    if (updates.length === 0) return;

    setIsSavingSEO(true);

    try {
      // Look up file IDs for each URL
      const urlList = updates.map((u) => u.url);
      const lookupResponse = await fetchWithCsrf('/api/media/by-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ urls: urlList }),
      });

      if (!lookupResponse.ok) {
        throw new Error('Failed to look up media file IDs.');
      }

      const lookupResult = await lookupResponse.json() as { data?: { items?: ByUrlsItem[] } };
      const items = lookupResult.data?.items ?? [];

      // Build URL -> fileId map
      const urlToFileId = new Map<string, number>();
      for (const item of items) {
        urlToFileId.set(item.url, item.fileId);
      }

      // PUT SEO update for each changed file
      const savePromises = updates.map(async (update) => {
        const fileId = urlToFileId.get(update.url);
        if (!fileId) return;

        const resp = await fetchWithCsrf(`/api/media/${fileId}/seo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            altText: update.altText,
            titleText: update.titleText,
          }),
        });

        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          const msg = (errBody as Record<string, string>).error ?? `Failed to save SEO for file ${fileId}`;
          throw new Error(msg);
        }
      });

      await Promise.all(savePromises);

      // Update local metadata map
      setImageMetadata((prev) => {
        const next = new Map(prev);
        for (const update of updates) {
          next.set(update.url, {
            altText: update.altText || undefined,
            titleText: update.titleText || undefined,
          });
        }
        return next;
      });

      setShowSEOModal(false);
    } catch (err) {
      console.error('[GalleryManager] SEO save failed:', err);
      // Modal stays open so user can retry - isSavingSEO resets in finally
    } finally {
      setIsSavingSEO(false);
    }
  }, []);

  // Derive SEO items for the modal from seoEditUrls + imageMetadata
  const seoModalImages = useMemo((): GalleryImageSEOItem[] => {
    return seoEditUrls.map((url) => {
      const meta = imageMetadata.get(url);
      return {
        url,
        altText: meta?.altText,
        titleText: meta?.titleText,
      };
    });
  }, [seoEditUrls, imageMetadata]);

  // ---- Loading state ----
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // ---- Error state ----
  if (loadError) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{loadError}</span>
        <button
          onClick={() => refreshListing()}
          className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-8 text-gray-600">
        No listing selected
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gallery Images</h2>
          <p className="text-sm text-gray-600 mt-1">
            {images.length} of {limit} images used
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          disabled={!canAddMore || isUpdating}
          className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Images
        </button>
      </div>

      {/* Gallery Visibility Toggle */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          {isGalleryVisible ? (
            <Eye className="w-5 h-5 text-green-600" />
          ) : (
            <EyeOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              Show Gallery on Listing Page
            </p>
            <p className="text-xs text-gray-500">
              {isGalleryVisible
                ? 'Gallery is visible to visitors on your listing detail page'
                : 'Gallery is hidden from visitors on your listing detail page'}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isGalleryVisible}
          aria-label="Toggle gallery visibility on listing page"
          disabled={isTogglingVisibility || isLoadingLayout}
          onClick={handleToggleGalleryVisibility}
          className={[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:ring-offset-2',
            isGalleryVisible ? 'bg-[#ed6437]' : 'bg-gray-300',
            (isTogglingVisibility || isLoadingLayout) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
              isGalleryVisible ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Gallery Layout Selector */}
      <GalleryLayoutSelector
        listingId={selectedListingId!}
        currentLayout={(listing?.gallery_layout as GalleryLayout) || 'grid'}
        onLayoutChange={async (layout) => {
          setActiveLayout(layout);
          await refreshListing();
        }}
      />

      {/* Gallery Layout Preview */}
      {galleryItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800">Layout Preview</h3>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <GalleryDisplay
              items={galleryItems}
              layout={activeLayout}
              enableLightbox={false}
              showFeaturedBadge={false}
              entityName={listing?.name || 'Gallery'}
            />
          </div>
        </div>
      )}

      {/* Tier Limit Banner */}
      <TierLimitBanner
        current={images.length}
        limit={limit}
        itemType="gallery images"
        tier={tier}
      />

      {/* Error Display */}
      {updateError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{updateError}</span>
          <button
            onClick={() => clearError()}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Manage Images Section */}
      <h3 className="text-lg font-semibold text-gray-900">Manage Images</h3>

      {images.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No Images Yet"
          description="Add photos to showcase your business and attract more customers"
          action={{
            label: 'Add First Image',
            onClick: () => setShowUploadModal(true)
          }}
        />
      ) : (
        <GalleryGrid
          images={images}
          onDelete={(url) => setDeletingImageUrl(url)}
          onDeleteBatch={handleDeleteBatch}
          onReorder={handleReorder}
          onEditImage={handleEditImage}
          onEditSEO={handleEditSEO}
          isUpdating={isUpdating}
          imageMetadata={imageMetadata}
        />
      )}

      {/* Upload Modal */}
      <ImageUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleAddImages}
        isSubmitting={isUpdating}
        maxImages={limit - images.length}
        listingId={selectedListingId!}
      />

      {/* Delete Confirmation Modal */}
      {deletingImageUrl && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingImageUrl(null)}
          onConfirm={handleDeleteImage}
          itemType="image"
          isDeleting={isDeleting}
        />
      )}

      {/* Image Crop Editor (lazy loaded) */}
      {editingImageUrl && (
        <EnhancedImageCropperModal
          isOpen={true}
          onClose={() => setEditingImageUrl(null)}
          onApply={handleCropApply}
          imageUrl={editingImageUrl}
          defaultPreset="square"
        />
      )}

      {/* SEO Edit Modal */}
      <GallerySEOEditModal
        isOpen={showSEOModal}
        onClose={() => setShowSEOModal(false)}
        images={seoModalImages}
        onSave={handleSaveSEO}
        isSaving={isSavingSEO}
      />
    </div>
  );
}

/**
 * GalleryManager - Wrapped with ErrorBoundary
 */
export function GalleryManager() {
  return (
    <ErrorBoundary componentName="GalleryManager">
      <GalleryManagerContent />
    </ErrorBoundary>
  );
}

export default GalleryManager;
