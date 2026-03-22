/**
 * Group Tab Access API Route
 * GET /api/users/connections/groups/[groupId]/tab-access
 * Returns the current user's accessible tabs for this group
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
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
 * GET /api/users/connections/groups/[groupId]/tab-access
 * Get current user's tab access for this group
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const isOwner = await service.verifyGroupOwnership(groupId, userId);
  const tabs = await service.getMemberTabAccess(groupId, userId);

  return createSuccessResponse({
    isOwner,
    tabs
  }, context.requestId);
}, {
  requireAuth: true
});
