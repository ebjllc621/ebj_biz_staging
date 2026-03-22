/**
 * useContentFilters Hook - URL-synchronized content filter state management
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 4 - Content Page Components
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/content/phases/PHASE_4_COMPONENTS.md
 *
 * FEATURES:
 * - URL query parameter synchronization (q, type, sort, category, featured, page, pageSize)
 * - Debounced search input (300ms delay)
 * - Active filter count calculation
 * - Clear filters utility
 *
 * @see src/features/offers/hooks/useOffersFilters.ts - Canonical pattern
 */

'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import type { ContentSortOption, ContentTypeFilter } from '@/features/content/types';

/**
 * Debounce delay for search input (milliseconds)
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Valid content types for filter
 */
const VALID_CONTENT_TYPES = ['all', 'article', 'video', 'podcast', 'newsletter', 'guide'] as const;

/**
 * Valid sort options
 */
const VALID_SORT_OPTIONS = ['category_featured', 'recent', 'popular', 'alphabetical'] as const;

/**
 * Content filters interface
 */
export interface ContentFilters {
  q: string;
  type: ContentTypeFilter;
  sort: ContentSortOption;
  category?: number;
  featured?: boolean;
  following?: boolean;
  page: number;
  pageSize: number;
}

/**
 * Hook return type
 */
export interface UseContentFiltersReturn {
  /** Current filter state */
  filters: ContentFilters;
  /** Update search query (debounced) */
  setSearchQuery: (_query: string) => void;
  /** Update content type filter (immediate) */
  setContentType: (_type: ContentTypeFilter) => void;
  /** Update sort option (immediate) */
  setSortOption: (_sort: ContentSortOption) => void;
  /** Update category filter (immediate) */
  setCategory: (_category: number | undefined) => void;
  /** Update featured filter (immediate) */
  setFeatured: (_featured: boolean | undefined) => void;
  /** Update following filter (immediate) */
  setFollowing: (_following: boolean | undefined) => void;
  /** Update page (immediate) */
  setPage: (_page: number) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Count of active filters (non-default values) */
  activeFilterCount: number;
  /** Loading state during debounce */
  isDebouncing: boolean;
}

/**
 * URL-synchronized content filter hook with debounced search
 */
export function useContentFilters(): UseContentFiltersReturn {
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
  const filters: ContentFilters = {
    q: searchParams.get('q') || '',
    type: (VALID_CONTENT_TYPES.includes(searchParams.get('type') as ContentTypeFilter)
      ? searchParams.get('type')
      : 'all') as ContentTypeFilter,
    sort: (VALID_SORT_OPTIONS.includes(searchParams.get('sort') as ContentSortOption)
      ? searchParams.get('sort')
      : 'category_featured') as ContentSortOption,
    category: searchParams.get('category') ? parseInt(searchParams.get('category')!, 10) : undefined,
    featured: searchParams.get('featured') === 'true' ? true : undefined,
    following: searchParams.get('following') === 'true' ? true : undefined,
    page: parseInt(searchParams.get('page') || '1', 10),
    pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
  };

  /**
   * Update URL with new filter values
   */
  const updateURL = useCallback(
    (updates: Partial<ContentFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates
      if (updates.q !== undefined) {
        if (updates.q === '') {
          params.delete('q');
        } else {
          params.set('q', updates.q);
        }
      }

      if (updates.type !== undefined) {
        if (updates.type === 'all') {
          params.delete('type');
        } else {
          params.set('type', updates.type);
        }
      }

      if (updates.sort !== undefined) {
        if (updates.sort === 'category_featured') {
          params.delete('sort'); // Default value, no need in URL
        } else {
          params.set('sort', updates.sort);
        }
      }

      if (updates.category !== undefined) {
        params.delete('category');
        if (updates.category) {
          params.set('category', updates.category.toString());
        }
      }

      if (updates.featured !== undefined) {
        params.delete('featured');
        if (updates.featured) {
          params.set('featured', 'true');
        }
      }

      if (updates.following !== undefined) {
        params.delete('following');
        if (updates.following) {
          params.set('following', 'true');
        }
      }

      if (updates.page !== undefined) {
        if (updates.page === 1) {
          params.delete('page'); // Default value, no need in URL
        } else {
          params.set('page', updates.page.toString());
        }
      }

      if (updates.pageSize !== undefined) {
        if (updates.pageSize === 20) {
          params.delete('pageSize'); // Default value, no need in URL
        } else {
          params.set('pageSize', updates.pageSize.toString());
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
   * Set content type filter (immediate)
   */
  const setContentType = useCallback(
    (type: ContentTypeFilter) => {
      updateURL({ type, page: 1 }); // Reset to page 1 on filter change
    },
    [updateURL]
  );

  /**
   * Set sort option (immediate)
   */
  const setSortOption = useCallback(
    (sort: ContentSortOption) => {
      updateURL({ sort, page: 1 }); // Reset to page 1 on sort change
    },
    [updateURL]
  );

  /**
   * Set category filter (immediate)
   */
  const setCategory = useCallback(
    (category: number | undefined) => {
      updateURL({ category, page: 1 }); // Reset to page 1 on filter change
    },
    [updateURL]
  );

  /**
   * Set featured filter (immediate)
   */
  const setFeatured = useCallback(
    (featured: boolean | undefined) => {
      updateURL({ featured, page: 1 }); // Reset to page 1 on filter change
    },
    [updateURL]
  );

  /**
   * Set following filter (immediate)
   */
  const setFollowing = useCallback(
    (following: boolean | undefined) => {
      updateURL({ following, page: 1 });
    },
    [updateURL]
  );

  /**
   * Set page (immediate)
   */
  const setPage = useCallback(
    (page: number) => {
      updateURL({ page });
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
    (filters.type !== 'all' ? 1 : 0) +
    (filters.sort !== 'category_featured' ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.featured ? 1 : 0) +
    (filters.following ? 1 : 0);

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
    setContentType,
    setSortOption,
    setCategory,
    setFeatured,
    setFollowing,
    setPage,
    clearFilters,
    activeFilterCount,
    isDebouncing,
  };
}
