/**
 * ExternalReviewsManager - External Review Sources Manager
 *
 * @description Dashboard UI for listing owners to connect and manage external
 *   review providers (Google Places) for their listing.
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6B - Task 6.6c: ExternalReviewsManager Component
 * @authority docs/components/review/phases/PHASE_6B_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - fetchWithCsrf for POST requests (connect/disconnect)
 * - credentials: 'include' for GET requests
 * - Tier gate: connect section hidden for essentials/plus tiers
 * - ErrorBoundary is applied at the page level, not here
 */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  Search,
  Star,
  Loader2,
  AlertCircle,
  MapPin,
  Unplug,
  PlugZap,
  RefreshCw
} from 'lucide-react';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPES
// ============================================================================

interface ConnectedProviderSource {
  id: number;
  rating_summary: number | null;
  review_count: number | null;
  last_sync_at: string | null;
  canonical_url: string | null;
  status: string;
}

interface ConnectedProviderReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time: string;
}

interface ConnectedProvider {
  provider: string;
  source: ConnectedProviderSource;
  reviews: ConnectedProviderReview[];
}

// Google Places result shape
interface GoogleSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating: number | null;
  user_ratings_total: number | null;
}

// Yelp result shape
interface YelpSearchResult {
  id: string;
  name: string;
  location: { display_address: string[] };
  rating: number | null;
  review_count: number | null;
  url: string;
}

// Facebook result shape
interface FacebookSearchResult {
  id: string;
  name: string;
  location?: { city: string; country: string };
  overall_star_rating?: number;
  rating_count?: number;
  link: string;
}

type SearchResult = GoogleSearchResult | YelpSearchResult | FacebookSearchResult;

function getResultId(result: SearchResult, provider: string): string {
  if (provider === 'google') return (result as GoogleSearchResult).place_id;
  if (provider === 'yelp') return (result as YelpSearchResult).id;
  return (result as FacebookSearchResult).id;
}

function getResultCanonicalUrl(result: SearchResult, provider: string): string | null {
  if (provider === 'google') return null;
  if (provider === 'yelp') return (result as YelpSearchResult).url || null;
  return (result as FacebookSearchResult).link || null;
}

function getResultRating(result: SearchResult, provider: string): number | null {
  if (provider === 'google') return (result as GoogleSearchResult).rating;
  if (provider === 'yelp') return (result as YelpSearchResult).rating;
  return (result as FacebookSearchResult).overall_star_rating ?? null;
}

function getResultReviewCount(result: SearchResult, provider: string): number | null {
  if (provider === 'google') return (result as GoogleSearchResult).user_ratings_total;
  if (provider === 'yelp') return (result as YelpSearchResult).review_count;
  return (result as FacebookSearchResult).rating_count ?? null;
}

function getResultSubtitle(result: SearchResult, provider: string): string | null {
  if (provider === 'google') return (result as GoogleSearchResult).formatted_address;
  if (provider === 'yelp') {
    const loc = (result as YelpSearchResult).location;
    return loc?.display_address?.join(', ') ?? null;
  }
  const loc = (result as FacebookSearchResult).location;
  if (loc) return [loc.city, loc.country].filter(Boolean).join(', ');
  return null;
}

// ============================================================================
// TIER HELPERS
// ============================================================================

const ELIGIBLE_TIERS = ['preferred', 'premium'];

function isEligibleTier(tier: string): boolean {
  return ELIGIBLE_TIERS.includes(tier);
}

