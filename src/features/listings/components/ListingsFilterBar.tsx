/**
 * ListingsFilterBar - Search, sort, and filter controls for listings page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 4 - Filter & Sort Controls
 * @enhanced 2026-02-12 - Advanced search (type, keywords, userName, category)
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/phases/PHASE_4_BRAIN_PLAN.md
 *
 * FEATURES:
 * - Search input with debounce (300ms) and clear button
 * - Sort dropdown (Most Recent, Name A-Z)
 * - Clear filters button with active count badge
 * - Mobile-responsive collapsible design
 * - Advanced filters: type, keywords, category
 * - Search mode detection (owner:, keyword:, #ID)
 *
 * REFERENCE PATTERN:
 * @see src/components/listings/TagFilter.tsx - Form handling and URL sync
 * @see src/features/listings/hooks/useListingsFilters.ts - Filter state management
 * @see src/core/utils/search.ts - Search mode detection
 */

'use client';

import { useState, useCallback, useMemo, useEffect, ChangeEvent } from 'react';
import { Search, X, ChevronDown, Filter, User, Tag, Hash, Sliders, LayoutGrid, List, Map } from 'lucide-react';
import { useListingsFilters } from '@/features/listings/hooks/useListingsFilters';
import { detectListingSearchMode, type ListingSearchMode } from '@core/utils/search';
import type { SortDropdownOption, SortOption } from '@/features/listings/types';

/**
 * Type option shape for dropdown filter
 */
interface TypeOption {
  value: string;
  label: string;
}

/**
 * Component props
 */
export interface ListingsFilterBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Current display mode (grid or list) */
  displayMode?: 'grid' | 'list';
  /** Callback when display mode changes */
  onDisplayModeChange?: (mode: 'grid' | 'list') => void;
  /** Whether map is currently visible */
  isMapVisible?: boolean;
  /** Callback to toggle map visibility */
  onMapToggle?: () => void;
}

/**
 * Sort options for dropdown
 */
const SORT_OPTIONS: SortDropdownOption[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'name', label: 'Name A-Z' },
];

/**
 * ListingsFilterBar component
 *
 * @example
 * ```tsx
 * <ListingsFilterBar className="mb-6" />
 * ```
 */
