/**
 * OffersPageClient - Client Component for Offers Page
 *
 * Handles client-side interactivity including data fetching, state management,
 * and URL query parameter synchronization. Renders offer card grid with
 * loading and error states.
 *
 * @component Client Component (requires 'use client' directive)
 * @tier ADVANCED (map integration, complex state, pagination)
 * @phase Phase 2 - Client Component Shell & State Management
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * FEATURES (Phase 2):
 * - State management for offers, loading, errors, pagination
 * - Data fetching from /api/offers/search
 * - URL query parameter synchronization
 * - Loading skeletons and error states
 * - Placeholder for offer cards (Phase 4)
 *
 * DEFERRED TO FUTURE PHASES:
 * - Offer card components (Phase 4)
 * - Map integration (Phase 5)
 * - Filter/sort controls (Phase 6)
 * - Campaign scroller (Phase 7)
 *
 * @see docs/pages/layouts/offers/BRAIN_PLAN_OFFERS_PAGE.md
 * @see docs/pages/layouts/offers/phases/PHASE_2_BRAIN_PLAN.md
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AlertCircle, Clock, WifiOff, Tag } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { OfferWithCoordinates, OfferDisplayMode } from '@/features/offers/types';

import { OfferCard } from '@/features/offers/components/OfferCard';
import { OfferCardHorizontal } from '@/features/offers/components/OfferCardHorizontal';

const OffersMap = dynamic(
  () => import('@/features/offers/components/OffersMap').then(mod => mod.OffersMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading map...</span>
      </div>
    )
  }
);

const OffersFilterBar = dynamic(
  () => import('@/features/offers/components/OffersFilterBar').then(mod => ({ default: mod.OffersFilterBar })),
  { ssr: true, loading: () => <div className="h-12 bg-gray-100 animate-pulse rounded" /> }
);

const OffersCampaignSection = dynamic(
  () => import('@/features/offers/components/OffersCampaignSection').then(mod => ({ default: mod.OffersCampaignSection })),
  { ssr: false, loading: () => null }
);

const Pagination = dynamic(
  () => import('@/components/listings/Pagination'),
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
interface OffersSearchResponse {
  success: boolean;
  data?: {
    items: OfferWithCoordinates[];
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
 * Loading skeleton for offers grid
 */
