/**
 * Connection Group Restore API Route
 * POST /api/users/connections/groups/[groupId]/restore - Restore an archived group
 *
 * @tier SIMPLE
 * @phase Connection Groups - Archive/Restore
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';

function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const groupIdIndex = segments.indexOf('groups') + 1;
  return parseInt(segments[groupIdIndex] || '0', 10);
}

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const group = await service.restoreGroup(groupId, userId);

  return createSuccessResponse({ group }, context.requestId);
}, {
  requireAuth: true
}));
