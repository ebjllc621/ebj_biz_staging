/**
 * Featured Listings API Route
 * GET /api/listings/featured - Get featured listings
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
import { getListingService, getCategoryService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/listings/featured
 * Get featured listings
 * Query parameters:
 *   - limit: Number of listings to return (optional, default: 10)
 *   - categoryId: Filter by category ID (optional)
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { searchParams } = new URL(context.request.url);

  const limit = parseInt(searchParams.get('limit') || '10');
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw BizError.badRequest('Invalid limit parameter (must be 1-100)', { limit: searchParams.get('limit') });
  }

  const service = getListingService();
  const listings = await service.getFeatured(limit);
  // NOTE: categoryId filtering not supported - limit only

  return createSuccessResponse({ listings }, context.requestId);
}, {
  allowedMethods: ['GET']
});
