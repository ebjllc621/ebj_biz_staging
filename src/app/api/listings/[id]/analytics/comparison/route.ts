/**
 * GET /api/listings/[id]/analytics/comparison
 * Returns listing vs category average metrics for benchmarking
 *
 * @tier SIMPLE
 * @auth Required (listing owner)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Required (listing owner)
 * - Response format: createSuccessResponse
 * - Service boundary: ListingService (via ServiceRegistry)
 * - ID extraction: URL path parsing (canonical pattern)
 *
 * @reference src/app/api/listings/[id]/analytics/route.ts — canonical URL ID extraction
 * @phase Phase 5B - Advanced Analytics
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5B_BRAIN_PLAN.md
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { getListingService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) throw BizError.unauthorized('Authentication required');

  // Extract listing ID from URL path (canonical pattern for [id] routes)
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];
  const listingId = parseInt(listingIdStr ?? '', 10);
  if (isNaN(listingId)) throw BizError.badRequest('Invalid listing ID');

  const listingService = getListingService();
  const comparison = await listingService.getCategoryAverages(listingId);

  return createSuccessResponse(comparison, 200);
});
