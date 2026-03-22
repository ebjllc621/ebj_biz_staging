/**
 * Admin Event Stats API Route
 * GET /api/admin/events/stats - Get aggregate event statistics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Service boundary: EventService
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 7 - Admin Enhancements & Cleanup
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/events/stats
 * Get aggregate event statistics for admin dashboard
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('access admin event stats', 'admin');

  const eventService = getEventService();
  const stats = await eventService.getEventStats();
  return createSuccessResponse(stats, 200);
});
