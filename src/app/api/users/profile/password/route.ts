/**
 * Password Change API Route
 * PUT /api/users/profile/password - Change user password
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
import { PasswordChangeData } from '@features/profile/types';

/**
 * PUT /api/users/profile/password
 * Change the authenticated user's password
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
  const body = await context.request.json() as PasswordChangeData;

  // Validate required fields
  if (!body.current_password) {
    throw BizError.badRequest('Current password is required');
  }

  if (!body.new_password) {
    throw BizError.badRequest('New password is required');
  }

  if (!body.confirm_password) {
    throw BizError.badRequest('Password confirmation is required');
  }

  // Validate password length
  if (body.new_password.length < 8) {
    throw BizError.badRequest('New password must be at least 8 characters');
  }

  // Validate password match
  if (body.new_password !== body.confirm_password) {
    throw BizError.badRequest('New password and confirmation do not match');
  }

  // Don't allow same password
  if (body.current_password === body.new_password) {
    throw BizError.badRequest('New password must be different from current password');
  }

  const db = getDatabaseService();
  const service = new ProfileService(db);

  // Change password
  await service.changePassword(userId, body.current_password, body.new_password);

  return createSuccessResponse({
    message: 'Password changed successfully'
  }, context.requestId);
}, {
  allowedMethods: ['PUT'],
  requireAuth: true
});
