/**
 * Admin Organizer Stats API Route
 *
 * GET /api/admin/events/organizer-stats
 * Returns platform-wide organizer activity statistics (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse
 * - Authentication: admin role required (manual role check, canonical pattern)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6D - Admin Organizer Overview
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/admin/events/organizer-stats
 * Platform-wide organizer activity statistics for admin dashboard
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }
  if (user.role !== 'admin') {
    return createErrorResponse('Admin privileges required', 403);
  }

  const eventService = getEventService();
  const organizer_stats = await eventService.getAdminOrganizerStats();
  return createSuccessResponse({ organizer_stats });
});
