/**
 * useOffersFilters Hook - URL-synchronized offers filter state management
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 6 - Filter Bar
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/phases/PHASE_6_BRAIN_PLAN.md
 *
 * FEATURES:
 * - URL query parameter synchronization (q, sort, page, offerType, category)
 * - Debounced search input (300ms delay)
 * - Active filter count calculation
 * - Clear filters utility
 *
 * @see src/features/events/hooks/useEventsFilters.ts - Canonical pattern
 */

'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import type { OfferSortOption, OffersFilters } from '@/features/offers/types';

/**
 * Debounce delay for search input (milliseconds)
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Valid offer types for filter
 */
const VALID_OFFER_TYPES = ['discount', 'coupon', 'product', 'service'] as const;

/**
 * Hook return type
 */
export interface UseOffersFiltersReturn {
  /** Current filter state */
  filters: OffersFilters;
  /** Update search query (debounced) */
  setSearchQuery: (_query: string) => void;
  /** Update sort option (immediate) */
  setSortOption: (_sort: OfferSortOption) => void;
  /** Update offer type filter (immediate) */
  setOfferType: (_offerType: 'discount' | 'coupon' | 'product' | 'service' | undefined) => void;
  /** Update category filter (immediate) */
  setCategory: (_category: string | undefined) => void;
  /** Update flash filter (immediate) */
  setFlashOnly: (_isFlash: boolean) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Count of active filters (non-default values) */
  activeFilterCount: number;
  /** Loading state during debounce */
  isDebouncing: boolean;
}

/**
 * URL-synchronized offers filter hook with debounced search
 */
export function useOffersFilters(): UseOffersFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Debounce timer reference
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Local state for debouncing indicator
  const [isDebouncing, setIsDebouncing] = useState(false);

  /**
   * Parse current filters from URL search params
   */
  const filters: OffersFilters = {
    q: searchParams.get('q') || '',
    sort: (searchParams.get('sort') as OfferSortOption) || 'priority',
    page: parseInt(searchParams.get('page') || '1', 10),
    offerType: VALID_OFFER_TYPES.includes(
      searchParams.get('offerType') as typeof VALID_OFFER_TYPES[number]
    )
      ? (searchParams.get('offerType') as 'discount' | 'coupon' | 'product' | 'service')
      : undefined,
    category: searchParams.get('category') || undefined,
    isFlashOnly: searchParams.get('flash') === 'true',
  };

  /**
   * Update URL with new filter values
   */
  const updateURL = useCallback(
    (updates: Partial<OffersFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates
      if (updates.q !== undefined) {
        if (updates.q === '') {
          params.delete('q');
        } else {
          params.set('q', updates.q);
        }
      }

      if (updates.sort !== undefined) {
        if (updates.sort === 'priority') {
          params.delete('sort'); // Default value, no need in URL
        } else {
          params.set('sort', updates.sort);
        }
      }

      if (updates.page !== undefined) {
        if (updates.page === 1) {
          params.delete('page'); // Default value, no need in URL
        } else {
          params.set('page', updates.page.toString());
        }
      }

      if (updates.offerType !== undefined) {
        if (updates.offerType === undefined) {
          params.delete('offerType');
        } else {
          params.set('offerType', updates.offerType);
        }
      }

      if (updates.category !== undefined) {
        if (updates.category === '' || updates.category === undefined) {
          params.delete('category');
        } else {
          params.set('category', updates.category);
        }
      }

      if (updates.isFlashOnly !== undefined) {
        if (updates.isFlashOnly) {
          params.set('flash', 'true');
        } else {
          params.delete('flash');
        }
      }

      // Navigate to updated URL
      router.push(`${pathname}?${params.toString()}` as Route, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  /**
   * Set search query with debounce (300ms)
   */
  const setSearchQuery = useCallback(
    (query: string) => {
      setIsDebouncing(true);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        updateURL({ q: query, page: 1 }); // Reset to page 1 on search
        setIsDebouncing(false);
      }, SEARCH_DEBOUNCE_MS);
    },
    [updateURL]
  );

  /**
   * Set sort option (immediate)
   */
  const setSortOption = useCallback(
    (sort: OfferSortOption) => {
      updateURL({ sort, page: 1 }); // Reset to page 1 on sort change
    },
    [updateURL]
  );

  /**
   * Set offer type filter (immediate)
   */
  const setOfferType = useCallback(
    (offerType: 'discount' | 'coupon' | 'product' | 'service' | undefined) => {
      updateURL({ offerType, page: 1 }); // Reset to page 1 on filter change
    },
    [updateURL]
  );

  /**
   * Set category filter (immediate)
   */
  const setCategory = useCallback(
    (category: string | undefined) => {
      updateURL({ category, page: 1 }); // Reset to page 1 on filter change
    },
    [updateURL]
  );

  /**
   * Set flash filter (immediate)
   */
  const setFlashOnly = useCallback(
    (isFlash: boolean) => {
      updateURL({ isFlashOnly: isFlash, page: 1 }); // Reset to page 1 on filter change
    },
    [updateURL]
  );

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    router.push(`${pathname}?${params.toString()}` as Route, { scroll: false });
  }, [router, pathname]);

  /**
   * Calculate active filter count (non-default values)
   */
  const activeFilterCount =
    (filters.q ? 1 : 0) +
    (filters.sort !== 'priority' ? 1 : 0) +
    (filters.offerType ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.isFlashOnly ? 1 : 0);

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    filters,
    setSearchQuery,
    setSortOption,
    setOfferType,
    setCategory,
    setFlashOnly,
    clearFilters,
    activeFilterCount,
    isDebouncing,
  };
}
