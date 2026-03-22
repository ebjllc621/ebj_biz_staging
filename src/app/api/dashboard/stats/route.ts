/**
 * Dashboard Stats API Route
 * GET /api/dashboard/stats - Get dashboard statistics for authenticated user
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required via httpOnly cookies
 *
 * @authority CLAUDE.md - API Standards section
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/app/api/homepage/authenticated/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { DashboardService } from '@features/dashboard/services/DashboardService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics including:
 * - Connections count
 * - Profile views (30 days)
 * - Unread messages count
 * - Pending connection requests
 * - Bookmarks count
 * - Reviews count
 *
 * @authenticated Requires valid session
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Ensure user is authenticated
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const service = new DashboardService(db);

  const stats = await service.getDashboardStats(parseInt(context.userId, 10));

  return createSuccessResponse(stats, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
