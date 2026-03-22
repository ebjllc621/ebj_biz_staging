/**
 * Social Media Disconnect Route
 * POST /api/social/disconnect — Soft-deletes a social media connection
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 2
 * @reference src/app/api/dashboard/listings/[listingId]/creator-profiles/platform/disconnect/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getSocialMediaService } from '@core/services/ServiceRegistry';

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const body = await context.request.json() as Record<string, unknown>;
  const { connection_id } = body;

  if (!connection_id || typeof connection_id !== 'number') {
    throw BizError.badRequest('connection_id is required and must be a number');
  }

  const socialService = getSocialMediaService();

  // Verify the connection belongs to a listing the user owns
  const connection = await socialService.getConnectionById(connection_id as number);
  if (!connection) {
    throw BizError.notFound('Social media connection not found');
  }
  if (connection.user_id !== user.id) {
    throw BizError.forbidden('You do not have permission to disconnect this account');
  }

  // Soft delete (is_active = 0)
  await socialService.deleteConnection(connection_id as number);

  return createSuccessResponse({ disconnected: true, platform: connection.platform }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
