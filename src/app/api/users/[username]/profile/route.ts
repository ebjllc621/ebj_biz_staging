/**
 * Public Profile API Route
 * GET /api/users/[username]/profile - Get public profile data
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Optional (affects visibility filtering)
 *
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/app/api/homepage/authenticated/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { ProfileService } from '@features/profile/services/ProfileService';
import { ConnectionService } from '@features/connections/services/ConnectionService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { ConnectionStatus } from '@features/connections/types';

/**
 * GET /api/users/[username]/profile
 * Get public profile data including:
 * - Profile information (visibility-filtered)
 * - Profile statistics
 * - Edit permissions
 *
 * @public Optional authentication (affects visibility)
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

  const db = getDatabaseService();
  const service = new ProfileService(db);

  // Get viewer ID if authenticated
  const viewerId = context.userId ? parseInt(context.userId, 10) : undefined;

  // Get profile with visibility check
  // This will throw BizError.accountSuspended or BizError.accountDeleted if account is not accessible
  const profile = await service.getPublicProfile(username, viewerId);

  if (!profile) {
    throw BizError.notFound('Profile not found or not accessible');
  }

  // Get profile statistics
  const stats = await service.getProfileStats(profile.id);

  // Record profile view if viewer is authenticated and not the owner
  if (viewerId && viewerId !== profile.id) {
    await service.recordProfileView(profile.id, viewerId);
  }

  // Determine edit permissions
  const isOwner = viewerId ? viewerId === profile.id : false;
  let canEdit = isOwner;

  // Check if admin
  if (!isOwner && viewerId) {
    const viewerProfile = await service.getProfileById(viewerId);
    if (viewerProfile?.role === 'admin') {
      canEdit = true;
    }
  }

  // Get connection status and follow status between viewer and profile owner
  let connectionStatus: ConnectionStatus = 'none';
  let isFollowing = false;
  if (viewerId && !isOwner) {
    const connectionService = new ConnectionService(db);
    connectionStatus = await connectionService.getConnectionStatus(viewerId, profile.id);
    isFollowing = await connectionService.isFollowing(viewerId, profile.id);
  }

  return createSuccessResponse({
    profile,
    stats,
    is_owner: isOwner,
    can_edit: canEdit,
    connection_status: connectionStatus,
    is_following: isFollowing
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: false // Optional auth - affects visibility
});

/**
 * PUT /api/users/[username]/profile
 * Update a user's profile by username
 *
 * Permissions:
 * - Owner can update their own profile
 * - Admin can update any user's profile
 *
 * @authenticated Requires valid session
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  // Extract username from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const usernameIndex = pathParts.findIndex(part => part === 'users') + 1;
  const username = pathParts[usernameIndex];

  if (!username) {
    throw BizError.badRequest('Username is required');
  }

  // Ensure user is authenticated
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const viewerId = parseInt(context.userId, 10);

  const db = getDatabaseService();
  const service = new ProfileService(db);

  // Get target user's profile
  const targetProfile = await service.getPublicProfile(username, viewerId);
  if (!targetProfile) {
    throw BizError.notFound('Profile not found');
  }

  // Check permissions: must be owner OR admin
  const isOwner = viewerId === targetProfile.id;
  let canEdit = isOwner;

  if (!isOwner) {
    const viewerProfile = await service.getProfileById(viewerId);
    if (viewerProfile?.role === 'admin') {
      canEdit = true;
    }
  }

  if (!canEdit) {
    throw BizError.forbidden('You do not have permission to edit this profile');
  }

  // Parse and validate request body
  const body = await context.request.json() as import('@features/profile/types').ProfileUpdateData;

  // Validate social links if provided
  if (body.social_links) {
    for (const [platform, urlValue] of Object.entries(body.social_links)) {
      if (urlValue && !urlValue.startsWith('http://') && !urlValue.startsWith('https://')) {
        throw BizError.badRequest(`Invalid URL for ${platform}. URLs must start with http:// or https://`);
      }
    }
  }

  // Validate profile visibility if provided
  if (body.profile_visibility) {
    const validVisibilities = ['public', 'connections', 'private'];
    if (!validVisibilities.includes(body.profile_visibility)) {
      throw BizError.badRequest('Invalid profile visibility. Must be public, connections, or private');
    }
  }

  // Update the TARGET user's profile (not the viewer's profile!)
  const updatedProfile = await service.updateProfile(targetProfile.id, body);

  return createSuccessResponse({
    profile: updatedProfile,
    message: 'Profile updated successfully'
  }, context.requestId);
}, {
  allowedMethods: ['PUT'],
  requireAuth: true
});
