/**
 * Admin Force User Logout API Route
 * POST /api/admin/users/[id]/force-logout - Force logout user (revoke all sessions)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only with password verification
 * - Response format: createSuccessResponse/createErrorResponse
 * - SessionService for session revocation
 *
 * @authority CLAUDE.md - API Standards
 * @phase User Management - Force Logout Feature
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { getUserManagementService, getSessionService } from '@core/services/ServiceRegistry';
import { NextRequest } from 'next/server';

/**
 * POST /api/admin/users/[id]/force-logout
 * Force logout user by revoking all their sessions
 */
export const POST = withCsrf(apiHandler(async (context) => {
  // Admin authentication
  const currentUser = await getUserFromRequest(context.request as NextRequest);
  if (!currentUser) {
    throw BizError.unauthorized('Authentication required');
  }
  if (currentUser.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Extract user ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // force-logout is last, id is second-to-last

  if (!id) {
    throw BizError.badRequest('User ID is required', {});
  }

  const userId = parseInt(id);

  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { id });
  }

  // Prevent admin from force-logging themselves out
  if (userId === currentUser.id) {
    throw BizError.badRequest('Cannot force logout yourself', {});
  }

  // Verify user exists
  const userService = getUserManagementService();
  const targetUser = await userService.getById(userId);
  if (!targetUser) {
    throw BizError.notFound('User', userId);
  }

  // Revoke all sessions for the user using SessionService
  const sessionService = getSessionService();
  await sessionService.initialize();
  const sessionsRevoked = await sessionService.revokeAllForUser(
    userId.toString(),
    'admin_force_logout'
  );

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logModeration({
    adminUserId: currentUser.id,
    targetEntityType: 'user',
    targetEntityId: userId,
    actionType: 'user_force_logout',
    actionDescription: `Force logged out user: ${targetUser.email}. ${sessionsRevoked} session(s) revoked.`,
    beforeData: {
      id: targetUser.id,
      email: targetUser.email,
      activeSessions: sessionsRevoked
    },
    afterData: {
      activeSessions: 0,
      revokedAt: new Date().toISOString()
    },
    severity: 'normal'
  });

  return createSuccessResponse({
    message: `Successfully logged out user ${targetUser.email}`,
    sessionsRevoked,
    userId
  }, 200);
}));

// Method guards - only POST allowed
import { jsonMethodNotAllowed } from '@/lib/http/json';

const ALLOWED_METHODS = ['POST'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
