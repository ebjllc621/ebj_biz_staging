/**
 * Group Analytics API Route
 * GET /api/users/connections/groups/[groupId]/analytics
 *
 * @phase Phase 4A - Group Analytics
 * @tier STANDARD
 * @generated ComponentBuilder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const groupsIndex = pathParts.indexOf('groups');
  const groupIdStr = pathParts[groupsIndex + 1] || '';
  const groupId = parseInt(groupIdStr, 10);
  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }
  return groupId;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const analytics = await service.getGroupAnalytics(groupId, userId);

  return createSuccessResponse({ analytics }, context.requestId);
}, {
  requireAuth: true
});
