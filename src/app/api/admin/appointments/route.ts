/**
 * Admin Appointments API Route
 *
 * GET /api/admin/appointments - Get all appointments (placeholder for future implementation)
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md
 * @tier STANDARD
 * @note Appointments table not yet created - this is a placeholder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';

export const GET = apiHandler(async (context: ApiContext) => {
  // Placeholder query - appointments table would need to be created
  // For now, return empty array
  const appointments: unknown[] = [];

  return createSuccessResponse({ appointments, message: 'Appointments feature pending implementation' }, context.requestId);
});
