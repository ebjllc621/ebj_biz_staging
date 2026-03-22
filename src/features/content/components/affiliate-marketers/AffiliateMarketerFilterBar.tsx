/**
 * AffiliateMarketerFilterBar - Search, sort, and filter controls for Affiliate Marketers list
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 3 Creator Profiles - Phase 4
 * @governance Build Map v2.1 ENHANCED
 *
 * FEATURES:
 * - Search input with debounce (300ms) and clear button
 * - Sort dropdown (Recent, Popular, Top Rated, A-Z)
 * - Niche dropdown
 * - Platform dropdown
 * - Verified Only checkbox
 * - Clear filters button with active count badge
 * - Mobile-responsive collapsible design
 *
 * @see src/features/content/components/ContentFilterBar.tsx - Canonical pattern
 */

'use client';

import { useState, useCallback, useEffect, useRef, ChangeEvent } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, X, ChevronDown, Filter } from 'lucide-react';
import type { AffiliateMarketerSortOption } from '@core/types/affiliate-marketer';

const SORT_OPTIONS: { value: AffiliateMarketerSortOption; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'alphabetical', label: 'A-Z' },
];

const NICHE_OPTIONS = [
  { value: '', label: 'All Niches' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Health & Wellness', label: 'Health & Wellness' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Fashion', label: 'Fashion' },
  { value: 'Food', label: 'Food' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Education', label: 'Education' },
  { value: 'Lifestyle', label: 'Lifestyle' },
  { value: 'Beauty', label: 'Beauty' },
];

const PLATFORM_OPTIONS = [
  { value: '', label: 'All Platforms' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'X/Twitter', label: 'X/Twitter' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Blog', label: 'Blog' },
  { value: 'Facebook', label: 'Facebook' },
];

export interface AffiliateMarketerFilterBarProps {
  className?: string;
}

export function AffiliateMarketerFilterBar({ className = '' }: AffiliateMarketerFilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Controlled search input value (local state for immediate UI update)
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync search value if URL param changes externally
  useEffect(() => {
    setSearchValue(searchParams.get('q') || '');
  }, [searchParams]);

  const currentSort = searchParams.get('sort') || 'recent';
  const currentNiche = searchParams.get('niche') || '';
  const currentPlatform = searchParams.get('platform') || '';
  const currentVerified = searchParams.get('verified') === 'true';

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset to page 1 on filter change
      params.delete('page');
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        updateParams({ q: value || null });
      }, 300);
    },
    [updateParams]
  );

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    updateParams({ q: null });
  }, [updateParams]);

  const handleSortChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      updateParams({ sort: e.target.value });
    },
    [updateParams]
  );

  const handleNicheChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      updateParams({ niche: e.target.value || null });
    },
    [updateParams]
  );

  const handlePlatformChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      updateParams({ platform: e.target.value || null });
    },
    [updateParams]
  );

  const handleVerifiedChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateParams({ verified: e.target.checked ? 'true' : null });
    },
    [updateParams]
  );

  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    router.push(pathname);
  }, [router, pathname]);

  // Count active filters (excluding default sort)
  const activeFilterCount = [
    searchParams.get('q'),
    currentSort !== 'recent' ? currentSort : null,
    currentNiche,
    currentPlatform,
    currentVerified ? 'verified' : null,
  ].filter(Boolean).length;

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
          {/* Row 1: Search + Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search input */}
            <div className="flex-1">
              <label htmlFor="am-search" className="sr-only">
                Search affiliate marketers
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                  id="am-search"
                  type="text"
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder="Search affiliate marketers..."
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
              </div>
            </div>

            {/* Sort dropdown */}
            <div className="md:w-52">
              <label htmlFor="am-sort" className="sr-only">
                Sort by
              </label>
              <div className="relative">
                <select
                  id="am-sort"
                  value={currentSort}
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
          </div>

          {/* Row 2: Niche + Platform + Verified + Clear */}
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            {/* Niche dropdown */}
            <div className="md:w-48">
              <label htmlFor="am-niche" className="sr-only">
                Niche
              </label>
              <div className="relative">
                <select
                  id="am-niche"
                  value={currentNiche}
                  onChange={handleNicheChange}
                  className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent cursor-pointer"
                >
                  {NICHE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
              </div>
            </div>

            {/* Platform dropdown */}
            <div className="md:w-48">
              <label htmlFor="am-platform" className="sr-only">
                Platform
              </label>
              <div className="relative">
                <select
                  id="am-platform"
                  value={currentPlatform}
                  onChange={handlePlatformChange}
                  className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent cursor-pointer"
                >
                  {PLATFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
              </div>
            </div>

            {/* Verified Only checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={currentVerified}
                onChange={handleVerifiedChange}
                className="w-4 h-4 accent-biz-orange rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 whitespace-nowrap">Verified Only</span>
            </label>

            {/* Clear filters button */}
            {activeFilterCount > 0 && (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-offset-2 transition-colors whitespace-nowrap"
                >
                  Clear Filters ({activeFilterCount})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active filter tags */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {searchParams.get('q') && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Search:</span>
                <span>{searchParams.get('q')}</span>
              </div>
            )}
            {currentSort !== 'recent' && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Sort:</span>
                <span>{SORT_OPTIONS.find((o) => o.value === currentSort)?.label}</span>
              </div>
            )}
            {currentNiche && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Niche:</span>
                <span>{currentNiche}</span>
              </div>
            )}
            {currentPlatform && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Platform:</span>
                <span>{currentPlatform}</span>
              </div>
            )}
            {currentVerified && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-biz-orange/10 text-biz-orange rounded">
                <span className="font-medium">Verified Only</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AffiliateMarketerFilterBar;
