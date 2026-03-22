/**
 * Admin User Search API Route
 * GET /api/admin/users/search - Search users by ID, email, username, or display name
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse/createErrorResponse
 * - DatabaseService boundary compliance
 *
 * @authority CLAUDE.md - API Standards
 * @phase New Listing Modal Enhancement
 */

import { getUserManagementService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/admin/users/search
 * Search users by ID, email, username, or display name
 * Returns up to 10 matching users
 */
export const GET = apiHandler(async (context) => {
  // Verify admin authentication
  const user = await getUserFromRequest(context.request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('search users', 'admin');
  }

  const url = new URL(context.request.url);
  const searchQuery = url.searchParams.get('q') || '';

  if (searchQuery.length < 2) {
    return createSuccessResponse({
      users: [],
      message: 'Search query must be at least 2 characters'
    }, 200);
  }

  // Get users matching the search query
  const service = getUserManagementService();

  // Search by ID, email, username, or display_name
  const result = await service.getAll(
    { searchQuery },
    { page: 1, limit: 10 }
  );

  // Map to simpler structure for autocomplete
  const users = result.data.map((u: {
    id: number;
    username: string;
    email: string;
    display_name?: string | null
  }) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    display_name: u.display_name || null
  }));

  return createSuccessResponse({
    users,
    total: result.pagination.total
  }, 200);
});
