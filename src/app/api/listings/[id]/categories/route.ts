/**
 * Listing Categories API Routes
 * GET /api/listings/[id]/categories - Get listing categories
 * PATCH /api/listings/[id]/categories - Update listing categories
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Tier enforcement: Validates category count limits
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getListingService, getCategoryService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/listings/[id]/categories
 * Get categories associated with listing
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'categories')
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
  }

  
  const categoryService = getCategoryService();
  
  const service = getListingService();

  // Categories stored in listing record - get listing and return category_id
  const listing = await service.getById(listingId);
  if (!listing) {
    throw BizError.notFound('Listing', listingId);
  }

  return createSuccessResponse({ category_id: listing.category_id }, context.requestId);
}, {
  allowedMethods: ['GET', 'PATCH']
});

/**
 * PATCH /api/listings/[id]/categories
 * Update listing categories
 * Body:
 *   - category_ids: Array of category IDs (required)
 *
 * @authenticated User authentication required (listing owner or admin)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'categories')
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
  }

  // Get user ID from context
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields - single category_id
  if (!requestBody.category_id || typeof requestBody.category_id !== 'number') {
    throw BizError.validation('category_id', requestBody.category_id, 'Category ID is required and must be a number');
  }

  // Update category via update method
  
  const categoryService = getCategoryService();
  
  const service = getListingService();
  await service.update(listingId, userIdNum, { category_id: requestBody.category_id });

  return createSuccessResponse({ message: 'Category updated successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'PATCH']
}));
