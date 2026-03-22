/**
 * Listing Statistics API Route
 * GET /api/listings/[id]/statistics - Get listing statistics
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
 * GET /api/listings/[id]/statistics
 * Get listing statistics (views, clicks, favorites, reviews, etc.)
 *
 * @authenticated User authentication required (listing owner or admin)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'statistics')
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
  }

  
  const categoryService = getCategoryService();
  
  const service = getListingService();
  const statistics = await service.getStatistics(listingId);

  return createSuccessResponse({ statistics }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
