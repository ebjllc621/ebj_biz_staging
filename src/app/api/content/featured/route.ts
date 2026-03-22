/**
 * Content Featured API Route
 * GET /api/content/featured - Featured content for scrollers
 *
 * @authority PHASE_3_API_ROUTES.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ContentService } from '@core/services/ContentService';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/content/featured
 * Get featured content across all types
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse limit parameter
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam) : 5;

  if (isNaN(limit) || limit < 1 || limit > 20) {
    throw BizError.badRequest('Invalid limit parameter (must be 1-20)', { limit: limitParam });
  }

  // Initialize service
  const db = getDatabaseService();
  const contentService = new ContentService(db);

  // Get featured content
  const result = await contentService.getFeatured(limit);

  return createSuccessResponse(result, context.requestId);
}, {
  allowedMethods: ['GET']
});
