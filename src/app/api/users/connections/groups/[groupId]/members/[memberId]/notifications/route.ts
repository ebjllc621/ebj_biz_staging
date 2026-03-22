/**
 * Group Member Notification Preferences API Route
 * PATCH /api/users/connections/groups/[groupId]/members/[memberId]/notifications - Update preferences
 *
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { UpdateMemberNotificationPreferencesInput } from '@features/connections/types/group-actions';

/**
 * Extract IDs from URL path
 */
function extractIds(context: ApiContext): { groupId: number; memberId: number } {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');

  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupIdStr = pathParts[groupIdIndex] || '';
  const groupId = parseInt(groupIdStr, 10);

  const memberIdIndex = pathParts.indexOf('members') + 1;
  const memberIdStr = pathParts[memberIdIndex] || '';
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
 * PATCH /api/users/connections/groups/[groupId]/members/[memberId]/notifications
 * Update member notification preferences
 *
 * @authenticated Required
 * @body UpdateMemberNotificationPreferencesInput
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const { groupId, memberId } = extractIds(context);

  // Verify user is updating their own preferences or is group owner
  if (userId !== memberId) {
    const hasAccess = await service.verifyGroupOwnership(groupId, userId);
    if (!hasAccess) {
      throw BizError.forbidden('Only group owner can update other members\' preferences');
    }
  }

  const preferences = await context.request.json() as UpdateMemberNotificationPreferencesInput;

  await service.updateMemberNotificationPreferences(groupId, memberId, preferences);

  return createSuccessResponse({
    success: true,
    message: 'Notification preferences updated'
  }, context.requestId);
}, {
  requireAuth: true
}));
