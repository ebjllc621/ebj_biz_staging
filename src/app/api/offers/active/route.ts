/**
 * Active Offers API Route
 * GET /api/offers/active - Get active offers
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getOfferService, getListingService } from '@core/services/ServiceRegistry';

/**
 * GET /api/offers/active
 * Get active offers (status='active' and current date within start_date/end_date)
 * Query parameters: None (service.getActive() takes no parameters)
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  
  // OfferService requires ListingService dependency
  
  
  const listingService = getListingService();
  const service = getOfferService();

  // getActive() takes no parameters - returns all active offers
  const offers = await service.getActive();

  return createSuccessResponse({ offers }, context.requestId);
}, {
  allowedMethods: ['GET']
});
