/**
 * useListingsFilters Hook - URL-synchronized listings filter state management
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 4 - Filter & Sort Controls
 * @enhanced 2026-02-12 - Advanced search params (userId, userName, type, keywords, category)
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/phases/PHASE_4_BRAIN_PLAN.md
 *
 * FEATURES:
 * - URL query parameter synchronization (q, sort, page + advanced filters)
 * - Debounced search input (300ms delay)
 * - Active filter count calculation
 * - Clear filters utility
 * - Advanced search: userId, userName, type, keywords, category
 *
 * REFERENCE PATTERN:
 * @see src/components/listings/TagFilter.tsx - URL sync pattern with router.push
 * @see src/core/utils/search.ts - Search mode detection utilities
 */

'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import type { SortOption, ListingsFilters } from '@/features/listings/types';

/**
 * Debounce delay for search input (milliseconds)
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Hook return type
 */
export interface UseListingsFiltersReturn {
  /** Current filter state */
  filters: ListingsFilters;
  /** Update search query (debounced) */
  setSearchQuery: (_query: string) => void;
  /** Update sort option (immediate) */
  setSortOption: (_sort: SortOption) => void;
  /** Update type filter (immediate) */
  setTypeFilter: (_type: string | undefined) => void;
  /** Update category filter (immediate) */
  setCategoryFilter: (_category: string | undefined) => void;
  /** Update keywords search (debounced) */
  setKeywordsSearch: (_keywords: string | undefined) => void;
  /** Update userName search (debounced) */
  setUserNameSearch: (_userName: string | undefined) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Count of active filters (non-default values) */
  activeFilterCount: number;
  /** Loading state during debounce */
  isDebouncing: boolean;
}

/**
 * URL-synchronized listings filter hook with debounced search
 *
 * @returns Filter state and update functions
 *
 * @example
 * ```tsx
 * const { filters, setSearchQuery, setSortOption, clearFilters, activeFilterCount } = useListingsFilters();
 *
 * // Update search (debounced)
 * setSearchQuery('coffee shop');
 *
 * // Update sort (immediate)
 * setSortOption('name');
 *
 * // Clear all filters
 * clearFilters();
 * ```
 */
export function useListingsFilters(): UseListingsFiltersReturn {
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
  const userIdParam = searchParams.get('userId');
  const filters: ListingsFilters = {
    q: searchParams.get('q') || '',
    sort: (searchParams.get('sort') as SortOption) || 'recent',
    page: parseInt(searchParams.get('page') || '1', 10),
    userId: userIdParam ? parseInt(userIdParam, 10) : undefined,
    userName: searchParams.get('userName') || undefined,
    type: searchParams.get('type') || undefined,
    keywords: searchParams.get('keywords') || undefined,
    category: searchParams.get('category') || undefined,
  };

  /**
   * Update URL with new filter values
   */
  const updateURL = useCallback(
    (updates: Partial<ListingsFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates for basic filters
      if (updates.q !== undefined) {
        if (updates.q === '') {
          params.delete('q');
        } else {
          params.set('q', updates.q);
        }
      }

      if (updates.sort !== undefined) {
        if (updates.sort === 'recent') {
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

      // Apply updates for advanced filters
      if (updates.userId !== undefined) {
        if (updates.userId === undefined) {
          params.delete('userId');
        } else {
          params.set('userId', updates.userId.toString());
        }
      }

      if (updates.userName !== undefined) {
        if (updates.userName === '' || updates.userName === undefined) {
          params.delete('userName');
        } else {
          params.set('userName', updates.userName);
        }
      }

      if (updates.type !== undefined) {
        if (updates.type === '' || updates.type === undefined) {
          params.delete('type');
        } else {
          params.set('type', updates.type);
        }
      }

      if (updates.keywords !== undefined) {
        if (updates.keywords === '' || updates.keywords === undefined) {
          params.delete('keywords');
        } else {
          params.set('keywords', updates.keywords);
        }
      }

      if (updates.category !== undefined) {
        if (updates.category === '' || updates.category === undefined) {
          params.delete('category');
        } else {
          params.set('category', updates.category);
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
    (sort: SortOption) => {
      updateURL({ sort, page: 1 }); // Reset to page 1 on sort change
    },
    [updateURL]
  );

  /**
   * Set type filter (immediate)
   */
  const setTypeFilter = useCallback(
    (type: string | undefined) => {
      updateURL({ type, page: 1 }); // Reset to page 1 on filter change
    },
    [updateURL]
  );

  /**
   * Set category filter (immediate)
   */
  const setCategoryFilter = useCallback(
    (category: string | undefined) => {
      updateURL({ category, page: 1 }); // Reset to page 1 on filter change
    },
    [updateURL]
  );

  /**
   * Set keywords search (debounced)
   */
  const setKeywordsSearch = useCallback(
    (keywords: string | undefined) => {
      setIsDebouncing(true);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateURL({ keywords, page: 1 });
        setIsDebouncing(false);
      }, SEARCH_DEBOUNCE_MS);
    },
    [updateURL]
  );

  /**
   * Set userName search (debounced)
   */
  const setUserNameSearch = useCallback(
    (userName: string | undefined) => {
      setIsDebouncing(true);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateURL({ userName, page: 1 });
        setIsDebouncing(false);
      }, SEARCH_DEBOUNCE_MS);
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
    (filters.sort !== 'recent' ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.keywords ? 1 : 0) +
    (filters.userName ? 1 : 0) +
    (filters.userId ? 1 : 0);

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
    setTypeFilter,
    setCategoryFilter,
    setKeywordsSearch,
    setUserNameSearch,
    clearFilters,
    activeFilterCount,
    isDebouncing,
  };
}
