/**
 * Public Homepage API Route
 * GET /api/homepage/public - Get public homepage data
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { HomePageService } from '@features/homepage/services/HomePageService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getListingService } from '@core/services/ServiceRegistry';

/**
 * GET /api/homepage/public
 * Get public homepage data including:
 * - Featured categories
 * - Featured listings (enriched with sub-entity counts)
 * - Active offers (filtered by category if specified)
 * - Upcoming events (filtered by category if specified)
 * - Latest listings (enriched with sub-entity counts)
 * - Platform statistics
 *
 * Query parameters:
 * - category: optional string - Category slug to filter offers/events by listing category
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Parse optional category filter
  const url = new URL(context.request.url);
  const category = url.searchParams.get('category') || undefined;

  const db = getDatabaseService();
  const service = new HomePageService(db);
  const listingService = getListingService();

  const data = await service.getPublicHomeData({ category });

  // Phase 4B: Enrich featured_listings with sub-entity counts for SearchResultBadges
  const enrichedFeatured = await Promise.all(
    data.featured_listings.map(async (listing) => {
      try {
        const counts = await listingService.getSubEntityCounts(listing.id);
        return {
          ...listing,
          job_count: counts.jobCount,
          event_count: counts.eventCount,
          offer_count: counts.offerCount,
        };
      } catch {
        return listing;
      }
    })
  );

  // Phase 4B: Enrich latest_listings with sub-entity counts for SearchResultBadges
  const enrichedLatest = await Promise.all(
    data.latest_listings.map(async (listing) => {
      try {
        const counts = await listingService.getSubEntityCounts(listing.id);
        return {
          ...listing,
          job_count: counts.jobCount,
          event_count: counts.eventCount,
          offer_count: counts.offerCount,
        };
      } catch {
        return listing;
      }
    })
  );

  return createSuccessResponse({
    ...data,
    featured_listings: enrichedFeatured,
    latest_listings: enrichedLatest,
    cached_at: new Date().toISOString()
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});
