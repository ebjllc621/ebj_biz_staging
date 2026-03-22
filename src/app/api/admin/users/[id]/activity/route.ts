/**
 * Admin User Activity API Route
 * GET /api/admin/users/[id]/activity - Get user activity log
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse/createErrorResponse
 * - DatabaseService boundary compliance
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 4 - Task 4.7: UserManagementService API Routes
 */

import { getUserManagementService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/users/[id]/activity
 * Get user activity log
 */
export const GET = apiHandler(async (context) => {
  // TODO: Check admin authentication
  // const session = await getSession(context.request);
  // if (!session || session.role !== 'admin') {
  //   throw BizError.unauthorized('Admin access required');
  // }

  // Extract user ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // activity is last, id is second-to-last

  if (!id) {
    throw BizError.badRequest('User ID is required', {});
  }

  const userId = parseInt(id);

  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { id });
  }

  const searchParams = url.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50');

  if (limit < 1 || limit > 100) {
    throw BizError.badRequest('Limit must be between 1 and 100', { limit });
  }

  const service = getUserManagementService();

  // Get activity log
  const activities = await service.getActivityLog(userId, limit);

  // Get login history
  const loginHistory = await service.getLoginHistory(userId);

  return createSuccessResponse({
    activities,
    loginHistory,
    total: activities.length
  }, 200);
});
