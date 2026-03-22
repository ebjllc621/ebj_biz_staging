/**
 * useMediaManagerLite - Core State Management Hook
 *
 * Manages:
 * - View navigation (grid ↔ feature)
 * - Listing data (gallery, logo, cover, video_gallery columns)
 * - Attachments (listing_attachments table via API)
 * - CRUD operations for all media features
 * - Feature summaries for grid view
 *
 * @tier ADVANCED
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 * @authority docs/media/galleryformat/phases/PHASE_5_MEDIA_MANAGER_LITE_BRAIN_PLAN.md
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';
import { fetchWithCsrf } from '@core/utils/csrf';
import { safeJsonParse } from '@core/utils/bigint';
import { FEATURE_CONFIGS, getFeatureTierLimit } from '../config/feature-media-configs';
import type {
  MediaManagerLiteView,
  MediaFeatureKey,
  FeatureMediaItem,
  FeatureSummary
} from '../types/media-manager-lite-types';
import type { ListingAttachmentRow } from '@core/types/db-rows';

// ============================================================================
// TYPES
// ============================================================================

export interface UseMediaManagerLiteOptions {
  listingId: number;
}

export interface UseMediaManagerLiteResult {
  // View navigation
  currentView: MediaManagerLiteView;
  selectedFeature: MediaFeatureKey | null;
  navigateToFeature: (_key: MediaFeatureKey) => void;
  navigateToGrid: () => void;

  // Listing data
  listing: ReturnType<typeof useListingData>['listing'];
  isLoading: boolean;
  error: string | null;

  // Feature summaries (grid view)
  featureSummaries: FeatureSummary[];

  // Feature media items (feature view)
  featureMedia: FeatureMediaItem[];
  isLoadingMedia: boolean;

  // Mutations for listing-column features
  addMedia: (_featureKey: MediaFeatureKey, _url: string) => Promise<void>;
  removeMedia: (_featureKey: MediaFeatureKey, _itemId: string | number) => Promise<void>;
  reorderMedia: (_featureKey: MediaFeatureKey, _orderedIds: (string | number)[]) => Promise<void>;
  replaceMedia: (_featureKey: MediaFeatureKey, _url: string) => Promise<void>;

  // SEO mutations
  updateMediaSEO: (_mediaFileId: number, _altText: string, _titleText: string) => Promise<boolean>;

  // Attachments
  attachments: ListingAttachmentRow[];
  isLoadingAttachments: boolean;
  deleteAttachment: (_attachmentId: number) => Promise<void>;
  refreshAttachments: () => Promise<void>;

  // Refresh
  refreshListing: () => Promise<void>;
  isUpdating: boolean;
  updateError: string | null;
  clearUpdateError: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert listing column value to FeatureMediaItem array
 */
function columnToMediaItems(
  value: string | string[] | null | undefined,
  storagePattern: 'json-array' | 'single-url'
): FeatureMediaItem[] {
  if (storagePattern === 'single-url') {
    const url = typeof value === 'string' ? value : (Array.isArray(value) ? value[0] : null);
    if (!url) return [];
    return [{
      id: url,
      url,
      name: extractFilename(url),
      seoComplete: false
    }];
  }

  // json-array
  const urls = safeJsonParse<string[]>(value as string | null, []);
  return urls.map((url) => ({
    id: url,
    url,
    name: extractFilename(url),
    seoComplete: false
  }));
}

/**
 * Extract a display name from a URL
 */
function extractFilename(url: string): string {
  try {
    const parts = url.split('/');
    const last = parts[parts.length - 1] ?? '';
    return last.split('?')[0] ?? 'media';
  } catch {
    return 'media';
  }
}

/**
 * Convert ListingAttachmentRow to FeatureMediaItem
 */
