/**
 * Group Mute API Route
 * PATCH /api/users/connections/groups/[groupId]/mute - Toggle mute for current user
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
 * PATCH - Toggle mute status for the current user
 * @body { muted: boolean }
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json() as { muted: boolean };

  if (typeof body.muted !== 'boolean') {
    throw BizError.badRequest('muted must be a boolean');
  }

  await service.toggleMuteGroup(groupId, userId, body.muted);

  return createSuccessResponse({
    success: true,
    muted: body.muted
  }, context.requestId);
}, {
  requireAuth: true
}));
