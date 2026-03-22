/**
 * Following API Route
 * GET /api/users/following - Get following list
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();
  const userId = parseInt(context.userId!, 10);

  // Get query params
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const { following, total } = await service.getFollowing(userId, { limit, offset });

  return createSuccessResponse({
    following,
    total,
    pagination: {
      limit,
      offset,
      hasMore: offset + following.length < total
    }
  }, context.requestId);
}, {
  requireAuth: true
});
