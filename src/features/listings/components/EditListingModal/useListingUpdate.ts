/**
 * useListingUpdate Hook
 *
 * @authority Phase 7 Brain Plan
 * @tier ENTERPRISE
 * @purpose Handle listing updates with CSRF protection
 *
 * FEATURES:
 * - PUT /api/listings/[id] with fetchWithCsrf
 * - Form data transformation
 * - Validation before submission
 * - Error handling
 * - Success callback
 */

'use client';

import { useState, useCallback } from 'react';
import { fetchWithCsrf, fetchCsrfToken } from '@core/utils/csrf';
import type { ListingFormData } from '../../types/listing-form.types';
import { formDataToApiUpdate } from './transforms';

// ============================================================================
// TYPES
// ============================================================================

export interface UseListingUpdateResult {
  /** Submit update */
  handleUpdate: (formData: ListingFormData) => Promise<boolean>;
  /** Updating state */
  isUpdating: boolean;
  /** Error message */
  updateError: string | null;
  /** Clear error */
  clearError: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Handle listing updates
 *
 * @param listingId - Listing ID to update
 * @param onSuccess - Optional success callback
 * @returns UseListingUpdateResult with update handler and states
 */
export function useListingUpdate(
  listingId: number,
  onSuccess?: (listingId: number) => void
): UseListingUpdateResult {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Clear error handler
  const clearError = useCallback(() => {
    setUpdateError(null);
  }, []);

  // Handle update submission
  const handleUpdate = useCallback(
    async (formData: ListingFormData): Promise<boolean> => {
      setIsUpdating(true);
      setUpdateError(null);

      try {
        // Transform form data to API format
        const apiPayload = formDataToApiUpdate(formData);

        // Upload new logo/cover files to Cloudinary before sending update
        // (Section5Media stores File objects in logoFile/coverFile when user picks new images)
        const csrfToken = await fetchCsrfToken();

        if (formData.logoFile) {
          const logoFormData = new FormData();
          logoFormData.append('file', formData.logoFile);
          logoFormData.append('entityType', 'listings');
          logoFormData.append('entityId', String(listingId));
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
            const logoUrl = logoResult.data?.file?.url;
            if (logoUrl) {
              apiPayload.logo_url = logoUrl;
            }
          }
        }

        if (formData.coverFile) {
          const coverFormData = new FormData();
          coverFormData.append('file', formData.coverFile);
          coverFormData.append('entityType', 'listings');
          coverFormData.append('entityId', String(listingId));
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
            const coverUrl = coverResult.data?.file?.url;
            if (coverUrl) {
              apiPayload.cover_image_url = coverUrl;
            }
          }
        }

        // Submit with CSRF protection
        const response = await fetchWithCsrf(`/api/listings/${listingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiPayload),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Failed to update listing (${response.status})`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error?.message || 'Update failed');
        }

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(listingId);
        }

        setUpdateError(null);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
        setUpdateError(errorMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [listingId, onSuccess]
  );

  return {
    handleUpdate,
    isUpdating,
    updateError,
    clearError,
  };
}
