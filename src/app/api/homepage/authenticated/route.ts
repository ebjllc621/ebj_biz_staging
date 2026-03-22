/**
 * Authenticated Homepage API Route
 * GET /api/homepage/authenticated - Get personalized homepage data
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required via httpOnly cookies
 *
 * @authority CLAUDE.md - API Standards section
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { HomePageService } from '@features/homepage/services/HomePageService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/homepage/authenticated
 * Get personalized homepage data including:
 * - User statistics
 * - Recent network activity
 * - Connection suggestions
 * - Personalized listings
 * - Personalized offers
 * - Network growth metrics
 *
 * @authenticated Requires valid session
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Ensure user is authenticated
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const service = new HomePageService(db);

  const data = await service.getAuthenticatedHomeData(parseInt(context.userId, 10));

  return createSuccessResponse({
    ...data
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
