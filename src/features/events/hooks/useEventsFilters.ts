/**
 * useEventsFilters Hook - URL-synchronized events filter state management
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 6 - Filter Bar
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/events/phases/PHASE_6_BRAIN_PLAN.md
 *
 * FEATURES:
 * - URL query parameter synchronization (q, sort, page, eventType, locationType)
 * - Debounced search input (300ms delay)
 * - Active filter count calculation
 * - Clear filters utility
 *
 * @see src/features/listings/hooks/useListingsFilters.ts - Canonical pattern
 */

'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import type { EventSortOption, EventsFilters } from '@/features/events/types';

/**
 * Debounce delay for search input (milliseconds)
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Valid location types for filter
 */
const VALID_LOCATION_TYPES = ['physical', 'virtual', 'hybrid'] as const;

/**
 * Hook return type
 */
export interface UseEventsFiltersReturn {
  /** Current filter state */
  filters: EventsFilters;
  /** Update search query (debounced) */
  setSearchQuery: (_query: string) => void;
  /** Update sort option (immediate) */
  setSortOption: (_sort: EventSortOption) => void;
  /** Update event type filter (immediate) */
  setEventType: (_eventType: string | undefined) => void;
  /** Update location type filter (immediate) */
  setLocationType: (_locationType: 'physical' | 'virtual' | 'hybrid' | undefined) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Count of active filters (non-default values) */
  activeFilterCount: number;
  /** Loading state during debounce */
  isDebouncing: boolean;
}

/**
 * URL-synchronized events filter hook with debounced search
 */
export function useEventsFilters(): UseEventsFiltersReturn {
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
  const filters: EventsFilters = {
    q: searchParams.get('q') || '',
    sort: (searchParams.get('sort') as EventSortOption) || 'priority',
    page: parseInt(searchParams.get('page') || '1', 10),
    eventType: searchParams.get('eventType') || undefined,
    locationType: VALID_LOCATION_TYPES.includes(
      searchParams.get('locationType') as typeof VALID_LOCATION_TYPES[number]
    )
      ? (searchParams.get('locationType') as 'physical' | 'virtual' | 'hybrid')
      : undefined,
  };

  /**
   * Update URL with new filter values
   */
  const updateURL = useCallback(
    (updates: Partial<EventsFilters>) => {
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

      if ('eventType' in updates) {
        if (!updates.eventType) {
          params.delete('eventType');
        } else {
          params.set('eventType', updates.eventType);
        }
      }

      if ('locationType' in updates) {
        if (!updates.locationType) {
          params.delete('locationType');
        } else {
          params.set('locationType', updates.locationType);
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
    (sort: EventSortOption) => {
      updateURL({ sort, page: 1 }); // Reset to page 1 on sort change
    },
    [updateURL]
  );

  /**
   * Set event type filter (immediate)
   */
  const setEventType = useCallback(
    (eventType: string | undefined) => {
      updateURL({ eventType, page: 1 }); // Reset to page 1 on filter change
    },
    [updateURL]
  );

  /**
   * Set location type filter (immediate)
   */
  const setLocationType = useCallback(
    (locationType: 'physical' | 'virtual' | 'hybrid' | undefined) => {
      updateURL({ locationType, page: 1 }); // Reset to page 1 on filter change
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
    (filters.eventType ? 1 : 0) +
    (filters.locationType ? 1 : 0);

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
    setEventType,
    setLocationType,
    clearFilters,
    activeFilterCount,
    isDebouncing,
  };
}
