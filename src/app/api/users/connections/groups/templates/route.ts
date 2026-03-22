/**
 * User Group Templates API Route
 * GET /api/users/connections/groups/templates
 *
 * @phase Phase 4B - Group Sharing & Templates
 * @tier STANDARD
 * @generated ComponentBuilder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);

  const templates = await service.getUserTemplates(userId);

  return createSuccessResponse({ templates }, context.requestId);
}, {
  requireAuth: true
});
