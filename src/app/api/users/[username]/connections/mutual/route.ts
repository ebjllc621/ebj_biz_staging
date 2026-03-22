/**
 * Mutual Connections API Route
 * GET /api/users/[username]/connections/mutual - Get mutual connections between viewer and target user
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required (must be logged in to see mutual connections)
 *
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/[username]/profile/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { ProfileService } from '@features/profile/services/ProfileService';
import { ConnectionService } from '@features/connections/services/ConnectionService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/users/[username]/connections/mutual
 * Get mutual connections (shared connections) between the authenticated viewer and the target user
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Extract username from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const usernameIndex = pathParts.findIndex(part => part === 'users') + 1;
  const username = pathParts[usernameIndex];

  if (!username) {
    throw BizError.badRequest('Username is required');
  }

  const viewerId = parseInt(context.userId!, 10);

  const db = getDatabaseService();
  const profileService = new ProfileService(db);
  const connectionService = new ConnectionService(db);

  // Get target user's profile
  const targetProfile = await profileService.getPublicProfile(username, viewerId);

  if (!targetProfile) {
    throw BizError.notFound('User not found');
  }

  // Don't return mutual connections for own profile
  if (targetProfile.id === viewerId) {
    return createSuccessResponse({
      mutual_connections: [],
      total: 0,
      is_own_profile: true
    }, context.requestId);
  }

  // Get mutual connections between viewer and target user
  const mutualConnections = await connectionService.getMutualConnections(viewerId, targetProfile.id);

  return createSuccessResponse({
    mutual_connections: mutualConnections.map(conn => ({
      id: conn.user_id,
      username: conn.username,
      display_name: conn.display_name,
      avatar_url: conn.avatar_url
    })),
    total: mutualConnections.length,
    is_own_profile: false
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
