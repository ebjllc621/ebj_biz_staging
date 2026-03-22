/**
 * Group Duplicate API Route
 * POST /api/users/connections/groups/[groupId]/duplicate
 *
 * @phase Phase 4B - Group Sharing & Templates
 * @tier STANDARD
 * @generated ComponentBuilder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

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

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json().catch(() => ({})) as { name?: string };

  const group = await service.duplicateGroup(groupId, userId, body.name);

  return createSuccessResponse({ group }, context.requestId);
}, {
  requireAuth: true
}));
