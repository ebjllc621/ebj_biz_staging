/**
 * Individual Group Member API Route
 * DELETE /api/users/connections/groups/[groupId]/members/[memberId] - Remove member
 * PATCH /api/users/connections/groups/[groupId]/members/[memberId] - Update member
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required
 *
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/connections/[connectionId]/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * Extract groupId and memberId from URL path
 * Path: /api/users/connections/groups/[groupId]/members/[memberId]
 */
function extractParams(context: ApiContext): { groupId: number; memberId: number } {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');

  // Find indices
  const groupsIndex = pathParts.indexOf('groups');
  const membersIndex = pathParts.indexOf('members');

  const groupIdStr = pathParts[groupsIndex + 1] || '';
  const memberIdStr = pathParts[membersIndex + 1] || '';

  const groupId = parseInt(groupIdStr, 10);
  const memberId = parseInt(memberIdStr, 10);

  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }

  if (isNaN(memberId)) {
    throw BizError.badRequest('Invalid member ID');
  }

  return { groupId, memberId };
}

/**
 * DELETE /api/users/connections/groups/[groupId]/members/[memberId]
 * Remove a member from a group
 *
 * @authenticated Required
 * @param groupId - Group ID
 * @param memberId - Member user ID
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const { groupId, memberId } = extractParams(context);

  await service.removeMember(groupId, userId, memberId);

  return createSuccessResponse({
    success: true,
    message: 'Member removed from group'
  }, context.requestId);
}, {
  requireAuth: true
}));

/**
 * PATCH /api/users/connections/groups/[groupId]/members/[memberId]
 * Update member settings (e.g., PYMK opt-out)
 *
 * @authenticated Required
 * @param groupId - Group ID
 * @param memberId - Member user ID
 * @body { pymkOptOut?: boolean } - Settings to update
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const { groupId, memberId } = extractParams(context);

  const body = await context.request.json() as { pymkOptOut?: boolean };

  // Verify group ownership first
  const hasAccess = await service.verifyGroupOwnership(groupId, userId);
  if (!hasAccess) {
    throw BizError.unauthorized('Not authorized to modify this group');
  }

  if (body.pymkOptOut !== undefined) {
    await service.setGroupPymkOptOut(groupId, memberId, body.pymkOptOut);
  }

  return createSuccessResponse({
    success: true,
    message: 'Member settings updated'
  }, context.requestId);
}, {
  requireAuth: true
}));
