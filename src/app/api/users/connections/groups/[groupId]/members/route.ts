/**
 * Group Members API Route
 * GET /api/users/connections/groups/[groupId]/members - Get group members
 * POST /api/users/connections/groups/[groupId]/members - Add members to group
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
 * Extract groupId from URL path
 * Path: /api/users/connections/groups/[groupId]/members
 */
function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  // Find 'groups' index and get next segment
  const groupsIndex = pathParts.indexOf('groups');
  const groupIdStr = pathParts[groupsIndex + 1] || '';
  const groupId = parseInt(groupIdStr, 10);

  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }

  return groupId;
}

/**
 * GET /api/users/connections/groups/[groupId]/members
 * Get all members of a group
 *
 * @authenticated Required
 * @param groupId - Group ID
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const members = await service.getGroupMembers(groupId, userId);

  return createSuccessResponse({
    members,
    total: members.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/users/connections/groups/[groupId]/members
 * Add members to a group
 *
 * @authenticated Required
 * @param groupId - Group ID
 * @body { memberIds: number[] } - Array of user IDs to add
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json() as { memberIds: number[] };

  if (!Array.isArray(body.memberIds) || body.memberIds.length === 0) {
    throw BizError.badRequest('memberIds must be a non-empty array');
  }

  // Validate all IDs are numbers
  if (!body.memberIds.every(id => typeof id === 'number' && id > 0)) {
    throw BizError.badRequest('All memberIds must be positive numbers');
  }

  const result = await service.addMembers(groupId, userId, body.memberIds);

  return createSuccessResponse({
    members: result.members,
    added: result.members.length,
    recommendationsCreated: result.recommendationsCreated,
    potentialPoints: result.potentialPoints
  }, context.requestId);
}, {
  requireAuth: true
}));
