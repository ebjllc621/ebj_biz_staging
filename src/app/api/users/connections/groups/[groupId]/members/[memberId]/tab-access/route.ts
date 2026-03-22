/**
 * Group Member Tab Access API Route
 * PATCH /api/users/connections/groups/[groupId]/members/[memberId]/tab-access
 * Owner grants/revokes tab visibility for a member
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

function extractIds(context: ApiContext): { groupId: number; memberId: number } {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');

  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupId = parseInt(pathParts[groupIdIndex] || '', 10);

  const memberIdIndex = pathParts.indexOf('members') + 1;
  const memberId = parseInt(pathParts[memberIdIndex] || '', 10);

  if (isNaN(groupId)) throw BizError.badRequest('Invalid group ID');
  if (isNaN(memberId)) throw BizError.badRequest('Invalid member ID');

  return { groupId, memberId };
}

/**
 * PATCH /api/users/connections/groups/[groupId]/members/[memberId]/tab-access
 * Update tab access permissions for a member (owner-only)
 *
 * @authenticated Required
 * @body { tabs: string[] } - Array of tab IDs to grant
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const { groupId, memberId } = extractIds(context);

  const body = await context.request.json() as { tabs: string[] };

  if (!Array.isArray(body.tabs)) {
    throw BizError.badRequest('tabs must be an array of tab IDs');
  }

  const member = await service.updateMemberTabAccess(groupId, memberId, userId, body.tabs);

  return createSuccessResponse({
    member
  }, context.requestId);
}, {
  requireAuth: true
}));