export function ListingsFilterBar({
  className = '',
  displayMode,
  onDisplayModeChange,
  isMapVisible,
  onMapToggle,
}: ListingsFilterBarProps) {
  const {
    filters,
    setSearchQuery,
    setSortOption,
    setTypeFilter,
    setKeywordsSearch,
    setUserNameSearch,
    clearFilters,
    activeFilterCount,
    isDebouncing,
  } = useListingsFilters();

  // Fetch type options from /api/types on mount
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([{ value: '', label: 'All Types' }]);
  useEffect(() => {
    fetch('/api/types', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data?.types) {
          const options: TypeOption[] = [
            { value: '', label: 'All Types' },
            ...result.data.types.map((t: { name: string }) => ({
              value: t.name,
              label: t.name,
            })),
          ];
          setTypeOptions(options);
        }
      })
      .catch(() => {
        // Silently fail - dropdown stays with "All Types" only
      });
  }, []);

  // Local state for search input (controlled for immediate UI update)
  const [searchValue, setSearchValue] = useState(filters.q);

  // Local state for advanced filter inputs
  const [keywordsValue, setKeywordsValue] = useState(filters.keywords || '');

  // Mobile filter collapse state
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Advanced filters panel state
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Detect search mode from current input
  const searchMode = useMemo(() => detectListingSearchMode(searchValue), [searchValue]);

  /**
   * Handle search input change with smart mode detection
   * Detects owner: prefix and routes to userName search
   */
  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);

      // Detect search mode and route to appropriate handler
      const mode = detectListingSearchMode(value);

      if (mode === 'owner') {
        // Extract owner name after "owner:" prefix
        const ownerName = value.replace(/^owner:/i, '').trim();
        setUserNameSearch(ownerName || undefined);
        setSearchQuery(''); // Clear regular search when using owner mode
      } else {
        setUserNameSearch(undefined); // Clear owner search when using other modes
        setSearchQuery(value); // Debounced URL update
      }
    },
    [setSearchQuery, setUserNameSearch]
  );

  /**
   * Clear search input
   */
  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setSearchQuery('');
    setUserNameSearch(undefined);
  }, [setSearchQuery, setUserNameSearch]);

  /**
   * Handle sort dropdown change
   */
  const handleSortChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setSortOption(e.target.value as SortOption);
    },
    [setSortOption]
  );

  /**
   * Handle type filter change
   */
  const handleTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setTypeFilter(e.target.value || undefined);
    },
    [setTypeFilter]
  );

  /**
   * Handle keywords input change
   */
  const handleKeywordsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setKeywordsValue(value);
      setKeywordsSearch(value || undefined);
    },
    [setKeywordsSearch]
  );

  /**
   * Toggle mobile filter expansion
   */
  const toggleMobileExpanded = useCallback(() => {
    setIsMobileExpanded((prev) => !prev);
  }, []);

  /**
   * Toggle advanced filters panel
   */
  const toggleAdvanced = useCallback(() => {
    setShowAdvanced((prev) => !prev);
  }, []);

  /**
   * Get search mode badge label
   */
  const getSearchModeBadge = (mode: ListingSearchMode): { label: string; icon: React.ReactNode } | null => {
    switch (mode) {
      case 'id':
        return { label: 'ID', icon: <Hash className="h-3 w-3" /> };
      case 'owner':
        return { label: 'Owner', icon: <User className="h-3 w-3" /> };
      default:
        return null;
    }
  };

  const modeBadge = getSearchModeBadge(searchMode);

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
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-biz-navy rounded-full">
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
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search input with mode badge */}
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              Search listings
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              <input
                id="search"
                type="text"
                value={searchValue}
                onChange={handleSearchChange}
                placeholder="Search by name, #ID, or owner:name..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-navy focus:border-transparent"
              />
              {/* Search mode badge */}
              {modeBadge && searchValue && (
                <span className="absolute left-10 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-biz-navy text-white rounded">
                  {modeBadge.icon}
                  {modeBadge.label}
                </span>
              )}
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
                  <div className="animate-spin h-4 w-4 border-2 border-biz-navy border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* Type filter dropdown */}
          <div className="md:w-40">
            <label htmlFor="type" className="sr-only">
              Filter by type
            </label>
            <div className="relative">
              <select
                id="type"
                value={filters.type || ''}
                onChange={handleTypeChange}
                className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-navy focus:border-transparent cursor-pointer"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
            </div>
          </div>

          {/* Sort dropdown */}
          <div className="md:w-48">
            <label htmlFor="sort" className="sr-only">
              Sort by
            </label>
            <div className="relative">
              <select
                id="sort"
                value={filters.sort}
                onChange={handleSortChange}
                className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-navy focus:border-transparent cursor-pointer"
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

          {/* Advanced filters toggle */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={toggleAdvanced}
              className={`px-3 py-2 text-sm font-medium border rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                showAdvanced
                  ? 'bg-biz-navy text-white border-biz-navy'
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              aria-expanded={showAdvanced}
              aria-label="Toggle advanced filters"
            >
              <Sliders className="h-4 w-4" />
              <span className="hidden sm:inline">Advanced</span>
            </button>
          </div>

          {/* Clear filters button */}
          {activeFilterCount > 0 && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-biz-navy focus:ring-offset-2 transition-colors whitespace-nowrap"
              >
                Clear ({activeFilterCount})
              </button>
            </div>
          )}

          {/* Display Mode Toggle */}
          {onDisplayModeChange && (
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => onDisplayModeChange('grid')}
                className={`p-1.5 rounded ${
                  displayMode === 'grid'
                    ? 'bg-biz-orange text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDisplayModeChange('list')}
                className={`p-1.5 rounded ${
                  displayMode === 'list'
                    ? 'bg-biz-orange text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Map Toggle */}
          {onMapToggle && (
            <div className="hidden lg:flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <button
                onClick={onMapToggle}
                className={`p-1.5 rounded ${
                  isMapVisible
                    ? 'bg-biz-orange text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-pressed={isMapVisible}
                aria-label={isMapVisible ? 'Hide map' : 'Show map'}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Advanced filters panel */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Keywords search */}
              <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="keywords"
                    type="text"
                    value={keywordsValue}
                    onChange={handleKeywordsChange}
                    placeholder="Search keywords..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-navy focus:border-transparent"
                  />
                </div>
              </div>

              {/* Search tips */}
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-700 mb-1">Search Tips</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p><code className="bg-gray-100 px-1 rounded">#123</code> or <code className="bg-gray-100 px-1 rounded">123</code> - Search by listing ID</p>
                  <p><code className="bg-gray-100 px-1 rounded">owner:john</code> - Search by owner name</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active filters display */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {filters.q && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded">
                <span className="font-medium">Search:</span>
                <span>{filters.q}</span>
              </div>
            )}
            {filters.type && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
                <span className="font-medium">Type:</span>
                <span>{typeOptions.find((o) => o.value === filters.type)?.label}</span>
              </div>
            )}
            {filters.keywords && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
                <span className="font-medium">Keywords:</span>
                <span>{filters.keywords}</span>
              </div>
            )}
            {filters.userName && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded">
                <span className="font-medium">Owner:</span>
                <span>{filters.userName}</span>
              </div>
            )}
            {filters.category && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded">
                <span className="font-medium">Category:</span>
                <span>{filters.category}</span>
              </div>
            )}
            {filters.sort !== 'recent' && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded">
                <span className="font-medium">Sort:</span>
                <span>{SORT_OPTIONS.find((o) => o.value === filters.sort)?.label}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
