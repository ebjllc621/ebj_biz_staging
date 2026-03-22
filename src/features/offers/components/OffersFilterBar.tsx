/**
 * OffersFilterBar - Search, sort, and filter controls for offers page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 6 - Filter Bar
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/phases/PHASE_6_BRAIN_PLAN.md
 *
 * FEATURES:
 * - Search input with debounce (300ms) and clear button
 * - Sort dropdown (Featured, Price Low/High, Ending Soon, Best Discount, Nearest)
 * - Offer type filter dropdown (All Types, Discounts, Coupons, Products, Services)
 * - Clear filters button with active count badge
 * - Mobile-responsive collapsible design
 * - Orange theme (biz-orange) consistent with offers branding
 *
 * @see src/features/events/components/EventsFilterBar.tsx - Canonical pattern
 */

'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { Search, X, ChevronDown, Filter, Tag, Zap, LayoutGrid, List as ListIcon, Map } from 'lucide-react';
import { useOffersFilters } from '@/features/offers/hooks/useOffersFilters';
import type { OfferSortOption, OfferSortDropdownOption } from '@/features/offers/types';

/**
 * Component props
 */
export interface OffersFilterBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Available offer types for filter dropdown (optional, uses defaults if not provided) */
  offerTypes?: Array<{ value: string; label: string }>;
  /** Current display mode (grid or list) */
  displayMode?: 'grid' | 'list';
  /** Callback when display mode changes */
  onDisplayModeChange?: (mode: 'grid' | 'list') => void;
  /** Whether the map is currently visible */
  isMapVisible?: boolean;
  /** Callback to toggle map visibility */
  onMapToggle?: () => void;
}

/**
 * Sort options for dropdown
 */
const SORT_OPTIONS: OfferSortDropdownOption[] = [
  { value: 'priority', label: 'Featured' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'discount', label: 'Best Discount' },
  { value: 'distance', label: 'Nearest' },
];

/**
 * Offer type options for dropdown
 */
const OFFER_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'discount', label: 'Discounts' },
  { value: 'coupon', label: 'Coupons' },
  { value: 'product', label: 'Products' },
  { value: 'service', label: 'Services' },
] as const;

/**
 * OffersFilterBar component
 */
export function OffersFilterBar({
  className = '',
  displayMode,
  onDisplayModeChange,
  isMapVisible,
  onMapToggle,
}: OffersFilterBarProps) {
  const {
    filters,
    setSearchQuery,
    setSortOption,
    setOfferType,
    setFlashOnly,
    clearFilters,
    activeFilterCount,
    isDebouncing,
  } = useOffersFilters();

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
      setSortOption(e.target.value as OfferSortOption);
    },
    [setSortOption]
  );

  /**
   * Handle offer type dropdown change
   */
  const handleOfferTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setOfferType(
        value === '' ? undefined : (value as 'discount' | 'coupon' | 'product' | 'service')
      );
    },
    [setOfferType]
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
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search input */}
            <div className="flex-1">
              <label htmlFor="offer-search" className="sr-only">
                Search offers
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                  id="offer-search"
                  type="text"
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder="Search offers..."
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

            {/* Sort dropdown */}
            <div className="md:w-52">
              <label htmlFor="offer-sort" className="sr-only">
                Sort by
              </label>
              <div className="relative">
                <select
                  id="offer-sort"
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
                  <ListIcon className="w-4 h-4" />
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

          {/* Row 2: Offer Type, Flash Filter, and Clear */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Offer type dropdown */}
            <div className="md:w-44">
              <label htmlFor="offer-type" className="sr-only">
                Offer type
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <select
                  id="offer-type"
                  value={filters.offerType || ''}
                  onChange={handleOfferTypeChange}
                  className="w-full appearance-none pl-9 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent cursor-pointer"
                >
                  {OFFER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
              </div>
            </div>

            {/* Flash Deals Filter */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isFlashOnly || false}
                onChange={(e) => setFlashOnly(e.target.checked)}
                className="w-4 h-4 text-biz-orange rounded border-gray-300 focus:ring-biz-orange"
              />
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-700">Flash Deals Only</span>
            </label>

            {/* Clear filters button */}
            {activeFilterCount > 0 && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-offset-2 transition-colors whitespace-nowrap"
                >
                  Clear Filters ({activeFilterCount})
                </button>
              </div>
            )}
          </div>
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
            {filters.sort !== 'priority' && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Sort:</span>
                <span>{SORT_OPTIONS.find((o) => o.value === filters.sort)?.label}</span>
              </div>
            )}
            {filters.offerType && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Type:</span>
                <span>
                  {OFFER_TYPE_OPTIONS.find((o) => o.value === filters.offerType)?.label}
                </span>
              </div>
            )}
            {filters.isFlashOnly && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <Zap className="w-3 h-3" />
                <span className="font-medium">Flash Deals Only</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OffersFilterBar;
