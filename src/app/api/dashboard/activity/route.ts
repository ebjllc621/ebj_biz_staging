/**
 * Dashboard Activity API Route
 * GET /api/dashboard/activity - Get recent activity feed
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
 * GET /api/dashboard/activity
 * Get recent activity feed including:
 * - User's own activity
 * - Social activity from user's network
 * - Activity type, title, description
 * - Actor information
 * - Timestamp
 *
 * Query Parameters:
 * - limit (optional): Number of items to return (default: 10, max: 50)
 * - offset (optional): Pagination offset (default: 0)
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

  // Get pagination params from query
  const url = new URL(context.request.url);
  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');

  const limit = Math.min(limitParam ? parseInt(limitParam, 10) : 10, 50); // Max 50
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const userId = parseInt(context.userId, 10);

  // Fetch activities and total count in parallel
  const [activities, totalCount] = await Promise.all([
    service.getRecentActivity(userId, limit, offset),
    service.getActivityCount(userId)
  ]);

  return createSuccessResponse({
    items: activities,
    pagination: {
      total: totalCount,
      limit,
      offset,
      has_more: offset + activities.length < totalCount
    }
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
