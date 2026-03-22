/**
 * Followers API Route
 * GET /api/users/followers - Get followers list
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

  const { followers, total } = await service.getFollowers(userId, { limit, offset });

  return createSuccessResponse({
    followers,
    total,
    pagination: {
      limit,
      offset,
      hasMore: offset + followers.length < total
    }
  }, context.requestId);
}, {
  requireAuth: true
});
