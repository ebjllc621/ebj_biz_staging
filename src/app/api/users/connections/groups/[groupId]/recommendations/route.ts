/**
 * Group Listing Recommendations API Route
 * GET /api/users/connections/groups/[groupId]/recommendations - Get recommendations
 * POST /api/users/connections/groups/[groupId]/recommendations - Send recommendation
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
import type { SendGroupListingRecommendationInput } from '@features/connections/types/group-actions';

/**
 * Extract groupId from URL path
 */
function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupIdStr = pathParts[groupIdIndex] || '';
  const groupId = parseInt(groupIdStr, 10);

  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }

  return groupId;
}

/**
 * GET /api/users/connections/groups/[groupId]/recommendations
 * Get listing recommendations for a group
 *
 * @authenticated Required
 * @query limit - Max recommendations to return (default 50)
 * @query offset - Pagination offset (default 0)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const recommendations = await service.getGroupListingRecommendations(groupId, userId, {
    limit,
    offset
  });

  return createSuccessResponse({
    recommendations
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/users/connections/groups/[groupId]/recommendations
 * Recommend a listing to all group members
 *
 * @authenticated Required
 * @body { listingId: number, message?: string }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json() as Omit<SendGroupListingRecommendationInput, 'groupId'>;

  if (!body.listingId || isNaN(body.listingId)) {
    throw BizError.badRequest('listingId is required');
  }

  if (body.message && body.message.length > 500) {
    throw BizError.badRequest('Message must be 500 characters or less');
  }

  const input: SendGroupListingRecommendationInput = {
    groupId,
    ...body
  };

  const result = await service.recommendListingToGroup(userId, input);

  return createSuccessResponse({
    recommendation: result.recommendation,
    sentTo: result.sentTo
  }, context.requestId);
}, {
  requireAuth: true
}));
