/**
 * Track Recommendation Engagement API Route
 * POST /api/users/connections/groups/[groupId]/recommendations/[id]/track - Track view/click
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

/**
 * Extract IDs from URL path
 */
function extractIds(context: ApiContext): { groupId: number; recommendationId: number } {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');

  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupIdStr = pathParts[groupIdIndex] || '';
  const groupId = parseInt(groupIdStr, 10);

  const recommendationIdIndex = pathParts.indexOf('recommendations') + 1;
  const recommendationIdStr = pathParts[recommendationIdIndex] || '';
  const recommendationId = parseInt(recommendationIdStr, 10);

  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }

  if (isNaN(recommendationId)) {
    throw BizError.badRequest('Invalid recommendation ID');
  }

  return { groupId, recommendationId };
}

/**
 * POST /api/users/connections/groups/[groupId]/recommendations/[id]/track
 * Track recommendation engagement (view or click)
 *
 * @authenticated Required
 * @body { action: 'view' | 'click' }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const { recommendationId } = extractIds(context);

  const body = await context.request.json() as { action: 'view' | 'click' };

  if (!body.action || !['view', 'click'].includes(body.action)) {
    throw BizError.badRequest('action must be "view" or "click"');
  }

  await service.trackRecommendationEngagement(recommendationId, userId, body.action);

  return createSuccessResponse({
    success: true,
    action: body.action
  }, context.requestId);
}, {
  requireAuth: true
}));
