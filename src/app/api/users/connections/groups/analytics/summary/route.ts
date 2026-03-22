/**
 * User Groups Summary Analytics API Route
 * GET /api/users/connections/groups/analytics/summary
 *
 * @phase Phase 4A - Group Analytics
 * @tier STANDARD
 * @generated ComponentBuilder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);

  const summary = await service.getUserGroupsSummaryAnalytics(userId);

  return createSuccessResponse({ summary }, context.requestId);
}, {
  requireAuth: true
});
