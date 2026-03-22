/**
 * GET /api/listings/[id]/sub-counts
 *
 * Returns active sub-entity counts for a listing:
 * - jobCount: active job_postings (by business_id)
 * - eventCount: active events (by listing_id)
 * - offerCount: active offers (by listing_id)
 *
 * Used by SearchResultBadges and JSON-LD enrichment.
 * Public endpoint — no authentication required.
 *
 * @tier SIMPLE
 * @phase Phase 4B - SEO & Discovery
 * @authority CLAUDE.md - API Standards
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  // Pathname pattern: /api/listings/[id]/sub-counts
  const url = new URL(context.request.url);
  const pathSegments = url.pathname.split('/');
  // ['', 'api', 'listings', '[id]', 'sub-counts']
  const rawId = pathSegments[pathSegments.length - 2] ?? '';
  const listingId = parseInt(rawId, 10);

  if (!listingId || isNaN(listingId)) {
    throw new BizError({ code: 'VALIDATION_ERROR', message: 'Invalid listing ID' });
  }

  const listingService = getListingService();
  const counts = await listingService.getSubEntityCounts(listingId);

  return createSuccessResponse(counts, context.requestId);
}, {
  allowedMethods: ['GET'],
});
