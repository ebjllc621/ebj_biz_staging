/**
 * useListingUpdate - Shared Hook for Listing Updates
 *
 * @description Provides reusable listing update functionality with error handling
 * @hook Custom Hook
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_7_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use fetchWithCsrf for mutations
 * - MUST use credentials: 'include' for authenticated requests
 * - Provides loading, error states for UI feedback
 * - Does NOT refresh context automatically (caller's responsibility)
 *
 * USAGE:
 * ```tsx
 * const { updateListing, isUpdating, error, clearError } = useListingUpdate(listingId);
 * await updateListing({ name: 'New Name', slogan: 'New Slogan' });
 * ```
 */
'use client';

import { useState, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPES
// ============================================================================

interface UpdateListingPayload {
  // Quick Facts
  name?: string;
  slug?: string;
  type?: string;
  year_established?: number | null;
  slogan?: string;

  // Categories
  keywords?: string[];
  active_categories?: number[];
  bank_categories?: number[];
  category_ids?: number[];

  // Description
  description?: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;

  // Hours (API format: only includes open days with open/close times)
  business_hours?: Array<{
    day: string;
    open: string;
    close: string;
  }>;

  // Hours of operation - separate DB columns (migration 036)
  hours_status?: 'timetable' | '24-7' | 'closed';
  timezone?: string;

  // Social Links
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
  };

  // Gallery
  gallery_images?: string[];

  // Public contact fields (synced with listing details page)
  phone?: string;
  email?: string;
  website?: string;

  // Contact Info (Owner/Manager) - Phase 11
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;

  // SEO - Phase 11
  meta_title?: string;
  meta_description?: string;

  // Media embeds (null clears the field)
  video_url?: string | null;
  audio_url?: string | null;

  // Video gallery
  video_gallery?: string[];
  video_gallery_layout?: string;
  combine_video_gallery?: boolean;
}

interface UseListingUpdateReturn {
  /** Update listing with partial payload */
  // eslint-disable-next-line no-unused-vars
  updateListing: (payload: UpdateListingPayload) => Promise<void>;
  /** Whether update is in progress */
  isUpdating: boolean;
  /** Error message (null if no error) */
  error: string | null;
  /** Clear error state */
  clearError: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useListingUpdate - Shared listing update hook
 *
 * Provides reusable update logic with loading and error states.
 * Caller MUST refresh ListingContext after successful update.
 *
 * @param listingId - Listing ID to update
 * @returns Update function and state
 *
 * @example
 * ```tsx
 * const { updateListing, isUpdating, error } = useListingUpdate(selectedListingId);
 * const { refreshListings } = useListingContext();
 *
 * const handleSave = async () => {
 *   try {
 *     await updateListing({ name: formData.name });
 *     await refreshListings(); // Refresh context
 *     setIsEditing(false);
 *   } catch (err) {
 *     // Error already set in hook
 *   }
 * };
 * ```
 */
export function useListingUpdate(listingId: number | null): UseListingUpdateReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateListing = useCallback(async (payload: UpdateListingPayload) => {
    if (!listingId) {
      setError('No listing selected');
      throw new Error('No listing selected');
    }

    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetchWithCsrf(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update listing');
      }

      // Success - no error
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update listing';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [listingId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    updateListing,
    isUpdating,
    error,
    clearError
  };
}