function formatProviderName(provider: string): string {
  const names: Record<string, string> = {
    google: 'Google',
    yelp: 'Yelp',
    facebook: 'Facebook'
  };
  return names[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

function formatLastSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Never synced';
  const date = new Date(lastSyncAt);
  if (isNaN(date.getTime())) return 'Unknown';
  return `Last synced ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExternalReviewsManager() {
  const { selectedListingId, selectedListing } = useListingContext();

  const listingId = selectedListingId;
  const listingTier = selectedListing?.tier ?? 'essentials';

  // State
  const [providers, setProviders] = useState<ConnectedProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchProvider, setSearchProvider] = useState<'google' | 'yelp' | 'facebook'>('google');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --------------------------------------------------------------------------
  // Data fetching
  // --------------------------------------------------------------------------

  const fetchProviders = useCallback(async () => {
    if (!listingId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/external-reviews/${listingId}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(`Failed to load providers (${res.status})`);
      }
      const data = (await res.json()) as { success: boolean; data: { providers: ConnectedProvider[] } };
      setProviders(data.data?.providers ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load connected providers';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  // --------------------------------------------------------------------------
  // Search with debounce
  // --------------------------------------------------------------------------

  const runSearch = useCallback(async (query: string, provider: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/external-reviews/search?q=${encodeURIComponent(query.trim())}&provider=${encodeURIComponent(provider)}`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }
      const data = (await res.json()) as { success: boolean; data: { results: SearchResult[] } };
      setSearchResults(data.data?.results ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      void runSearch(value, searchProvider);
    }, 300);
  }, [runSearch, searchProvider]);

  // --------------------------------------------------------------------------
  // Connect
  // --------------------------------------------------------------------------

  const handleConnect = useCallback(async (result: SearchResult) => {
    if (!listingId) return;
    const entityId = getResultId(result, searchProvider);
    const canonicalUrl = getResultCanonicalUrl(result, searchProvider);
    setConnectingId(entityId);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetchWithCsrf('/api/external-reviews/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listing_id: listingId,
          provider: searchProvider,
          provider_entity_id: entityId,
          canonical_url: canonicalUrl
        })
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? `Connect failed (${res.status})`);
      }
      setSuccessMessage(`Connected to "${result.name}" successfully.`);
      setSearchQuery('');
      setSearchResults([]);
      await fetchProviders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect provider';
      setError(msg);
    } finally {
      setConnectingId(null);
    }
  }, [listingId, fetchProviders, searchProvider]);

  // --------------------------------------------------------------------------
  // Disconnect
  // --------------------------------------------------------------------------

  const handleDisconnect = useCallback(async (provider: string) => {
    if (!listingId) return;
    setDisconnectingProvider(provider);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetchWithCsrf('/api/external-reviews/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listing_id: listingId,
          provider
        })
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? `Disconnect failed (${res.status})`);
      }
      setSuccessMessage(`${formatProviderName(provider)} disconnected.`);
      await fetchProviders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect provider';
      setError(msg);
    } finally {
      setDisconnectingProvider(null);
    }
  }, [listingId, fetchProviders]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const canConnect = isEligibleTier(listingTier);

  return (
    <div className="space-y-6">

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 text-xs shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Globe className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-700 flex-1">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-400 hover:text-green-600 text-xs shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tier Gate Banner */}
      {!canConnect && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <PlugZap className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Upgrade Required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              External review integration requires a Preferred or Premium listing tier.
              Upgrade your listing to connect Google Places and display external reviews.
            </p>
          </div>
        </div>
      )}

      {/* ===== CONNECTED PROVIDERS ===== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#ed6437]" />
            <h2 className="text-lg font-semibold text-gray-900">Connected Sources</h2>
          </div>
          <button
            onClick={() => void fetchProviders()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#ed6437] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-[#ed6437]" />
          </div>
        ) : providers.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No external review sources connected yet</p>
            {canConnect && (
              <p className="text-sm text-gray-400 mt-1">
                Search for your business below to connect Google Reviews.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div
                key={p.provider}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{formatProviderName(p.provider)}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {p.source.rating_summary !== null && (
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          {p.source.rating_summary.toFixed(1)}
                        </span>
                      )}
                      {p.source.review_count !== null && (
                        <span className="text-sm text-gray-500">
                          {p.source.review_count.toLocaleString()} review{p.source.review_count !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatLastSync(p.source.last_sync_at)}
                      </span>
                    </div>
                    {p.source.canonical_url && (
                      <a
                        href={p.source.canonical_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#ed6437] hover:underline mt-0.5 block"
                      >
                        View on {formatProviderName(p.provider)}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void handleDisconnect(p.provider)}
                  disabled={disconnectingProvider === p.provider}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disconnectingProvider === p.provider ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unplug className="w-3.5 h-3.5" />
                  )}
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== CONNECT EXTERNAL REVIEW SOURCE (tier-gated) ===== */}
      {canConnect && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-[#ed6437]" />
            <h2 className="text-lg font-semibold text-gray-900">Connect Review Source</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Search for your business on an external review platform to display those reviews on your listing page.
          </p>

          {/* Provider tabs */}
          <div className="flex gap-2 mb-4">
            {(['google', 'yelp', 'facebook'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setSearchProvider(p);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  searchProvider === p
                    ? 'bg-[#ed6437] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={`Search for your business on ${searchProvider.charAt(0).toUpperCase() + searchProvider.slice(1)}...`}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437] transition-colors"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((result) => {
                const entityId = getResultId(result, searchProvider);
                const subtitle = getResultSubtitle(result, searchProvider);
                const rating = getResultRating(result, searchProvider);
                const reviewCount = getResultReviewCount(result, searchProvider);
                const alreadyConnected = providers.some((p) => p.provider === searchProvider);
                const isConnecting = connectingId === entityId;

                return (
                  <div
                    key={entityId}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                        <Globe className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{result.name}</p>
                        {subtitle && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
                          </div>
                        )}
                        {rating !== null && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-gray-600">{rating.toFixed(1)}</span>
                            {reviewCount !== null && (
                              <span className="text-xs text-gray-400">
                                ({reviewCount.toLocaleString()} reviews)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => void handleConnect(result)}
                      disabled={isConnecting || alreadyConnected}
                      className="flex items-center gap-1.5 px-3 py-1.5 ml-3 text-sm font-medium text-white bg-[#ed6437] hover:bg-[#d55a31] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {isConnecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PlugZap className="w-3.5 h-3.5" />
                      )}
                      {alreadyConnected ? 'Already Connected' : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* No results state */}
          {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="mt-3 py-6 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
              No businesses found for &quot;{searchQuery}&quot;. Try a different search term.
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default ExternalReviewsManager;
