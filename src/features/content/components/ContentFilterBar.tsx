/**
 * ContentFilterBar - Search, sort, and filter controls for Content page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 4 - Content Page Components
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/content/phases/PHASE_4_COMPONENTS.md
 *
 * FEATURES:
 * - Search input with debounce (300ms) and clear button
 * - Sort dropdown (Featured, Most Recent, Most Popular, A-Z)
 * - Content type filter dropdown (All Content, Articles, Videos, Podcasts)
 * - Clear filters button with active count badge
 * - Mobile-responsive collapsible design
 * - Orange theme (biz-orange) consistent with site branding
 *
 * @see src/features/offers/components/OffersFilterBar.tsx - Canonical pattern
 */

'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { Search, X, ChevronDown, Filter, FileText, Video, Headphones, Mail, BookOpen, Heart } from 'lucide-react';
import { useContentFilters } from '@/features/content/hooks/useContentFilters';
import type { ContentSortOption, ContentTypeFilter, ContentSortDropdownOption, ContentTypeDropdownOption } from '@/features/content/types';

/**
 * Component props
 */
export interface ContentFilterBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Hide the content type dropdown on type-specific pages */
  hideTypeFilter?: boolean;
}

/**
 * Sort options for dropdown
 */
const SORT_OPTIONS: ContentSortDropdownOption[] = [
  { value: 'category_featured', label: 'Featured' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'alphabetical', label: 'A-Z' },
];

/**
 * Content type options for dropdown
 */
const TYPE_OPTIONS: ContentTypeDropdownOption[] = [
  { value: 'all', label: 'All Content', icon: undefined },
  { value: 'article', label: 'Articles', icon: FileText },
  { value: 'video', label: 'Videos', icon: Video },
  { value: 'podcast', label: 'Podcasts', icon: Headphones },
  { value: 'newsletter', label: 'Newsletters', icon: Mail },
  { value: 'guide', label: 'Guides', icon: BookOpen },
];

/**
 * ContentFilterBar component
 */
export function ContentFilterBar({ className = '', hideTypeFilter = false }: ContentFilterBarProps) {
  const {
    filters,
    setSearchQuery,
    setSortOption,
    setContentType,
    setFollowing,
    clearFilters,
    activeFilterCount,
    isDebouncing,
  } = useContentFilters();

  // Local state for search input (controlled for immediate UI update)
  const [searchValue, setSearchValue] = useState(filters.q);

  // Mobile filter collapse state
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      setSearchQuery(value); // Debounced URL update
    },
    [setSearchQuery]
  );

  /**
   * Clear search input
   */
  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setSearchQuery('');
  }, [setSearchQuery]);

  /**
   * Handle sort dropdown change
   */
  const handleSortChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setSortOption(e.target.value as ContentSortOption);
    },
    [setSortOption]
  );

  /**
   * Handle content type dropdown change
   */
  const handleTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setContentType(e.target.value as ContentTypeFilter);
    },
    [setContentType]
  );

  /**
   * Toggle mobile filter expansion
   */
  const toggleMobileExpanded = useCallback(() => {
    setIsMobileExpanded((prev) => !prev);
  }, []);

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={toggleMobileExpanded}
        className="w-full flex items-center justify-between p-4 md:hidden"
        aria-expanded={isMobileExpanded}
        aria-label="Toggle filters"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-biz-orange rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-600 transition-transform ${
            isMobileExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Filter controls */}
      <div
        className={`p-4 border-t md:border-t-0 ${
          isMobileExpanded ? 'block' : 'hidden'
        } md:block`}
      >
        {/* Single row: Search + Following + Type + Sort + Clear */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search input */}
          <div className="flex-1 min-w-0">
            <label htmlFor="content-search" className="sr-only">
              Search content
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              <input
                id="content-search"
                type="text"
                value={searchValue}
                onChange={handleSearchChange}
                placeholder="Search articles, videos, podcasts..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              {isDebouncing && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-biz-orange border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* Following toggle */}
          <button
            type="button"
            onClick={() => setFollowing(filters.following ? undefined : true)}
            className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
              filters.following
                ? 'bg-biz-orange text-white border-biz-orange'
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            aria-pressed={!!filters.following}
            aria-label="Show only content from creators you follow"
          >
            <Heart className={`h-4 w-4 ${filters.following ? 'fill-white' : ''}`} />
            Following
          </button>

          {/* Content type dropdown */}
          {!hideTypeFilter && (
            <div className="w-full md:w-44 flex-shrink-0">
              <label htmlFor="content-type" className="sr-only">
                Content type
              </label>
              <div className="relative">
                <select
                  id="content-type"
                  value={filters.type}
                  onChange={handleTypeChange}
                  className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent cursor-pointer"
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Sort dropdown */}
          <div className="w-full md:w-44 flex-shrink-0">
            <label htmlFor="content-sort" className="sr-only">
              Sort by
            </label>
            <div className="relative">
              <select
                id="content-sort"
                value={filters.sort}
                onChange={handleSortChange}
                className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent cursor-pointer"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
            </div>
          </div>

          {/* Clear filters button */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-offset-2 transition-colors whitespace-nowrap flex-shrink-0"
            >
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Active filters display */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {filters.q && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Search:</span>
                <span>{filters.q}</span>
              </div>
            )}
            {filters.sort !== 'category_featured' && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Sort:</span>
                <span>{SORT_OPTIONS.find((o) => o.value === filters.sort)?.label}</span>
              </div>
            )}
            {filters.type !== 'all' && !hideTypeFilter && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Type:</span>
                <span>{TYPE_OPTIONS.find((o) => o.value === filters.type)?.label}</span>
              </div>
            )}
            {filters.following && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Following:</span>
                <span>Active</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentFilterBar;
