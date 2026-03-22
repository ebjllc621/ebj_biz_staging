/**
 * Admin User Statistics API Route
 *
 * GET /api/admin/users/statistics - Get platform-wide user statistics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Service boundary: UserManagementService
 *
 * @authority CLAUDE.md - API Standards
 * @authority admin-build-map-v2.1.mdc - Admin API patterns
 */

import { getUserManagementService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/users/statistics
 * Get platform-wide user statistics for admin sidebar
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('access user statistics', 'admin');
  }

  const service = getUserManagementService();
  const stats = await service.getPlatformStats();

  // Transform to match page expectations
  return createSuccessResponse({
    statistics: {
      total: stats.totalUsers,
      active_30d: stats.activeUsers,
      by_role: {
        user: stats.usersByRole['general'] || 0,
        admin: stats.usersByRole['admin'] || 0
      },
      by_status: {
        active: stats.usersByStatus['active'] || 0,
        suspended: stats.usersByStatus['suspended'] || 0,
        banned: stats.usersByStatus['banned'] || 0,
        pending: stats.usersByStatus['pending'] || 0
      }
    }
  }, 200);
});
