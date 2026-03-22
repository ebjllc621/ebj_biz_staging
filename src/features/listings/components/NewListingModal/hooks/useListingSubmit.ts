'use client';

/**
 * useListingSubmit Hook
 * Handles form submission for creating new listings
 * Authority: PHASE_6_BRAIN_PLAN.md
 * Tier: ENTERPRISE
 *
 * @governance UMM compliance - media uploads via /api/media/upload
 * @governance Categories - sends all activeCategories + bankCategories
 */

import { useState } from 'react';
import { fetchWithCsrf, fetchCsrfToken } from '@core/utils/csrf';
import type { ListingFormData, TierLimits } from '../../../types/listing-form.types';
import { validateAllSections } from '../validation';
import { ErrorService } from '@core/services/ErrorService';

interface CreatedListing {
  id: number;
  slug: string;
  name: string;
}

interface UseListingSubmitResult {
  isSubmitting: boolean;
  submitError: string | null;
  createdListing: CreatedListing | null;
  handleSubmit: () => Promise<void>;
  setCreatedListing: (listing: CreatedListing | null) => void;
  clearError: () => void;
}

export function useListingSubmit(
  formData: ListingFormData,
  tierLimits: TierLimits,
  onValidationError?: (firstErrorSection: number) => void
): UseListingSubmitResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdListing, setCreatedListing] = useState<CreatedListing | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Validate all sections
      const { valid, sectionErrors } = validateAllSections(formData, tierLimits);

      if (!valid) {
        // Find first error section
        const firstErrorSection = Array.from(sectionErrors.entries())
          .find(([_, result]) => !result.valid)?.[0];

        if (firstErrorSection && onValidationError) {
          onValidationError(firstErrorSection);
        }

        setSubmitError('Please fix validation errors before submitting');
        setIsSubmitting(false);
        return;
      }

      // 2. Transform form data to API format
      const apiPayload = transformFormDataToApi(formData);

      // 3. Create listing
      const listingResponse = await fetchWithCsrf('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      if (!listingResponse.ok) {
        const errorData = await listingResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create listing');
      }

      const listingResult = await listingResponse.json();

      // Check for API-level errors (success: false in response body)
      if (!listingResult.success) {
        throw new Error(listingResult.error?.message || 'Failed to create listing');
      }

      const listingId = listingResult.data?.id || listingResult.id;
      const listingSlug = listingResult.data?.slug || listingResult.slug;
      const listingName = formData.name;

      if (!listingId) {
        throw new Error('Invalid response from server - missing listing ID');
      }

      // 4. Upload media to Cloudinary (UMM compliance)
      // Logo and cover files are uploaded AFTER listing creation to get the listing ID
      const csrfToken = await fetchCsrfToken();

      if (formData.logoFile) {
        try {
          const logoFormData = new FormData();
          logoFormData.append('file', formData.logoFile);
          logoFormData.append('entityType', 'listings');
          logoFormData.append('entityId', String(listingId));
          logoFormData.append('mediaType', 'logo');

          const headers: HeadersInit = {};
          if (csrfToken) {
            headers['x-csrf-token'] = csrfToken;
          }

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
              // Update listing with Cloudinary URL
              await fetchWithCsrf(`/api/listings/${listingId}/logo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logo_url: logoUrl }),
              });
            }
          }
        } catch (error) {
          // Log but don't fail - listing was created successfully
          ErrorService.capture('Failed to upload logo to Cloudinary:', error);
        }
      }

      if (formData.coverFile) {
        try {
          const coverFormData = new FormData();
          coverFormData.append('file', formData.coverFile);
          coverFormData.append('entityType', 'listings');
          coverFormData.append('entityId', String(listingId));
          coverFormData.append('mediaType', 'cover');

          const headers: HeadersInit = {};
          if (csrfToken) {
            headers['x-csrf-token'] = csrfToken;
          }

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
              // Update listing with Cloudinary URL
              await fetchWithCsrf(`/api/listings/${listingId}/cover`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cover_image_url: coverUrl }),
              });
            }
          }
        } catch (error) {
          // Log but don't fail - listing was created successfully
          ErrorService.capture('Failed to upload cover image to Cloudinary:', error);
        }
      }

      // 5. Create listing_users entry
      try {
        await fetchWithCsrf('/api/listing-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: listingId,
            role: formData.userRole,
            status: formData.userRole === 'user' ? 'pending' : 'active',
          }),
        });
      } catch (error) {
        // Log but don't fail - listing was created successfully
        ErrorService.capture('Failed to create listing_users entry:', error);
      }

      // 6. Set success state
      setCreatedListing({
        id: listingId,
        slug: listingSlug || `listing-${listingId}`,
        name: listingName,
      });

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = () => {
    setSubmitError(null);
  };

  return {
    isSubmitting,
    submitError,
    createdListing,
    handleSubmit,
    setCreatedListing,
    clearError,
  };
}

/**
 * Transform ListingFormData to API payload format
 * @governance Sends ALL categories (not just first) + bank_categories
 * @param statusOverride - Optional status to use instead of the default 'active'
 */
export function transformFormDataToApi(formData: ListingFormData, statusOverride?: string): Record<string, unknown> {
  // Extract all category IDs from activeCategories
  const categoryIds = formData.activeCategories?.map(cat => cat.id) || [];

  // Extract bank category IDs for storage
  const bankCategoryIds = formData.bankCategories?.map(cat => cat.id) || [];

  return {
    // Basic info
    name: formData.name,
    slug: formData.slug,
    type: formData.type,
    description: formData.description,
    year_established: formData.yearEstablished || null,
    slogan: formData.slogan || null,
    keywords: formData.keywords?.length > 0 ? formData.keywords : null,

    // Categories - send ALL category IDs, not just first
    category_id: categoryIds[0] || null, // Primary category for backward compat
    category_ids: categoryIds, // All active categories
    bank_categories: bankCategoryIds.length > 0 ? bankCategoryIds : null, // Bank categories

    // Business hours
    business_hours: transformBusinessHours(formData),

    // Contact information
    address: formData.address || null,
    city: formData.city || null,
    state: formData.state || null,
    zip_code: formData.zipCode || null,
    country: formData.country || 'US',
    latitude: formData.latitude || null,
    longitude: formData.longitude || null,
    phone: formData.phone || null,
    email: formData.email || null,
    website: formData.website || null,
    social_media: formData.socialMedia || null,

    // Media URLs - NOT sent here anymore, uploaded via UMM after creation
    // logo_url and cover_image_url are handled by post-creation upload
    video_url: formData.videoUrl || null,
    audio_url: formData.audioUrl || null,

    // SEO
    meta_title: formData.metaTitle || null,
    meta_description: formData.metaDescription || null,
    meta_keywords: formData.metaKeywords || null,

    // Tier & addons
    tier: formData.tier,
    add_ons: formData.selectedAddons || [],

    // Authorization (for Select User role)
    contact_name: formData.userRole === 'user' ? formData.ownerName : null,
    contact_email: formData.userRole === 'user' ? formData.ownerEmail : null,
    contact_phone: formData.userRole === 'user' ? formData.ownerPhone : null,

    // Status - Admin-assigned listings are auto-approved and claimed
    mock: formData.isMockListing || false,
    approved: formData.assignedUser ? 'approved' : 'pending',
    claimed: formData.assignedUser ? true : false,
    status: statusOverride || 'active',

    // Admin user assignment
    assigned_user_id: formData.assignedUser?.id || null,
  };
}

/**
 * Transform business hours to API format
 */
function transformBusinessHours(formData: ListingFormData): Record<string, unknown> | null {
  if (formData.hoursStatus === '24/7') {
    return { is24_7: true };
  }

  if (formData.hoursStatus === 'closed') {
    return { isClosed: true };
  }

  if (formData.hoursStatus === 'timetable' && formData.businessHours) {
    return {
      timezone: formData.timezone || 'America/New_York',
      schedule: formData.businessHours,
    };
  }

  return null;
}
