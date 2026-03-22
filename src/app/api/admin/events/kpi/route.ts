/**
 * Admin Event KPI Stats API Route
 * GET /api/admin/events/kpi - Get platform-wide event KPI metrics (FM Section 17)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Service boundary: EventService
 *
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_8_PLAN.md
 * @phase Phase 8 - Polish + KPI Dashboard
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/events/kpi
 * Get platform-wide event KPI stats for admin analytics dashboard
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('access event KPI stats', 'admin');

  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'last_30_days';

  const eventService = getEventService();
  const kpi = await eventService.getKPIStats(period);
  return createSuccessResponse(kpi, 200);
});
