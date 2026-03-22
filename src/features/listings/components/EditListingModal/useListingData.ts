/**
 * useListingData Hook
 *
 * @authority Phase 7 Brain Plan
 * @tier ENTERPRISE
 * @purpose Fetch listing data for edit mode with transformation
 *
 * FEATURES:
 * - Fetches complete listing data from GET /api/listings/[id]/full
 * - Transforms API response to ListingFormData format
 * - Loading and error state management
 * - AbortController for cleanup
 * - Refetch capability
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ListingFormData } from '../../types/listing-form.types';
import { apiListingToFormData, type ApiListingResponse } from './transforms';

// ============================================================================
// TYPES
// ============================================================================

export interface UseListingDataResult {
  /** Transformed listing data ready for form */
  listingData: Partial<ListingFormData> | null;
  /** Raw API response */
  rawListing: ApiListingResponse | null;
  /** User's role for this listing */
  userRoleForListing: 'owner' | 'manager' | 'user' | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refetch function */
  refetch: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Fetch listing data for editing
 *
 * @param listingId - Listing ID to fetch (null skips fetching)
 * @returns UseListingDataResult with data, loading, error states
 */
export function useListingData(listingId: number | null): UseListingDataResult {
  const [listingData, setListingData] = useState<Partial<ListingFormData> | null>(null);
  const [rawListing, setRawListing] = useState<ApiListingResponse | null>(null);
  const [userRoleForListing, setUserRoleForListing] = useState<'owner' | 'manager' | 'user' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch listing data
  const fetchListing = useCallback(async () => {
    if (!listingId) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/full`, {
        signal: abortController.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to fetch listing (${response.status})`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid API response format');
      }

      // Store raw response
      setRawListing(result.data);

      // Transform to form data
      const transformed = apiListingToFormData(result.data);
      setListingData(transformed);

      // Store user role
      setUserRoleForListing(result.data.userRole || null);

      setError(null);
    } catch (err) {
      // Don't set error if aborted (component unmounted)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load listing data';
      setError(errorMessage);
      setListingData(null);
      setRawListing(null);
      setUserRoleForListing(null);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  // Fetch on mount and when listingId changes
  useEffect(() => {
    fetchListing();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchListing]);

  return {
    listingData,
    rawListing,
    userRoleForListing,
    isLoading,
    error,
    refetch: fetchListing,
  };
}
