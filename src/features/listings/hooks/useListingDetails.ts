/**
 * useListingDetails - Hook for fetching listing details by slug
 *
 * @hook Custom Hook
 * @tier STANDARD
 * @phase Phase 1 - Hero & Action Bar
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Handles:
 * - Fetching listing by slug from API
 * - Loading and error states
 * - View count increment
 * - Refetch capability
 * - AbortController for cleanup
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_1_BRAIN_PLAN.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Listing } from '@core/services/ListingService';

/** Category information for multi-category display */
export interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
}

interface UseListingDetailsOptions {
  /** Initial listing data from server (skips fetch if provided - Phase 11) */
  initialListing?: Listing | null;
  /** Initial categories array from server (multi-category support) */
  initialCategories?: CategoryInfo[] | null;
  /** Initial category name from server (legacy, backwards compatibility) */
  initialCategoryName?: string | null;
  /** Initial category slug from server (legacy, backwards compatibility) */
  initialCategorySlug?: string | null;
}

interface UseListingDetailsReturn {
  listing: Listing | null;
  /** All categories the listing belongs to */
  categories: CategoryInfo[];
  /** Legacy: First category name (backwards compatibility) */
  categoryName: string | null;
  /** Legacy: First category slug (backwards compatibility) */
  categorySlug: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  incrementViewCount: () => void;
}

/**
 * useListingDetails hook
 * Fetches listing details by slug and manages state
 * Phase 11: Supports initial data from server for optimal LCP
 */
export function useListingDetails(
  slug: string,
  options?: UseListingDetailsOptions
): UseListingDetailsReturn {
  const {
    initialListing,
    initialCategories,
    initialCategoryName,
    initialCategorySlug
  } = options || {};

  // Derive initial categories from either new format or legacy format
  const deriveInitialCategories = (): CategoryInfo[] => {
    if (initialCategories && initialCategories.length > 0) {
      return initialCategories;
    }
    // Backwards compatibility: convert legacy single category to array
    if (initialCategoryName && initialCategorySlug && initialListing?.category_id) {
      return [{
        id: initialListing.category_id,
        name: initialCategoryName,
        slug: initialCategorySlug
      }];
    }
    return [];
  };

  const [listing, setListing] = useState<Listing | null>(initialListing || null);
  const [categories, setCategories] = useState<CategoryInfo[]>(deriveInitialCategories());
  const [isLoading, setIsLoading] = useState(!initialListing); // Skip loading if initial data provided
  const [error, setError] = useState<string | null>(null);
  const viewCountedRef = useRef(false);

  // Legacy computed values for backwards compatibility
  const categoryName = categories[0]?.name || null;
  const categorySlug = categories[0]?.slug || null;

  /**
   * Fetch listing by slug
   */
  const fetchListing = useCallback(async (abortSignal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/by-slug/${slug}`, {
        credentials: 'include',
        signal: abortSignal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Listing not found');
        }
        throw new Error('Failed to fetch listing');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch listing');
      }

      setListing(data.data.listing);
      // Prefer categories array, fallback to legacy single category
      if (data.data.categories && data.data.categories.length > 0) {
        setCategories(data.data.categories);
      } else if (data.data.category_name && data.data.category_slug && data.data.listing?.category_id) {
        setCategories([{
          id: data.data.listing.category_id,
          name: data.data.category_name,
          slug: data.data.category_slug
        }]);
      } else {
        setCategories([]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  /**
   * Increment view count
   * Only called once per session using ref
   * Enhanced: Captures referrer for traffic source analytics
   */
  const incrementViewCount = useCallback(async () => {
    if (!listing || viewCountedRef.current) return;

    viewCountedRef.current = true;

    try {
      // Capture referrer for traffic source tracking
      const referrer = typeof document !== 'undefined' ? document.referrer : null;

      await fetch(`/api/listings/${listing.id}/statistics/view`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referrer: referrer || undefined,
        }),
      });
    } catch (err) {
      // Non-critical error, silently fail
      // Lighthouse penalizes console.error in production
    }
  }, [listing]);

  /**
   * Refetch listing
   */
  const refetch = useCallback(() => {
    viewCountedRef.current = false;
    fetchListing();
  }, [fetchListing]);

  /**
   * Initial fetch with AbortController cleanup
   * Phase 11: Skip fetch if initial data was provided from server
   */
  useEffect(() => {
    // Skip fetch if initial data was provided
    if (initialListing) {
      return;
    }

    const abortController = new AbortController();
    fetchListing(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchListing, initialListing]);

  return {
    listing,
    categories,
    categoryName,
    categorySlug,
    isLoading,
    error,
    refetch,
    incrementViewCount,
  };
}
