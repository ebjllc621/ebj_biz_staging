/**
 * ListingsPageClient - Client Component for Listings Page
 *
 * Handles client-side interactivity including data fetching, state management,
 * and URL query parameter synchronization. Renders ListingCard grid with
 * loading and error states.
 *
 * @component Client Component (requires 'use client' directive)
 * @tier ADVANCED (complex state, API integration, URL sync)
 * @phase Phase 2 - Client Component Shell & State Management
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * FEATURES (Phase 2):
 * - State management for listings, loading, errors, pagination
 * - Data fetching from /api/listings/search
 * - URL query parameter synchronization
 * - Loading skeletons and error states
 * - ListingCard grid rendering
 *
 * DEFERRED TO FUTURE PHASES:
 * - Map integration (Phase 3)
 * - Filter/sort controls (Phase 4)
 * - Campaign scroller (Phase 5)
 * - Pagination controls (Phase 6)
 * - Display toggle grid/list (Phase 7)
 *
 * @see docs/pages/layouts/listings/BRAIN_PLAN_LISTINGS_PAGE.md
 * @see docs/pages/layouts/listings/phases/PHASE_2_BRAIN_PLAN.md
 */
'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AlertCircle, Clock, WifiOff } from 'lucide-react';
import { ListingCard } from '@/features/homepage/components/ListingCard';
import { ListingCardHorizontal } from '@/features/listings/components/ListingCardHorizontal';
import type { ListingWithCoordinates, DisplayMode } from '@/features/listings/types';

const ListingsMap = dynamic(
  () => import('@/features/listings/components/ListingsMap').then(mod => mod.ListingsMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading map...</span>
      </div>
    )
  }
);

const ListingsFilterBar = dynamic(
  () => import('@/features/listings/components/ListingsFilterBar').then(mod => ({ default: mod.ListingsFilterBar })),
  { ssr: true, loading: () => <div className="h-12 bg-gray-100 animate-pulse rounded" /> }
);

const CampaignSection = dynamic(
  () => import('@/features/listings/components/CampaignSection').then(mod => ({ default: mod.CampaignSection })),
  { ssr: false, loading: () => null }
);

const Pagination = dynamic(
  () => import('@/components/listings/Pagination'),
  { ssr: true }
);

const CategorySubscribeButton = dynamic(
  () => import('@features/listings/components/CategorySubscribeButton').then(mod => ({ default: mod.CategorySubscribeButton })),
  { ssr: false }
);

/**
 * Pagination state from API response
 */
interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * API response envelope format (canonical apiHandler format)
 * @see src/core/api/apiHandler.ts - createSuccessResponse
 */
interface ListingsSearchResponse {
  success: boolean;
  data?: {
    items: ListingWithCoordinates[];
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId: string;
    timestamp: Date;
    version: string;
  };
}

/**
 * Loading skeleton for listings grid
 * Displays placeholder cards while data is loading
 */
function ListingsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm"
        >
          <div className="h-40 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ListingsListSkeleton - Loading skeleton for list view
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 8 - Error Handling & Edge Cases
 */
function ListingsListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row"
        >
          {/* Image placeholder */}
          <div className="w-full sm:w-48 md:w-56 h-40 sm:h-auto sm:min-h-[160px] bg-gray-200" />
          {/* Content placeholder */}
          <div className="flex-1 p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/6" />
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Enhanced error display with retry functionality and error code awareness
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 8 - Error Handling & Edge Cases
 */
