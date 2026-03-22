/**
 * BizWire Analytics Route
 * GET /api/listings/[id]/bizwire/analytics - Get BizWire analytics summary for a listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Ownership check: Listing owner only
 * - BizWireAnalyticsService instantiated locally (not in ServiceRegistry)
 *
 * @authority docs/components/contactListing/phases/PHASE_4_PLAN.md
 * @reference src/app/api/listings/[id]/messages/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizWireAnalyticsService } from '@core/services/BizWireAnalyticsService';

/**
 * GET /api/listings/[id]/bizwire/analytics
 * Get BizWire analytics summary for a listing (listing owner only)
 * Query params: days (default 30, max 365)
 *
 * @authenticated Listing owner only
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const reqUrl = new URL(context.request.url);
  const segments = reqUrl.pathname.split('/');

  // Extract listing ID
  const idSegment = segments[segments.indexOf('listings') + 1];
  const listingId = parseInt(idSegment || '');
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: idSegment });
  }

  const userId = context.userId;
  if (!userId) throw BizError.unauthorized('Authentication required');
  const ownerId = parseInt(userId);
  if (isNaN(ownerId)) throw BizError.badRequest('Invalid user ID');

  // Verify listing ownership
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);
  if (!listing || listing.user_id !== ownerId) {
    throw BizError.forbidden('You do not have permission to access this resource');
  }

  // Parse days param (default 30, max 365)
  const daysParam = parseInt(reqUrl.searchParams.get('days') || '30');
  const days = isNaN(daysParam) ? 30 : Math.min(Math.max(daysParam, 1), 365);

  // Get analytics summary
  const analyticsService = new BizWireAnalyticsService(getDatabaseService());
  const analytics = await analyticsService.getListingAnalytics(listingId, days);

  return createSuccessResponse(analytics, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
