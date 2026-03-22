/**
 * useListingData - Fetch Full Listing Data for Manager Pages
 *
 * @description Fetches complete listing data from GET /api/listings/[id]
 * @component Hook
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @phase Phase 7 - Core Listing Manager Pages (Fix)
 *
 * The ListingContext only provides minimal data for the selector dropdown.
 * Manager pages need FULL listing data including:
 * - slogan, type, year_established (Quick Facts)
 * - address, city, state, zip_code, latitude, longitude (Location)
 * - description (Description)
 * - business_hours (Hours)
 * - social_media (Social Links)
 *
 * This hook fetches the complete listing from GET /api/listings/[id].
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface FullListingData {
  id: number;
  name: string;
  slug: string;
  tier: string;
  status: string;
  type: string | null;
  year_established: number | null;
  slogan: string | null;
  keywords: string[] | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  business_hours: BusinessHour[] | null;
  social_media: SocialMedia | null;
  logo_url: string | null;
  cover_image_url: string | null;
  category_id: number | null;
  features: string[] | null;
  amenities: string[] | null;
  gallery_images: string[] | null;
  // Gallery layout preference - Phase 8A
  gallery_layout: string | null;
  // Contact Info (Owner/Manager) - Phase 11
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  // SEO fields - Phase 11
  meta_title: string | null;
  meta_description: string | null;
  // Categories - active/bank JSON arrays of category IDs
  active_categories: number[] | null;
  bank_categories: number[] | null;
  // Media embeds - single URL each, displayed in listing details section
  video_url: string | null;
  audio_url: string | null;
  // Video gallery
  video_gallery: string[] | null;
  video_gallery_layout: string | null;
  combine_video_gallery: boolean;
  // Hours of operation - separate DB columns (migration 036)
  hours_status: 'timetable' | '24-7' | 'closed';
  timezone: string;
}

export interface BusinessHour {
  day: string;
  open: string | null;
  close: string | null;
}

export interface SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
}

export interface UseListingDataResult {
  /** Full listing data */
  listing: FullListingData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh listing data */
  refreshListing: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useListingData - Fetch full listing data for manager pages
 *
 * @param listingId - The listing ID to fetch
 * @returns Full listing data, loading state, error, and refresh function
 */
export function useListingData(listingId: number | null): UseListingDataResult {
  const [listing, setListing] = useState<FullListingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = useCallback(async () => {
    if (!listingId) {
      setListing(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch listing: ${response.status}`);
      }

      const result = await response.json();

      // API returns { data: { listing: {...} } } or { listing: {...} }
      const listingData = result.data?.listing || result.listing || result.data;

      if (!listingData) {
        throw new Error('Listing not found');
      }

      // Parse business_hours if it's a string
      let businessHours = listingData.business_hours;
      if (typeof businessHours === 'string') {
        try {
          businessHours = JSON.parse(businessHours);
        } catch {
          businessHours = null;
        }
      }

      // Parse social_media if it's a string
      let socialMedia = listingData.social_media;
      if (typeof socialMedia === 'string') {
        try {
          socialMedia = JSON.parse(socialMedia);
        } catch {
          socialMedia = null;
        }
      }

      // Parse keywords if it's a string
      let keywords = listingData.keywords;
      if (typeof keywords === 'string') {
        try {
          keywords = JSON.parse(keywords);
        } catch {
          keywords = keywords ? keywords.split(',').map((k: string) => k.trim()) : null;
        }
      }

      // Parse features if it's a string
      let features = listingData.features;
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features);
        } catch {
          features = null;
        }
      }

      // Parse amenities if it's a string
      let amenities = listingData.amenities;
      if (typeof amenities === 'string') {
        try {
          amenities = JSON.parse(amenities);
        } catch {
          amenities = null;
        }
      }

      // Parse gallery_images if it's a string
      let galleryImages = listingData.gallery_images;
      if (typeof galleryImages === 'string') {
        try {
          galleryImages = JSON.parse(galleryImages);
        } catch {
          galleryImages = null;
        }
      }

      // Parse active_categories if it's a string
      let activeCategories = listingData.active_categories;
      if (typeof activeCategories === 'string') {
        try {
          activeCategories = JSON.parse(activeCategories);
        } catch {
          activeCategories = null;
        }
      }

      // Parse bank_categories if it's a string
      let bankCategoriesData = listingData.bank_categories;
      if (typeof bankCategoriesData === 'string') {
        try {
          bankCategoriesData = JSON.parse(bankCategoriesData);
        } catch {
          bankCategoriesData = null;
        }
      }

      setListing({
        id: listingData.id,
        name: listingData.name,
        slug: listingData.slug,
        tier: listingData.tier,
        status: listingData.status,
        type: listingData.type || null,
        year_established: listingData.year_established || null,
        slogan: listingData.slogan || null,
        keywords: keywords || null,
        description: listingData.description || null,
        address: listingData.address || null,
        city: listingData.city || null,
        state: listingData.state || null,
        zip_code: listingData.zip_code || null,
        country: listingData.country || 'US',
        latitude: listingData.latitude || null,
        longitude: listingData.longitude || null,
        phone: listingData.phone || null,
        email: listingData.email || null,
        website: listingData.website || null,
        business_hours: businessHours || null,
        social_media: socialMedia || null,
        logo_url: listingData.logo_url || null,
        cover_image_url: listingData.cover_image_url || null,
        category_id: listingData.category_id || null,
        features: features || null,
        amenities: amenities || null,
        gallery_images: galleryImages || null,
        // Gallery layout preference - Phase 8A
        gallery_layout: listingData.gallery_layout || null,
        // Contact Info (Owner/Manager) - Phase 11
        contact_name: listingData.contact_name || null,
        contact_email: listingData.contact_email || null,
        contact_phone: listingData.contact_phone || null,
        // SEO fields - Phase 11
        meta_title: listingData.meta_title || null,
        meta_description: listingData.meta_description || null,
        // Categories
        active_categories: activeCategories || null,
        bank_categories: bankCategoriesData || null,
        // Media embeds
        video_url: listingData.video_url || null,
        audio_url: listingData.audio_url || null,
        // Video gallery
        video_gallery: (() => {
          let vg = listingData.video_gallery;
          if (typeof vg === 'string') {
            try { vg = JSON.parse(vg); } catch { vg = null; }
          }
          return Array.isArray(vg) ? vg : null;
        })(),
        video_gallery_layout: listingData.video_gallery_layout || null,
        combine_video_gallery: Boolean(listingData.combine_video_gallery),
        // Hours of operation - separate DB columns (migration 036)
        hours_status: listingData.hours_status || 'timetable',
        timezone: listingData.timezone || 'America/New_York',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing');
      setListing(null);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  // Fetch on mount and when listingId changes
  useEffect(() => {
    void fetchListing();
  }, [fetchListing]);

  const refreshListing = useCallback(async () => {
    await fetchListing();
  }, [fetchListing]);

  return {
    listing,
    isLoading,
    error,
    refreshListing
  };
}

export default useListingData;
