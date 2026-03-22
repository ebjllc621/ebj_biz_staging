/**
 * Group Leave API Route
 * POST /api/users/connections/groups/[groupId]/leave - Member leaves group
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupId = parseInt(pathParts[groupIdIndex] || '', 10);
  if (isNaN(groupId)) throw BizError.badRequest('Invalid group ID');
  return groupId;
}

/**
 * POST - Member voluntarily leaves the group
 * @body { reason?: string }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json() as { reason?: string };

  await service.leaveGroup(groupId, userId, body.reason);

  return createSuccessResponse({
    success: true,
    message: 'You have left the group'
  }, context.requestId);
}, {
  requireAuth: true
}));
