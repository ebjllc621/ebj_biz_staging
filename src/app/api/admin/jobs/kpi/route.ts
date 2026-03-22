/**
 * Admin Job KPI Stats API Route
 * GET /api/admin/jobs/kpi - Get platform-wide job KPI metrics (FM Section 18)
 *
 * @tier STANDARD
 * @phase Phase 8B - KPI Dashboard
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_8_PLAN.md
 */

import { getJobService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/jobs/kpi
 * Get platform-wide job KPI stats for admin analytics dashboard
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('access job KPI stats', 'admin');

  const jobService = getJobService();
  const kpi = await jobService.getKPIStats();
  return createSuccessResponse(kpi, 200);
});
