/**
 * Connection Groups API Route
 * GET /api/users/connections/groups - Get user's connection groups
 * POST /api/users/connections/groups - Create new group
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
 * @reference src/app/api/users/connections/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import type { CreateGroupInput, GetGroupsOptions } from '@features/connections/types/groups';

/**
 * GET /api/users/connections/groups
 * Get all connection groups for the authenticated user
 *
 * @authenticated Required
 * @query includeArchived - Include archived groups (default: false)
 * @query limit - Results limit (default: 100)
 * @query offset - Pagination offset (default: 0)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);

  // Parse query parameters
  const includeArchived = context.request.nextUrl.searchParams.get('includeArchived') === 'true';
  const limit = parseInt(context.request.nextUrl.searchParams.get('limit') || '100', 10);
  const offset = parseInt(context.request.nextUrl.searchParams.get('offset') || '0', 10);

  const options: GetGroupsOptions = {
    includeArchived,
    limit,
    offset
  };

  // Fetch both owned groups and groups user is a member of
  const [ownedGroups, memberGroups] = await Promise.all([
    service.getUserGroups(userId, options),
    service.getMemberGroups(userId)
  ]);

  // Merge and deduplicate (owned groups first, then member groups)
  const ownedIds = new Set(ownedGroups.map(g => g.id));
  const allGroups = [
    ...ownedGroups,
    ...memberGroups.filter(g => !ownedIds.has(g.id) && (includeArchived || !g.isArchived))
  ];

  return createSuccessResponse({
    groups: allGroups,
    total: allGroups.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/users/connections/groups
 * Create a new connection group
 *
 * @authenticated Required
 * @body CreateGroupInput - Group details
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);

  const input = await context.request.json() as CreateGroupInput;

  // Validate required fields
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Group name is required');
  }

  if (input.name.length > 100) {
    throw new Error('Group name must be 100 characters or less');
  }

  const group = await service.createGroup(userId, input);

  return createSuccessResponse({
    group
  }, context.requestId);
}, {
  requireAuth: true
}));