function attachmentToMediaItem(row: ListingAttachmentRow): FeatureMediaItem {
  return {
    id: row.id,
    url: row.url,
    name: row.display_name,
    altText: row.alt_text ?? undefined,
    mimeType: row.file_type ?? undefined,
    fileSize: row.file_size,
    seoComplete: !!(row.alt_text && row.alt_text.trim())
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useMediaManagerLite({ listingId }: UseMediaManagerLiteOptions): UseMediaManagerLiteResult {
  // View state
  const [currentView, setCurrentView] = useState<MediaManagerLiteView>('grid');
  const [selectedFeature, setSelectedFeature] = useState<MediaFeatureKey | null>(null);

  // Listing data via existing hooks
  const { listing, isLoading, error, refreshListing } = useListingData(listingId);
  const { updateListing, isUpdating, error: updateError, clearError: clearUpdateError } = useListingUpdate(listingId);

  // Attachments state
  const [attachments, setAttachments] = useState<ListingAttachmentRow[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  // --------------------------------------------------------------------------
  // VIEW NAVIGATION
  // --------------------------------------------------------------------------

  const navigateToFeature = useCallback((key: MediaFeatureKey) => {
    setSelectedFeature(key);
    setCurrentView('feature');
  }, []);

  const navigateToGrid = useCallback(() => {
    setSelectedFeature(null);
    setCurrentView('grid');
  }, []);

  // --------------------------------------------------------------------------
  // ATTACHMENTS
  // --------------------------------------------------------------------------

  const fetchAttachments = useCallback(async () => {
    setIsLoadingAttachments(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/attachments`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) return;
      const result = await response.json() as { data?: { attachments?: ListingAttachmentRow[] } };
      setAttachments(result.data?.attachments ?? []);
    } catch {
      // Silently fail — attachments are non-critical
    } finally {
      setIsLoadingAttachments(false);
    }
  }, [listingId]);

  // Fetch attachments when the feature view is opened for attachments
  useEffect(() => {
    if (selectedFeature === 'attachments') {
      void fetchAttachments();
    }
  }, [selectedFeature, fetchAttachments]);

  const deleteAttachment = useCallback(async (attachmentId: number) => {
    await fetchWithCsrf(`/api/listings/${listingId}/attachments`, {
      method: 'DELETE',
      body: JSON.stringify({ attachmentId })
    });
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, [listingId]);

  const refreshAttachments = useCallback(async () => {
    await fetchAttachments();
  }, [fetchAttachments]);

  // --------------------------------------------------------------------------
  // FEATURE MEDIA (current feature view items)
  // --------------------------------------------------------------------------

  const featureMedia = useMemo<FeatureMediaItem[]>(() => {
    if (!selectedFeature || !listing) return [];

    const config = FEATURE_CONFIGS.find(f => f.key === selectedFeature);
    if (!config) return [];

    if (config.storagePattern === 'table') {
      return attachments.map(attachmentToMediaItem);
    }

    const columnValue = listing[config.listingColumn as keyof typeof listing] as string | null;
    return columnToMediaItems(columnValue, config.storagePattern);
  }, [selectedFeature, listing, attachments]);

  const isLoadingMedia = selectedFeature === 'attachments' ? isLoadingAttachments : false;

  // --------------------------------------------------------------------------
  // FEATURE SUMMARIES (grid view)
  // --------------------------------------------------------------------------

  const featureSummaries = useMemo<FeatureSummary[]>(() => {
    const tier = listing?.tier ?? 'essentials';

    return FEATURE_CONFIGS.map((config) => {
      const maxCount = getFeatureTierLimit(config, tier);
      let currentCount = 0;
      let seoCompleteCount = 0;
      let seoTotalCount = 0;

      if (config.storagePattern === 'table') {
        currentCount = attachments.length;
        seoTotalCount = attachments.length;
        seoCompleteCount = attachments.filter(a => a.alt_text && a.alt_text.trim()).length;
      } else if (config.storagePattern === 'json-array') {
        const columnValue = listing?.[config.listingColumn as keyof typeof listing] as string | null;
        const urls = safeJsonParse<string[]>(columnValue, []);
        currentCount = urls.length;
        seoTotalCount = 0; // SEO not tracked for listing-column items
        seoCompleteCount = 0;
      } else if (config.storagePattern === 'single-url') {
        const columnValue = listing?.[config.listingColumn as keyof typeof listing] as string | null;
        currentCount = columnValue ? 1 : 0;
        seoTotalCount = 0;
        seoCompleteCount = 0;
      }

      return {
        config,
        currentCount,
        maxCount,
        seoCompleteCount,
        seoTotalCount
      };
    });
  }, [listing, attachments]);

  // --------------------------------------------------------------------------
  // MUTATIONS - listing-column features
  // --------------------------------------------------------------------------

  const addMedia = useCallback(async (featureKey: MediaFeatureKey, url: string) => {
    if (!listing) return;

    const config = FEATURE_CONFIGS.find(f => f.key === featureKey);
    if (!config || !config.listingColumn) return;

    if (config.storagePattern === 'single-url') {
      await updateListing({ [config.listingColumn]: url });
    } else if (config.storagePattern === 'json-array') {
      const current = safeJsonParse<string[]>(
        listing[config.listingColumn as keyof typeof listing] as string | null,
        []
      );
      const updated = [...current, url];
      await updateListing({ [config.listingColumn]: updated });
    }

    await refreshListing();
  }, [listing, updateListing, refreshListing]);

  const removeMedia = useCallback(async (featureKey: MediaFeatureKey, itemId: string | number) => {
    if (!listing) return;

    const config = FEATURE_CONFIGS.find(f => f.key === featureKey);
    if (!config || !config.listingColumn) return;

    if (config.storagePattern === 'single-url') {
      await updateListing({ [config.listingColumn]: null });
    } else if (config.storagePattern === 'json-array') {
      const current = safeJsonParse<string[]>(
        listing[config.listingColumn as keyof typeof listing] as string | null,
        []
      );
      const updated = current.filter(url => url !== itemId);
      await updateListing({ [config.listingColumn]: updated });
    }

    await refreshListing();
  }, [listing, updateListing, refreshListing]);

  const reorderMedia = useCallback(async (featureKey: MediaFeatureKey, orderedIds: (string | number)[]) => {
    if (!listing) return;

    const config = FEATURE_CONFIGS.find(f => f.key === featureKey);
    if (!config || !config.listingColumn || config.storagePattern !== 'json-array') return;

    const orderedUrls = orderedIds.map(id => String(id));
    await updateListing({ [config.listingColumn]: orderedUrls });
    await refreshListing();
  }, [listing, updateListing, refreshListing]);

  const replaceMedia = useCallback(async (featureKey: MediaFeatureKey, url: string) => {
    await addMedia(featureKey, url);
  }, [addMedia]);

  // --------------------------------------------------------------------------
  // SEO MUTATIONS
  // --------------------------------------------------------------------------

  const updateMediaSEO = useCallback(async (mediaFileId: number, altText: string, titleText: string): Promise<boolean> => {
    try {
      const response = await fetchWithCsrf(`/api/media/${mediaFileId}/seo`, {
        method: 'PUT',
        body: JSON.stringify({ altText, titleText })
      });
      if (!response.ok) return false;
      return true;
    } catch {
      return false;
    }
  }, []);

  // --------------------------------------------------------------------------
  // RETURN
  // --------------------------------------------------------------------------

  return {
    currentView,
    selectedFeature,
    navigateToFeature,
    navigateToGrid,

    listing,
    isLoading,
    error,

    featureSummaries,

    featureMedia,
    isLoadingMedia,

    addMedia,
    removeMedia,
    reorderMedia,
    replaceMedia,
    updateMediaSEO,

    attachments,
    isLoadingAttachments,
    deleteAttachment,
    refreshAttachments,

    refreshListing,
    isUpdating,
    updateError,
    clearUpdateError
  };
}

export default useMediaManagerLite;
