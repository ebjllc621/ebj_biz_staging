/**
 * Follow API Route
 * POST /api/users/follows - Follow a user
 * DELETE /api/users/follows - Unfollow a user
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

export const POST = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();
  const { following_id } = body;

  if (!following_id) {
    throw BizError.badRequest('following_id is required');
  }

  await service.followUser(userId, parseInt(following_id, 10));

  return createSuccessResponse({
    message: 'Successfully followed user',
    following_id: parseInt(following_id, 10)
  }, context.requestId);
}, {
  requireAuth: true
});

export const DELETE = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();
  const { following_id } = body;

  if (!following_id) {
    throw BizError.badRequest('following_id is required');
  }

  await service.unfollowUser(userId, parseInt(following_id, 10));

  return createSuccessResponse({
    message: 'Successfully unfollowed user',
    following_id: parseInt(following_id, 10)
  }, context.requestId);
}, {
  requireAuth: true
});
