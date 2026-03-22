/**
 * ListingSelector - Dropdown Component for Selecting Listings
 *
 * @description Listing selection dropdown with multiple states (loading, error, no listings, single, multiple)
 * @component Client Component (uses hooks, state)
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 5 - Listing Selector & Context
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_5_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary wrapper (STANDARD tier)
 * - MUST use CSS variables from dashboard-theme.css (--dashboard-* namespace)
 * - NO hardcoded colors
 * - Lucide React icons only
 * - Handles collapsed sidebar state
 *
 * STATES:
 * - Loading: Shows skeleton loader
 * - Error: Shows error message with retry button
 * - No Listings: Shows CTA to create listing
 * - Single Listing: Shows listing card only (no dropdown)
 * - Multiple Listings: Shows dropdown selector
 */
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NewListingModal } from '@features/listings/components/NewListingModal';
import { useListingContextOptional } from '../context';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ListingSelectorProps {
  /** Whether sidebar is collapsed (desktop only) */
  isCollapsed?: boolean;
  /** Callback when listing selection changes (for parent component) */
  onListingChange?: (listingId: number | null, tier?: string) => void;
}

// ============================================================================
// LISTINGSELECTOR COMPONENT
// ============================================================================

function ListingSelectorContent({ isCollapsed = false, onListingChange }: ListingSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Use optional context - may be null when outside /dashboard/listings/* routes
  const listingContext = useListingContextOptional();

  // ============================================================================
  // STANDALONE STATE (used when context is null)
  // ============================================================================

  const [standaloneListings, setStandaloneListings] = useState<Array<{
    id: number;
    name: string;
    slug: string;
    tier: string;
    status: string;
    approved: string;
    logo_url: string | null;
    last_update: string;
    completeness_percent: number;
    claimed: boolean;
  }>>([]);
  const [standaloneSelectedId, setStandaloneSelectedId] = useState<number | null>(null);
  const [standaloneLoading, setStandaloneLoading] = useState(true);
  const [standaloneError, setStandaloneError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  // Fetch listings independently when context is null
  useEffect(() => {
    if (listingContext || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchListings = async () => {
      try {
        setStandaloneLoading(true);
        setStandaloneError(null);

        const response = await fetch('/api/listings/mine', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }

        const data = await response.json();
        const listings = data.data?.listings || [];

        setStandaloneListings(listings);

        // Auto-select from localStorage or first listing
        // Note: Uses same localStorage key as ListingContext ('bk_selected_listing_id')
        if (listings.length > 0) {
          const savedId = typeof window !== 'undefined'
            ? localStorage.getItem('bk_selected_listing_id')
            : null;
          const savedListing = savedId
            ? listings.find((l: { id: number }) => l.id === Number(savedId))
            : null;
          const selectedEntry = savedListing ?? listings[0] ?? null;
          const selectedId = selectedEntry?.id ?? null;
          setStandaloneSelectedId(selectedId);
          onListingChange?.(selectedId, selectedEntry?.tier);
        }
      } catch (err) {
        setStandaloneError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setStandaloneLoading(false);
      }
    };

    void fetchListings();
  }, [listingContext, onListingChange]);

  // ============================================================================
  // UNIFIED VALUES (prefer context, fall back to standalone)
  // ============================================================================

  const userListings = listingContext?.userListings ?? standaloneListings;
  const selectedListingId = listingContext?.selectedListingId ?? standaloneSelectedId;
  const selectedListing = userListings.find(l => l.id === selectedListingId) ?? null;
  const isLoading = listingContext?.isLoading ?? standaloneLoading;
  const error = listingContext?.error ?? standaloneError;
  const hasListings = userListings.length > 0;
  const hasMultipleListings = userListings.length > 1;

  // Unified setSelectedListingId
  // Note: Uses same localStorage key as ListingContext ('bk_selected_listing_id')
  const setSelectedListingId = useCallback((id: number) => {
    if (listingContext) {
      listingContext.setSelectedListingId(id);
    } else {
      setStandaloneSelectedId(id);
      if (typeof window !== 'undefined') {
        // Use same key as ListingContext for consistency
        localStorage.setItem('bk_selected_listing_id', String(id));
      }
    }
    // Find the listing to pass its tier along with the ID
    const listing = userListings.find(l => l.id === id);
    onListingChange?.(id, listing?.tier);
  }, [listingContext, onListingChange, userListings]);

  // Unified refreshListings
  const refreshListings = useCallback(async () => {
    if (listingContext) {
      await listingContext.refreshListings();
    } else {
      hasFetchedRef.current = false;
      setStandaloneLoading(true);
      // Re-trigger the fetch effect
      const response = await fetch('/api/listings/mine', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setStandaloneListings(data.data?.listings || []);
      }
      setStandaloneLoading(false);
    }
  }, [listingContext]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectListing = useCallback((listingId: number) => {
    setDropdownOpen(false);

    // Smart navigation based on current URL pattern
    // Pattern A: /dashboard/listings/[oldId]/[subpath] → /dashboard/listings/[newId]/[subpath]
    // Pattern B: /dashboard/listings (no ID) → just update context + refresh
    const listingPageMatch = pathname.match(/^\/dashboard\/listings\/(\d+)(\/.*)?$/);

    const matchedListingId = listingPageMatch?.[1];
    if (listingPageMatch && matchedListingId) {
      // Pattern A: On a listing-specific page with ID in URL
      const currentListingId = parseInt(matchedListingId, 10);
      const subpath = listingPageMatch[2] ?? ''; // e.g., '/offers' or ''

      // Only navigate if changing to a different listing
      if (currentListingId !== listingId) {
        const newPath = `/dashboard/listings/${listingId}${subpath}`;

        // Update context first so child components know about the change
        setSelectedListingId(listingId);

        // Navigate to the new URL - use window.location for a full page refresh
        // This ensures all data is re-fetched for the new listing
        window.location.href = newPath;
      } else {
        // Same listing, just update context (shouldn't normally happen)
        setSelectedListingId(listingId);
      }
    } else if (pathname === '/dashboard/listings' || pathname === '/dashboard/listings/') {
      // Pattern B: On the main listings dashboard (no listing ID in URL)
      // Update context and refresh to re-fetch data for new listing
      setSelectedListingId(listingId);

      // Force page refresh to ensure all components re-fetch with new listing
      window.location.reload();
    } else {
      // Other pages (e.g., /dashboard or unrelated routes)
      // Navigate to the listing manager dashboard
      setSelectedListingId(listingId);
      window.location.href = '/dashboard/listings';
    }
  }, [setSelectedListingId, pathname]);

  const handleCreateListing = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCreateSuccess = useCallback(async (_listingId: number) => {
    setCreateModalOpen(false);
    await refreshListings();
    router.push('/dashboard/listings');
  }, [refreshListings, router]);

  const handleRetry = useCallback(() => {
    void refreshListings();
  }, [refreshListings]);

  // ============================================================================
  // OUTSIDE CLICK HANDLING
  // ============================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  // ============================================================================
  // KEYBOARD HANDLING
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [dropdownOpen]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Render listing logo or fallback
   */
  const renderListingLogo = (listing: typeof selectedListing, size: 'sm' | 'md' = 'md') => {
    if (!listing) return null;

    const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    if (listing.logo_url && !imageError) {
      return (
        <Image
          src={listing.logo_url}
          alt={listing.name}
          width={size === 'sm' ? 32 : 40}
          height={size === 'sm' ? 32 : 40}
          className={`${sizeClasses} rounded-md object-cover flex-shrink-0`}
          onError={() => setImageError(true)}
        />
      );
    }

    // Fallback: First letter of business name
    return (
      <div
        className={`${sizeClasses} rounded-md flex items-center justify-center font-semibold ${textSize} flex-shrink-0`}
        style={{
          backgroundColor: 'var(--dashboard-primary)',
          color: 'var(--dashboard-primary-contrast)'
        }}
      >
        {listing.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  /**
   * Render tier badge
   */
  const renderTierBadge = (tier: string) => {
    return (
      <span
        className="px-2 py-0.5 text-xs font-medium rounded"
        style={{
          backgroundColor: 'var(--dashboard-bg-active-subtle)',
          color: 'var(--dashboard-text-accessible)'
        }}
      >
        {tier}
      </span>
    );
  };

  // ============================================================================
  // RENDER STATES
  // ============================================================================

  // NOTE: No early return for missing context - we now fetch listings independently
  // when context is null (standalone mode). The unified values above handle this.

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-md flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-md border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-red-800">Failed to load listings</div>
            <div className="text-xs text-red-600 mt-1">{error}</div>
            <button
              onClick={handleRetry}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // NO LISTINGS STATE
  if (!hasListings) {
    // Collapsed: Show compact CTA
    if (isCollapsed) {
      return (
        <>
          <div className="px-2 py-2">
            <button
              onClick={handleCreateListing}
              className="w-full p-2 rounded-md transition-colors flex items-center justify-center"
              style={{
                backgroundColor: 'var(--dashboard-bg-active-subtle)',
                color: 'var(--dashboard-text-primary)'
              }}
              title="Create Listing"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <NewListingModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onSuccess={handleCreateSuccess}
          />
        </>
      );
    }

    // Expanded: Show full CTA
    return (
      <>
        <div className="px-3 py-2">
          <div className="p-4 rounded-md border-2 border-dashed text-center" style={{ borderColor: 'var(--dashboard-border-light)' }}>
            <div className="text-sm font-medium text-gray-700 mb-2">No listings yet</div>
            <button
              onClick={handleCreateListing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--dashboard-primary)',
                color: 'var(--dashboard-primary-contrast)'
              }}
            >
              <Plus className="w-4 h-4" />
              Create Listing
            </button>
          </div>
        </div>
        <NewListingModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </>
    );
  }

  // SINGLE LISTING STATE (Card only, no dropdown)
  if (!hasMultipleListings && selectedListing) {
    // Collapsed: Show logo only
    if (isCollapsed) {
      return (
        <div className="px-2 py-2">
          <div
            className="p-2 rounded-md border flex items-center justify-center"
            style={{ borderColor: 'var(--dashboard-border-light)' }}
            title={selectedListing.name}
          >
            {renderListingLogo(selectedListing, 'sm')}
          </div>
        </div>
      );
    }

    // Expanded: Show full card
    return (
      <div className="px-3 py-2">
        <div className="p-3 rounded-md border" style={{ borderColor: 'var(--dashboard-border-light)' }}>
          <div className="flex items-center gap-3">
            {renderListingLogo(selectedListing)}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate mb-1">
                {selectedListing.name}
              </div>
              <div className="flex items-center gap-2">
                {renderTierBadge(selectedListing.tier)}
                <span className="text-xs text-gray-500">
                  {selectedListing.completeness_percent}% Complete
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MULTIPLE LISTINGS STATE (Dropdown selector)
  if (hasMultipleListings && selectedListing) {
    // Collapsed: Show logo only with indicator
    if (isCollapsed) {
      return (
        <div className="px-2 py-2" ref={dropdownRef}>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full p-2 rounded-md border transition-colors flex items-center justify-center relative"
              style={{
                borderColor: dropdownOpen ? 'var(--dashboard-border-primary)' : 'var(--dashboard-border-light)',
                backgroundColor: dropdownOpen ? 'var(--dashboard-bg-hover)' : 'transparent'
              }}
              title={selectedListing.name}
            >
              {renderListingLogo(selectedListing, 'sm')}
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--dashboard-primary)' }} />
            </button>

            {/* Dropdown Menu - Positioned to right of sidebar */}
            {dropdownOpen && (
              <div
                className="absolute left-full top-0 ml-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                style={{ maxHeight: '400px', overflowY: 'auto' }}
              >
                {userListings.map(listing => (
                  <button
                    key={listing.id}
                    onClick={() => handleSelectListing(listing.id)}
                    className={`w-full px-3 py-2 text-left transition-colors ${
                      listing.id === selectedListingId ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {renderListingLogo(listing, 'sm')}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {listing.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {renderTierBadge(listing.tier)}
                          <span className="text-xs text-gray-500">
                            {listing.completeness_percent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Expanded: Show full dropdown
    return (
      <div className="px-3 py-2" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full p-3 rounded-md border transition-colors"
            style={{
              borderColor: dropdownOpen ? 'var(--dashboard-border-primary)' : 'var(--dashboard-border-light)',
              backgroundColor: dropdownOpen ? 'var(--dashboard-bg-hover)' : 'transparent'
            }}
          >
            <div className="flex items-center gap-3">
              {renderListingLogo(selectedListing)}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-semibold text-gray-900 truncate mb-1">
                  {selectedListing.name}
                </div>
                <div className="flex items-center gap-2">
                  {renderTierBadge(selectedListing.tier)}
                  <span className="text-xs text-gray-500">
                    {selectedListing.completeness_percent}% Complete
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-600 transition-transform flex-shrink-0 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
              style={{ maxHeight: '400px', overflowY: 'auto' }}
            >
              {userListings.map(listing => (
                <button
                  key={listing.id}
                  onClick={() => handleSelectListing(listing.id)}
                  className={`w-full px-3 py-2 text-left transition-colors ${
                    listing.id === selectedListingId ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {renderListingLogo(listing, 'sm')}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {listing.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {renderTierBadge(listing.tier)}
                        <span className="text-xs text-gray-500">
                          {listing.completeness_percent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback (should never reach here)
  return null;
}

/**
 * ListingSelector - Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export function ListingSelector(props: ListingSelectorProps) {
  return (
    <ErrorBoundary componentName="ListingSelector">
      <ListingSelectorContent {...props} />
    </ErrorBoundary>
  );
}

export default ListingSelector;