function OffersSkeleton() {
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
 * Loading skeleton for list view
 */
function OffersListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row"
        >
          <div className="w-full sm:w-48 md:w-56 h-40 sm:h-auto sm:min-h-[160px] bg-gray-200" />
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
 * Enhanced error display with retry functionality
 */
interface OffersErrorProps {
  message: string;
  errorCode?: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

function OffersError({
  message,
  errorCode,
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
}: OffersErrorProps) {
  const isRateLimited = errorCode === 'RATE_LIMITED';
  const isNetworkError = errorCode === 'NETWORK';
  const canRetry = retryCount < maxRetries && !isRateLimited;

  return (
    <div className={`border rounded-lg p-6 text-center ${
      isRateLimited ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="mb-4">
        {isRateLimited ? (
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
        ) : isNetworkError ? (
          <WifiOff className="w-12 h-12 text-red-500 mx-auto" />
        ) : (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
      </div>
      <h3 className={`text-lg font-semibold mb-2 ${
        isRateLimited ? 'text-amber-800' : 'text-red-800'
      }`}>
        {isRateLimited ? 'Too Many Requests' :
         isNetworkError ? 'Connection Error' :
         'Unable to Load Offers'}
      </h3>
      <p className={`mb-4 ${isRateLimited ? 'text-amber-700' : 'text-red-700'}`}>
        {isRateLimited
          ? 'Please wait a moment before trying again.'
          : message}
      </p>
      {retryCount > 0 && canRetry && (
        <p className="text-sm text-gray-500 mb-4">
          Attempt {retryCount} of {maxRetries}
        </p>
      )}
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
    </div>
  );
}

/**
 * Empty state when no offers are found
 */
function OffersEmpty() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <Tag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        No Offers Found
      </h3>
      <p className="text-gray-600">
        Try adjusting your search or filters to find exclusive offers and deals.
      </p>
    </div>
  );
}

/**
 * OffersPageClient - Main client component for offers page
 */
export function OffersPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // State management
  const [offers, setOffers] = useState<OfferWithCoordinates[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [displayMode, setDisplayMode] = useState<OfferDisplayMode>('grid');
  const [highlightedOfferId, setHighlightedOfferId] = useState<number | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 20,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });

  const MAX_RETRIES = 3;

  // Extract query parameters
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentSort = searchParams.get('sort') || 'priority';
  const currentQuery = searchParams.get('q') || '';
  const currentDisplayMode = (searchParams.get('view') as OfferDisplayMode) || 'grid';

  // Sync URL to state for display mode
  useEffect(() => {
    setDisplayMode(currentDisplayMode);
  }, [currentDisplayMode]);

  /**
   * Fetch offers from API
   * [PHASE_3_API]: Will fetch from /api/offers/search
   */
  const fetchOffers = useCallback(async () => {
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

      // [PHASE_3_API]: This endpoint will be created in Phase 3
      const response = await fetch(`/api/offers/search?${params.toString()}`, {
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
        if (response.status === 404) {
          // API not yet implemented - show placeholder state
          setOffers([]);
          setPagination({
            page: 1,
            pageSize: 20,
            total: 0,
            hasNext: false,
            hasPrev: false,
          });
          return;
        }
        if (response.status >= 500) {
          throw Object.assign(new Error('Server error'), { code: 'INTERNAL' });
        }
      }

      const result: OffersSearchResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to load offers');
      }

      setOffers(result.data.items);
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

        if (message.includes('rate') || message.includes('429')) {
          code = 'RATE_LIMITED';
        } else if (err.name === 'TypeError' && message.includes('fetch')) {
          code = 'NETWORK';
          message = 'Unable to connect. Please check your internet connection.';
        }
      }

      setError(message);
      setErrorCode(code);
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentSort, currentQuery]);

  // Fetch offers when URL params change
  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  /**
   * Handle retry with exponential backoff
   */
  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) return;

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);

    setTimeout(() => {
      setIsRetrying(false);
      fetchOffers();
    }, delay);
  }, [retryCount, fetchOffers]);

  /**
   * Handle map toggle
   */
  const handleMapToggle = useCallback(() => {
    setIsMapVisible(prev => !prev);
  }, []);

  /**
   * Handle marker click from map (Phase 5)
   */
  const handleMarkerClick = useCallback((offerId: number) => {
    const element = document.getElementById(`offer-${offerId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-biz-orange');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-biz-orange');
      }, 2000);
    }
  }, []);

  /**
   * Update URL query parameters
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
   */
  const handleDisplayModeChange = useCallback((mode: OfferDisplayMode) => {
    setDisplayMode(mode);
    updateQueryParams({ view: mode });
  }, [updateQueryParams]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Offers & Deals
        </h1>
        <p className="text-gray-600">
          Browse exclusive offers and deals from local businesses.
        </p>
      </div>

      {/* Controls Area */}
      <OffersFilterBar
        className="mb-6"
        displayMode={displayMode}
        onDisplayModeChange={handleDisplayModeChange}
        isMapVisible={isMapVisible}
        onMapToggle={handleMapToggle}
      />

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Map Container */}
        {isMapVisible && (
          <div className="hidden lg:block lg:w-1/2 xl:w-2/5">
            <div className="sticky top-4">
              <OffersMap
                offers={offers}
                highlightedOfferId={highlightedOfferId}
                onMarkerClick={handleMarkerClick}
                onMarkerHover={setHighlightedOfferId}
                className="h-[600px] rounded-lg overflow-hidden shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Offers Grid */}
        <div className="flex-1">
          {/* Results Count */}
          {!isLoading && !error && (
            <div className="mb-4 text-sm text-gray-600">
              Showing {offers.length} of {pagination.total} offers
              {currentQuery && (
                <span className="ml-1">
                  for &quot;<span className="font-medium">{currentQuery}</span>&quot;
                </span>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            displayMode === 'grid' ? <OffersSkeleton /> : <OffersListSkeleton />
          )}

          {/* Error State */}
          {error && !isLoading && (
            <OffersError
              message={error}
              errorCode={errorCode}
              onRetry={handleRetry}
              isRetrying={isRetrying}
              retryCount={retryCount}
              maxRetries={MAX_RETRIES}
            />
          )}

          {/* Empty State */}
          {!isLoading && !error && offers.length === 0 && <OffersEmpty />}

          {/* Offers Display */}
          {!isLoading && !error && offers.length > 0 && (
            displayMode === 'grid' ? (
              <section aria-labelledby="offers-heading">
                <h2 id="offers-heading" className="sr-only">
                  Offers & Deals Results
                </h2>
                <div className={`grid gap-6 ${
                  isMapVisible
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                {offers.map((offer, index) => (
                  <div
                    key={offer.id}
                    id={`offer-${offer.id}`}
                    onMouseEnter={() => setHighlightedOfferId(offer.id)}
                    onMouseLeave={() => setHighlightedOfferId(null)}
                  >
                    <OfferCard offer={offer} index={index} />
                  </div>
                ))}
                </div>
              </section>
            ) : (
              <section aria-labelledby="offers-list-heading">
                <h2 id="offers-list-heading" className="sr-only">
                  Offers & Deals List View
                </h2>
                <div className="space-y-4">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    id={`offer-${offer.id}`}
                    onMouseEnter={() => setHighlightedOfferId(offer.id)}
                    onMouseLeave={() => setHighlightedOfferId(null)}
                  >
                    <OfferCardHorizontal offer={offer} />
                  </div>
                ))}
                </div>
              </section>
            )
          )}

          {/* Pagination Controls */}
          {!isLoading && !error && offers.length > 0 && (
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              hasNext={pagination.hasNext}
              hasPrev={pagination.hasPrev}
              basePath="/offers"
              className="mt-8"
            />
          )}
        </div>
      </div>

      {/* Campaign Promotions Section - Phase 7 Complete */}
      <OffersCampaignSection className="mt-12" />
    </div>
  );
}

export default OffersPageClient;
