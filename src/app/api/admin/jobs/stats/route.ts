/**
 * Admin Job Stats API Route
 * GET /api/admin/jobs/stats - Get job posting statistics for admin jobs page
 *
 * @tier STANDARD
 * @phase Phase 8A - Bug fix for existing admin jobs page stats panel
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_8_PLAN.md
 */

import { getJobService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/jobs/stats
 * Get job posting stats for admin jobs manager page
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('access job stats', 'admin');

  const jobService = getJobService();
  const stats = await jobService.getAdminStats();
  return createSuccessResponse(stats, 200);
});