interface ListingsErrorProps {
  message: string;
  errorCode?: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

function ListingsError({
  message,
  errorCode,
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
}: ListingsErrorProps) {
  const isRateLimited = errorCode === 'RATE_LIMITED';
  const isNetworkError = errorCode === 'NETWORK';
  const canRetry = retryCount < maxRetries && !isRateLimited;

  return (
    <div className={`border rounded-lg p-6 text-center ${
      isRateLimited ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
    }`}>
      {/* Icon */}
      <div className="mb-4">
        {isRateLimited ? (
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
        ) : isNetworkError ? (
          <WifiOff className="w-12 h-12 text-red-500 mx-auto" />
        ) : (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
      </div>

      {/* Title */}
      <h3 className={`text-lg font-semibold mb-2 ${
        isRateLimited ? 'text-amber-800' : 'text-red-800'
      }`}>
        {isRateLimited ? 'Too Many Requests' :
         isNetworkError ? 'Connection Error' :
         'Unable to Load Listings'}
      </h3>

      {/* Message */}
      <p className={`mb-4 ${isRateLimited ? 'text-amber-700' : 'text-red-700'}`}>
        {isRateLimited
          ? 'Please wait a moment before trying again.'
          : message}
      </p>

      {/* Retry info */}
      {retryCount > 0 && canRetry && (
        <p className="text-sm text-gray-500 mb-4">
          Attempt {retryCount} of {maxRetries}
        </p>
      )}

      {/* Retry button */}
      {canRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className={`px-4 py-2 rounded-md transition-colors ${
            isRetrying
              ? 'bg-gray-400 cursor-not-allowed'
              : isRateLimited
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}

      {/* Rate limit message */}
      {isRateLimited && (
        <p className="mt-4 text-sm text-amber-600">
          Automatic retry in 60 seconds
        </p>
      )}
    </div>
  );
}

/**
 * Empty state when no listings are found
 */
function ListingsEmpty() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        No Listings Found
      </h3>
      <p className="text-gray-600">
        Try adjusting your search or filters to find what you&apos;re looking for.
      </p>
    </div>
  );
}

/**
 * Memoized listing card wrapper to prevent unnecessary re-renders
 * Only re-renders when listing data changes
 */
const MemoizedListingItem = memo(function MemoizedListingItem({
  listing,
  id,
  index
}: {
  listing: ListingWithCoordinates;
  id: string;
  index: number;
}) {
  return (
    <div id={id}>
      <ListingCard listing={listing} index={index} />
    </div>
  );
});

/**
 * ListingsPageClient - Main client component for listings page
 */
export function ListingsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // State management
  const [listings, setListings] = useState<ListingWithCoordinates[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [highlightedListingId, setHighlightedListingId] = useState<number | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 20,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Silent geolocation for claimed listing priority (200mi radius)
  // Using ref to ensure fetch always gets the latest location (avoids closure issues)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [geoAttempted, setGeoAttempted] = useState(false);

  const MAX_RETRIES = 3;

  // Silent geolocation detection on mount (no UI feedback, fails silently)
  // Sets geoAttempted=true when complete (success or failure) to trigger initial fetch
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          userLocationRef.current = location;
          setUserLocation(location);
          setGeoAttempted(true);
        },
        () => {
          // Fail silently - geolocation is optional for priority sorting
          setGeoAttempted(true);
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 600000 }
      );
    } else {
      // No geolocation API available
      setGeoAttempted(true);
    }
  }, []);

  // Extract query parameters
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentSort = searchParams.get('sort') || 'recent';
  const currentQuery = searchParams.get('q') || '';
  const currentDisplayMode = (searchParams.get('view') as DisplayMode) || 'grid';
  const currentCategory = searchParams.get('category') || '';
  const sourceListingId = searchParams.get('fromListing') || '';

  // Sync URL to state for display mode
  useEffect(() => {
    setDisplayMode(currentDisplayMode);
  }, [currentDisplayMode]);

  /**
   * Fetch listings from API
   * Uses legacy envelope format: { ok, data, error, meta }
   */
  const fetchListings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query string from current params
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('pageSize', '20');
      params.set('sort', currentSort);
      if (currentQuery) {
        params.set('q', currentQuery);
      }
      // Category filter
      if (currentCategory) {
        params.set('category', currentCategory);
      }
      // Source listing ID for priority display (listing clicked from to get here)
      if (sourceListingId) {
        params.set('fromListing', sourceListingId);
      }
      // Silent claimed listing priority: pass user location for 200mi radius sorting
      // Use ref to ensure we always have the latest location (avoids React closure issues)
      const currentLocation = userLocationRef.current;
      if (currentLocation) {
        params.set('userLat', currentLocation.lat.toString());
        params.set('userLng', currentLocation.lng.toString());
      }

      const response = await fetch(`/api/listings/search?${params.toString()}`, {
        credentials: 'include',
      });

      // Detect error codes from HTTP status
      if (!response.ok) {
        if (response.status === 429) {
          throw Object.assign(new Error('Rate limited'), { code: 'RATE_LIMITED' });
        }
        if (response.status === 408 || response.status === 504) {
          throw Object.assign(new Error('Request timeout'), { code: 'TIMEOUT' });
        }
        if (response.status >= 500) {
          throw Object.assign(new Error('Server error'), { code: 'INTERNAL' });
        }
      }

      const result: ListingsSearchResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to load listings');
      }

      setListings(result.data.items);
      setPagination({
        page: result.data.page,
        pageSize: result.data.pageSize,
        total: result.data.total,
        hasNext: result.data.hasNext,
        hasPrev: result.data.hasPrev,
      });
    } catch (err) {
      let code = 'INTERNAL';
      let message = 'An unexpected error occurred';

      if (err instanceof Error) {
        message = err.message;

        // Detect rate limiting from response
        if (message.includes('rate') || message.includes('429')) {
          code = 'RATE_LIMITED';
        }
        // Detect network errors
        else if (err.name === 'TypeError' && message.includes('fetch')) {
          code = 'NETWORK';
          message = 'Unable to connect. Please check your internet connection.';
        }
      }

      setError(message);
      setErrorCode(code);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentSort, currentQuery, currentCategory, sourceListingId]); // userLocation handled via ref to avoid closure issues

  // Fetch listings when URL params change (waits for geolocation attempt first)
  useEffect(() => {
    if (geoAttempted) {
      fetchListings();
    }
  }, [fetchListings, geoAttempted]);

  /**
   * Handle retry with exponential backoff
   */
  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) return;

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);

    setTimeout(() => {
      setIsRetrying(false);
      fetchListings();
    }, delay);
  }, [retryCount, fetchListings]);

  /**
   * Handle marker click from map
   * Scrolls to listing card in grid and highlights it
   */
  const handleMarkerClick = useCallback((listingId: number) => {
    // Scroll to listing card in grid
    const element = document.getElementById(`listing-${listingId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Brief highlight effect
      element.classList.add('ring-2', 'ring-biz-orange');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-biz-orange');
      }, 2000);
    }
  }, []);

  /**
   * Update URL query parameters
   * Used by filter/sort controls (Phase 4)
   */
  const updateQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Reset to page 1 when filters change (except when changing page itself)
      if (!('page' in updates)) {
        params.set('page', '1');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(`${pathname}?${params.toString()}` as any, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  /**
   * Handle display mode change
   * Updates URL query param and local state
   */
  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
    updateQueryParams({ view: mode });
  }, [updateQueryParams]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Discover Listings You&apos;ll Love!
        </h1>
        <p className="text-gray-600">
          Discover local listings and connect with professionals in your area.
        </p>
      </div>

      {/* Phase 4: Filter/Sort Controls with Display & Map Toggles */}
      <ListingsFilterBar
        className="mb-6"
        displayMode={displayMode}
        onDisplayModeChange={handleDisplayModeChange}
        isMapVisible={isMapVisible}
        onMapToggle={() => setIsMapVisible(prev => !prev)}
        hasUserLocation={!!userLocation}
      />

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Map Container */}
        {isMapVisible && (
          <div className="hidden lg:block lg:w-1/2 xl:w-2/5">
            <div className="sticky top-4">
              <ListingsMap
                listings={listings}
                onMarkerClick={handleMarkerClick}
                onMarkerHover={setHighlightedListingId}
                highlightedListingId={highlightedListingId}
                userLocation={userLocation}
                className="h-[600px] rounded-lg overflow-hidden shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Listings Grid */}
        <div className="flex-1">
          {/* Results Count */}
          {!isLoading && !error && (
            <div className="mb-4 text-sm text-gray-600">
              Showing {listings.length} of {pagination.total} listings
              {currentQuery && (
                <span className="ml-1">
                  for &quot;<span className="font-medium">{currentQuery}</span>&quot;
                </span>
              )}
            </div>
          )}

          {/* Category Subscribe Button - shown when category filter is active */}
          {!isLoading && !error && currentCategory && (
            <div className="mb-4">
              <CategorySubscribeButton
                categoryId={parseInt(currentCategory, 10)}
                categoryName={currentCategory}
                size="sm"
              />
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            displayMode === 'grid' ? <ListingsSkeleton /> : <ListingsListSkeleton />
          )}

          {/* Error State */}
          {error && !isLoading && (
            <ListingsError
              message={error}
              errorCode={errorCode}
              onRetry={handleRetry}
              isRetrying={isRetrying}
              retryCount={retryCount}
              maxRetries={MAX_RETRIES}
            />
          )}

          {/* Empty State */}
          {!isLoading && !error && listings.length === 0 && <ListingsEmpty />}

          {/* Listings Display */}
          {!isLoading && !error && listings.length > 0 && (
            displayMode === 'grid' ? (
              <section aria-labelledby="listings-heading">
                <h2 id="listings-heading" className="sr-only">
                  Business Listings Results
                </h2>
                <div className={`grid gap-6 ${
                  isMapVisible
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                {listings.map((listing, index) => (
                  <div
                    key={listing.id}
                    onMouseEnter={() => setHighlightedListingId(listing.id)}
                    onMouseLeave={() => setHighlightedListingId(null)}
                  >
                    <MemoizedListingItem
                      listing={listing}
                      index={index}
                      id={`listing-${listing.id}`}
                    />
                  </div>
                ))}
                </div>
              </section>
            ) : (
              <section aria-labelledby="listings-list-heading">
                <h2 id="listings-list-heading" className="sr-only">
                  Business Listings List View
                </h2>
                <div className="space-y-4">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    id={`listing-${listing.id}`}
                    onMouseEnter={() => setHighlightedListingId(listing.id)}
                    onMouseLeave={() => setHighlightedListingId(null)}
                  >
                    <ListingCardHorizontal listing={listing} />
                  </div>
                ))}
                </div>
              </section>
            )
          )}

          {/* Pagination Controls */}
          {!isLoading && !error && listings.length > 0 && (
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              hasNext={pagination.hasNext}
              hasPrev={pagination.hasPrev}
              className="mt-8"
            />
          )}
        </div>
      </div>

      {/* Campaign Promotions - filtered by category when on category search */}
      <CampaignSection className="mt-12" category={currentCategory || undefined} />
    </div>
  );
}

export default ListingsPageClient;
