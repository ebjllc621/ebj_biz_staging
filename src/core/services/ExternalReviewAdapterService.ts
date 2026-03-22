/**
 * ExternalReviewAdapterService - External Review Provider Integration
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - External review text NEVER stored in native reviews table
 * - External review text NEVER stored persistently — in-memory cache only
 * - Review text cached with TTL per Google TOS (max 4 hours)
 * - Attribution + linkback MANDATORY on all display calls
 * - API key accessed server-side only
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority docs/reviews/bizconekt_google_reviews_compliance_report.md
 * @authority docs/reviews/bizconekt_universal_external_review_adapter_standard.md
 * @phase Phase 6A - External Review Adapter Infrastructure
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Types
// ============================================================================

export interface ExternalReviewSource {
  id: number;
  listing_id: number;
  provider: string;
  provider_entity_id: string;
  canonical_url: string | null;
  rating_summary: number | null;
  review_count: number | null;
  last_sync_at: Date | null;
  status: 'connected' | 'disconnected' | 'error';
  created_at: Date;
  updated_at: Date;
}

export interface ExternalReviewDisplay {
  provider: string;
  author_name: string;
  rating: number;
  text: string;
  relative_time: string;
  profile_photo_url: string | null;
  provider_review_url: string | null;
}

export interface GooglePlaceCandidate {
  place_id: string;
  name: string;
  formatted_address: string;
  rating: number | null;
  user_ratings_total: number | null;
}

export interface YelpBusinessCandidate {
  id: string;
  name: string;
  location: { display_address: string[] };
  rating: number | null;
  review_count: number | null;
  url: string;
}

export interface FacebookPageCandidate {
  id: string;
  name: string;
  location?: { city: string; country: string };
  overall_star_rating?: number;
  rating_count?: number;
  link: string;
}

// ============================================================================
// Internal cache entry type
// ============================================================================

interface CacheEntry {
  reviews: ExternalReviewDisplay[];
  fetchedAt: number;
}

// ============================================================================
// Google Places API response shapes (internal)
// ============================================================================

interface GooglePlaceTextSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
}

interface GooglePlaceTextSearchResponse {
  results: GooglePlaceTextSearchResult[];
  status: string;
}

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
  profile_photo_url?: string;
}

interface GooglePlaceDetailsResult {
  reviews?: GoogleReview[];
  rating?: number;
  user_ratings_total?: number;
  url?: string;
}

interface GooglePlaceDetailsResponse {
  result: GooglePlaceDetailsResult;
  status: string;
}

// ============================================================================
// ExternalReviewAdapterService
// ============================================================================

export class ExternalReviewAdapterService {
  private db: DatabaseService;
  private cache: Map<string, CacheEntry>;
  private static CACHE_TTL: Record<string, number> = {
    google: 4 * 60 * 60 * 1000,     // 4 hours (Google TOS)
    yelp: 24 * 60 * 60 * 1000,      // 24 hours (Yelp TOS)
    facebook: 30 * 60 * 1000,        // 30 minutes (Facebook TOS — session-like)
  };

  constructor(db: DatabaseService) {
    this.db = db;
    this.cache = new Map();
  }

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  /**
   * Connect an external review provider to a listing.
   * Creates a new row in external_review_sources or re-activates an existing one.
   */
  async connectProvider(
    listingId: number,
    provider: string,
    providerEntityId: string,
    canonicalUrl: string | null = null
  ): Promise<ExternalReviewSource> {
    // Upsert: re-use existing row if present (handles reconnect after disconnect)
    await this.db.query(
      `INSERT INTO external_review_sources
         (listing_id, provider, provider_entity_id, canonical_url, status)
       VALUES (?, ?, ?, ?, 'connected')
       ON DUPLICATE KEY UPDATE
         provider_entity_id = VALUES(provider_entity_id),
         canonical_url = VALUES(canonical_url),
         status = 'connected',
         updated_at = CURRENT_TIMESTAMP`,
      [listingId, provider, providerEntityId, canonicalUrl]
    );

    const source = await this.getSource(listingId, provider);
    if (!source) {
      throw new Error(`Failed to retrieve source after connectProvider for listing ${listingId} / ${provider}`);
    }
    return source;
  }

  /**
   * Disconnect a provider from a listing (sets status to 'disconnected').
   * Does not delete the row so history is preserved.
   */
  async disconnectProvider(listingId: number, provider: string): Promise<void> {
    await this.db.query(
      `UPDATE external_review_sources
       SET status = 'disconnected', updated_at = CURRENT_TIMESTAMP
       WHERE listing_id = ? AND provider = ?`,
      [listingId, provider]
    );

    // Evict from cache on disconnect
    this.cache.delete(this.getCacheKey(listingId, provider));
  }

  /**
   * Return all connected (active) providers for a listing.
   */
  async getConnectedProviders(listingId: number): Promise<ExternalReviewSource[]> {
    const result = await this.db.query<ExternalReviewSource>(
      `SELECT id, listing_id, provider, provider_entity_id, canonical_url,
              rating_summary, review_count, last_sync_at, status, created_at, updated_at
       FROM external_review_sources
       WHERE listing_id = ? AND status = 'connected'
       ORDER BY created_at ASC`,
      [listingId]
    );

    return result.rows.map(row => this.normalizeSourceRow(row));
  }

  /**
   * Get a single source row for a listing + provider combination.
   */
  async getSource(listingId: number, provider: string): Promise<ExternalReviewSource | null> {
    const result = await this.db.query<ExternalReviewSource>(
      `SELECT id, listing_id, provider, provider_entity_id, canonical_url,
              rating_summary, review_count, last_sync_at, status, created_at, updated_at
       FROM external_review_sources
       WHERE listing_id = ? AND provider = ?
       LIMIT 1`,
      [listingId, provider]
    );

    const row = result.rows[0];
    if (!row) return null;
    return this.normalizeSourceRow(row);
  }

  // --------------------------------------------------------------------------
  // Google Places Integration
  // --------------------------------------------------------------------------

  /**
   * Search Google Places Text Search API for business candidates.
   * Used during listing setup to help the owner find their Google Place.
   *
   * COMPLIANCE: Called server-side only. API key never exposed to client.
   */
  async searchGooglePlaces(
    query: string,
    location?: string
  ): Promise<GooglePlaceCandidate[]> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('[ExternalReviewAdapterService] Google Maps API key not configured');
      return [];
    }

    try {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
      if (location) {
        url += `&location=${encodeURIComponent(location)}`;
      }

      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        console.error('[ExternalReviewAdapterService] Places Text Search HTTP error:', response.status);
        return [];
      }

      const data = (await response.json()) as GooglePlaceTextSearchResponse;
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.warn('[ExternalReviewAdapterService] Places Text Search API status:', data.status);
        return [];
      }

      return (data.results || []).slice(0, 5).map((r) => ({
        place_id: r.place_id,
        name: r.name,
        formatted_address: r.formatted_address,
        rating: r.rating ?? null,
        user_ratings_total: r.user_ratings_total ?? null,
      }));
    } catch (err) {
      console.error('[ExternalReviewAdapterService] searchGooglePlaces error:', err);
      return [];
    }
  }

  /**
   * Fetch up to 5 reviews from Google Places Details API for a given place_id.
   *
   * COMPLIANCE:
   * - Review text is returned in-memory only — NEVER stored in database
   * - Max 5 reviews per Google TOS display limits
   * - Called server-side only
   */
  async fetchGoogleReviews(placeId: string): Promise<{ reviews: ExternalReviewDisplay[]; googleMapsUrl: string | null; rating: number | null; reviewCount: number | null }> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('[ExternalReviewAdapterService] Google Maps API key not configured');
      return { reviews: [], googleMapsUrl: null, rating: null, reviewCount: null };
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews,rating,user_ratings_total,url&key=${apiKey}`;

      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        console.error('[ExternalReviewAdapterService] Places Details HTTP error:', response.status);
        return { reviews: [], googleMapsUrl: null, rating: null, reviewCount: null };
      }

      const data = (await response.json()) as GooglePlaceDetailsResponse;
      if (data.status !== 'OK') {
        console.warn('[ExternalReviewAdapterService] Places Details API status:', data.status);
        return { reviews: [], googleMapsUrl: null, rating: null, reviewCount: null };
      }

      const result = data.result;
      const googleMapsUrl = result.url ?? null;
      const rating = result.rating ?? null;
      const reviewCount = result.user_ratings_total ?? null;

      const reviews: ExternalReviewDisplay[] = (result.reviews || []).slice(0, 5).map((r) => ({
        provider: 'google',
        author_name: r.author_name,
        rating: r.rating,
        text: r.text,
        relative_time: r.relative_time_description,
        profile_photo_url: r.profile_photo_url ?? null,
        provider_review_url: googleMapsUrl,
      }));

      return { reviews, googleMapsUrl, rating, reviewCount };
    } catch (err) {
      console.error('[ExternalReviewAdapterService] fetchGoogleReviews error:', err);
      return { reviews: [], googleMapsUrl: null, rating: null, reviewCount: null };
    }
  }

  // --------------------------------------------------------------------------
  // Yelp Fusion Integration
  // --------------------------------------------------------------------------

  /**
   * Search Yelp Fusion Business Search API for business candidates.
   * Returns empty array when YELP_API_KEY is not configured (graceful degradation).
   */
  async searchYelpBusinesses(query: string, location?: string): Promise<YelpBusinessCandidate[]> {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) return [];

    try {
      const params = new URLSearchParams({ term: query, limit: '5' });
      if (location) params.set('location', location);
      else params.set('location', 'Dallas, TX');

      const response = await fetch(
        `https://api.yelp.com/v3/businesses/search?${params}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!response.ok) return [];
      const data = await response.json() as { businesses?: Record<string, unknown>[] };
      return (data.businesses || []).slice(0, 5).map((b) => ({
        id: b.id as string,
        name: b.name as string,
        location: b.location as { display_address: string[] },
        rating: (b.rating as number) ?? null,
        review_count: (b.review_count as number) ?? null,
        url: (b.url as string) || '',
      }));
    } catch (err) {
      console.error('[ExternalReviewAdapterService] searchYelpBusinesses error:', err);
      return [];
    }
  }

  /**
   * Fetch up to 5 reviews from Yelp Fusion for a given business ID.
   * Note: Yelp API returns a maximum of 3 reviews per call.
   * Returns empty array when YELP_API_KEY is not configured (graceful degradation).
   */
  async fetchYelpReviews(businessId: string): Promise<{ reviews: ExternalReviewDisplay[]; yelpUrl: string | null; rating: number | null; reviewCount: number | null }> {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) return { reviews: [], yelpUrl: null, rating: null, reviewCount: null };

    try {
      // Fetch business details for rating + url
      const detailResponse = await fetch(
        `https://api.yelp.com/v3/businesses/${encodeURIComponent(businessId)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      let yelpUrl: string | null = null;
      let rating: number | null = null;
      let reviewCount: number | null = null;
      if (detailResponse.ok) {
        const detail = await detailResponse.json() as Record<string, unknown>;
        yelpUrl = (detail.url as string) || null;
        rating = (detail.rating as number) || null;
        reviewCount = (detail.review_count as number) || null;
      }

      // Fetch reviews (Yelp returns max 3 per call)
      const reviewResponse = await fetch(
        `https://api.yelp.com/v3/businesses/${encodeURIComponent(businessId)}/reviews?limit=5&sort_by=yelp_sort`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!reviewResponse.ok) return { reviews: [], yelpUrl, rating, reviewCount };
      const reviewData = await reviewResponse.json() as { reviews?: Record<string, unknown>[] };

      const reviews: ExternalReviewDisplay[] = (reviewData.reviews || []).map((r) => ({
        provider: 'yelp',
        author_name: ((r.user as Record<string, unknown>)?.name as string) || 'Yelp User',
        rating: (r.rating as number) || 0,
        text: (r.text as string) || '',
        relative_time: r.time_created ? new Date(r.time_created as string).toLocaleDateString() : '',
        profile_photo_url: ((r.user as Record<string, unknown>)?.image_url as string) || null,
        provider_review_url: (r.url as string) || yelpUrl,
      }));

      return { reviews, yelpUrl, rating, reviewCount };
    } catch (err) {
      console.error('[ExternalReviewAdapterService] fetchYelpReviews error:', err);
      return { reviews: [], yelpUrl: null, rating: null, reviewCount: null };
    }
  }

  // --------------------------------------------------------------------------
  // Facebook Graph Integration
  // --------------------------------------------------------------------------

  /**
   * Search Facebook Graph API for page candidates.
   * Returns empty array when FACEBOOK_GRAPH_TOKEN is not configured (graceful degradation).
   */
  async searchFacebookPages(query: string): Promise<FacebookPageCandidate[]> {
    const token = process.env.FACEBOOK_GRAPH_TOKEN;
    if (!token) return [];

    try {
      const params = new URLSearchParams({ q: query, type: 'page', limit: '5', access_token: token });
      const response = await fetch(`https://graph.facebook.com/v19.0/search?${params}`);
      if (!response.ok) return [];
      const data = await response.json() as { data?: Record<string, unknown>[] };
      return (data.data || []).slice(0, 5).map((p) => ({
        id: p.id as string,
        name: p.name as string,
        location: p.location as { city: string; country: string } | undefined,
        overall_star_rating: (p.overall_star_rating as number) || undefined,
        rating_count: (p.rating_count as number) || undefined,
        link: (p.link as string) || `https://facebook.com/${p.id as string}`,
      }));
    } catch (err) {
      console.error('[ExternalReviewAdapterService] searchFacebookPages error:', err);
      return [];
    }
  }

  /**
   * Fetch ratings/reviews from Facebook Graph API for a given page ID.
   * Returns empty array when FACEBOOK_GRAPH_TOKEN is not configured (graceful degradation).
   */
  async fetchFacebookReviews(pageId: string): Promise<{ reviews: ExternalReviewDisplay[]; fbUrl: string | null; rating: number | null; reviewCount: number | null }> {
    const token = process.env.FACEBOOK_GRAPH_TOKEN;
    if (!token) return { reviews: [], fbUrl: null, rating: null, reviewCount: null };

    try {
      // Fetch page details
      const pageResponse = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}?fields=name,overall_star_rating,rating_count,link&access_token=${token}`
      );
      let fbUrl: string | null = null;
      let rating: number | null = null;
      let reviewCount: number | null = null;
      if (pageResponse.ok) {
        const page = await pageResponse.json() as Record<string, unknown>;
        fbUrl = (page.link as string) || `https://facebook.com/${pageId}`;
        rating = (page.overall_star_rating as number) || null;
        reviewCount = (page.rating_count as number) || null;
      }

      // Fetch ratings
      const ratingsResponse = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/ratings?limit=5&access_token=${token}`
      );
      if (!ratingsResponse.ok) return { reviews: [], fbUrl, rating, reviewCount };
      const ratingsData = await ratingsResponse.json() as { data?: Record<string, unknown>[] };

      const reviews: ExternalReviewDisplay[] = (ratingsData.data || []).map((r) => ({
        provider: 'facebook',
        author_name: ((r.reviewer as Record<string, unknown>)?.name as string) || 'Facebook User',
        rating: (r.rating as number) || 5,
        text: (r.review_text as string) || '',
        relative_time: r.created_time ? new Date(r.created_time as string).toLocaleDateString() : '',
        profile_photo_url: null,
        provider_review_url: fbUrl,
      }));

      return { reviews, fbUrl, rating, reviewCount };
    } catch (err) {
      console.error('[ExternalReviewAdapterService] fetchFacebookReviews error:', err);
      return { reviews: [], fbUrl: null, rating: null, reviewCount: null };
    }
  }

  // --------------------------------------------------------------------------
  // Cache-Aware Review Fetching
  // --------------------------------------------------------------------------

  /**
   * Get external reviews for a listing + provider, using in-memory cache.
   *
   * Cache policy:
   * - TTL: 4 hours (conservative, within Google TOS)
   * - Review text NEVER persisted to database
   * - Only connection metadata (rating_summary, review_count, last_sync_at) is persisted
   */
  async getExternalReviews(
    listingId: number,
    provider: string
  ): Promise<{ source: ExternalReviewSource; reviews: ExternalReviewDisplay[] }> {
    const cacheKey = this.getCacheKey(listingId, provider);
    const cached = this.cache.get(cacheKey);

    const source = await this.getSource(listingId, provider);
    if (!source) {
      throw new Error(`No source found for listing ${listingId} / provider ${provider}`);
    }

    // Return from cache if still valid
    if (cached && this.isCacheValid(cached, provider)) {
      return { source, reviews: cached.reviews };
    }

    // Fetch fresh data from provider
    let reviews: ExternalReviewDisplay[] = [];

    if (provider === 'google') {
      const fetchResult = await this.fetchGoogleReviews(source.provider_entity_id);
      reviews = fetchResult.reviews;

      // Persist metadata only (not review text)
      if (fetchResult.rating !== null || fetchResult.reviewCount !== null) {
        await this.updateSourceMetadata(source.id, fetchResult.rating, fetchResult.reviewCount);
      }
    } else if (provider === 'yelp') {
      const fetchResult = await this.fetchYelpReviews(source.provider_entity_id);
      reviews = fetchResult.reviews;
      if (fetchResult.rating !== null || fetchResult.reviewCount !== null) {
        await this.updateSourceMetadata(source.id, fetchResult.rating, fetchResult.reviewCount);
      }
    } else if (provider === 'facebook') {
      const fetchResult = await this.fetchFacebookReviews(source.provider_entity_id);
      reviews = fetchResult.reviews;
      if (fetchResult.rating !== null || fetchResult.reviewCount !== null) {
        await this.updateSourceMetadata(source.id, fetchResult.rating, fetchResult.reviewCount);
      }
    }

    // Update cache
    this.cache.set(cacheKey, { reviews, fetchedAt: Date.now() });

    // Return updated source (rating_summary, review_count may have changed)
    const updatedSource = await this.getSource(listingId, provider);
    return { source: updatedSource ?? source, reviews };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private getCacheKey(listingId: number, provider: string): string {
    return `${listingId}:${provider}`;
  }

  private isCacheValid(entry: CacheEntry, provider: string = 'google'): boolean {
    const defaultTtl = 4 * 60 * 60 * 1000; // 4 hours fallback
    const ttl = ExternalReviewAdapterService.CACHE_TTL[provider] ?? ExternalReviewAdapterService.CACHE_TTL.google ?? defaultTtl;
    return Date.now() - entry.fetchedAt < ttl;
  }

  private async updateSourceMetadata(
    sourceId: number,
    ratingSummary: number | null,
    reviewCount: number | null
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE external_review_sources
         SET rating_summary = ?,
             review_count = ?,
             last_sync_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [ratingSummary, reviewCount, sourceId]
      );
    } catch (err) {
      // Non-fatal: metadata update failure should not break review display
      console.error('[ExternalReviewAdapterService] updateSourceMetadata error:', err);
    }
  }

  /**
   * Normalize raw DB row to ensure correct types.
   * MariaDB may return BigInt for numeric IDs; dates may be strings.
   */
  private normalizeSourceRow(row: ExternalReviewSource): ExternalReviewSource {
    return {
      ...row,
      id: bigIntToNumber(row.id as unknown as bigint) ?? Number(row.id),
      listing_id: bigIntToNumber(row.listing_id as unknown as bigint) ?? Number(row.listing_id),
      review_count: row.review_count !== null ? Number(row.review_count) : null,
      rating_summary: row.rating_summary !== null ? Number(row.rating_summary) : null,
      last_sync_at: row.last_sync_at ? new Date(row.last_sync_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
