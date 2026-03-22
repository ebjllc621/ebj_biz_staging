/**
 * Profile API Route
 * GET /api/users/profile - Get own profile
 * PUT /api/users/profile - Update own profile
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required via httpOnly cookies
 *
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/app/api/homepage/authenticated/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { ProfileService } from '@features/profile/services/ProfileService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { ProfileUpdateData } from '@features/profile/types';

/**
 * GET /api/users/profile
 * Get the authenticated user's profile
 *
 * @authenticated Requires valid session
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Ensure user is authenticated
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const userId = parseInt(context.userId, 10);

  const db = getDatabaseService();
  const service = new ProfileService(db);

  // Get profile by ID
  const profile = await service.getProfileById(userId);

  if (!profile) {
    throw BizError.notFound('Profile not found');
  }

  return createSuccessResponse({
    profile
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});

/**
 * PUT /api/users/profile
 * Update the authenticated user's profile
 *
 * @authenticated Requires valid session
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  // Ensure user is authenticated
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const userId = parseInt(context.userId, 10);

  // Parse request body
  const body = await context.request.json() as ProfileUpdateData;

  // Validate social links if provided
  if (body.social_links) {
    for (const [platform, url] of Object.entries(body.social_links)) {
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
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

  const db = getDatabaseService();
  const service = new ProfileService(db);

  // Update profile
  const updatedProfile = await service.updateProfile(userId, body);

  return createSuccessResponse({
    profile: updatedProfile,
    message: 'Profile updated successfully'
  }, context.requestId);
}, {
  allowedMethods: ['PUT'],
  requireAuth: true
});
