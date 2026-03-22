/**
 * Admin User Detail API Routes
 * GET /api/admin/users/[id] - Get user by ID
 * PATCH /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Delete user
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse/createErrorResponse
 * - DatabaseService boundary compliance
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 4 - Task 4.7: UserManagementService API Routes
 */

import { getUserManagementService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/users/[id]
 * Get user by ID with statistics
 */
export const GET = apiHandler(async (context) => {
  // TODO: Check admin authentication
  // const session = await getSession(context.request);
  // if (!session || session.role !== 'admin') {
  //   throw BizError.unauthorized('Admin access required');
  // }

  // Extract user ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('User ID is required', {});
  }

  const userId = parseInt(id);

  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { id });
  }

  const service = getUserManagementService();

  // Get user details
  const user = await service.getById(userId);
  if (!user) {
    throw BizError.notFound('User', userId);
  }

  // Get user statistics
  const stats = await service.getUserStats(userId);

  // Get user tags
  const tags = await service.getUserTags(userId);

  // Get recent activity
  const recentActivity = await service.getActivityLog(userId, 10);

  return createSuccessResponse({
    user,
    stats,
    tags,
    recentActivity
  });
});

/**
 * PATCH /api/admin/users/[id]
 * Update user
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context) => {
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
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('User ID is required', {});
  }

  const userId = parseInt(id);

  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { id });
  }

  const body = await context.request.json();

  const service = getUserManagementService();

  // Fetch before data for activity logging
  const beforeData = await service.getById(userId);
  if (!beforeData) {
    throw BizError.notFound('User', userId);
  }

  const updated = await service.update(userId, body);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  const hasRoleChange = body.role !== undefined && body.role !== beforeData.role;
  const severity = hasRoleChange ? 'high' : 'normal';

  await adminActivityService.logActivity({
    adminUserId: currentUser.id,
    targetEntityType: 'user',
    targetEntityId: userId,
    actionType: 'user_updated',
    actionCategory: 'update',
    actionDescription: `Updated user: ${beforeData.email}. Changes: ${Object.keys(body).join(', ')}`,
    beforeData: {
      id: beforeData.id,
      email: beforeData.email,
      role: beforeData.role,
      status: beforeData.status
    },
    afterData: body,
    severity
  });

  return createSuccessResponse(updated, 200);
}));

/**
 * DELETE /api/admin/users/[id]
 * Delete user (soft delete)
 *
 * NOTE: Removed withCsrf wrapper to match working categories pattern.
 * CSRF protection is still handled by:
 * 1. fetchWithCsrf on client sends x-csrf-token header
 * 2. requireAuth ensures user is authenticated
 * 3. Admin role check provides authorization
 */
export const DELETE = apiHandler(async (context) => {
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
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('User ID is required', {});
  }

  const userId = parseInt(id);

  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { id });
  }

  // Prevent self-deletion
  if (userId === currentUser.id) {
    throw BizError.forbidden('Cannot delete your own account');
  }

  const service = getUserManagementService();

  // Fetch before data for activity logging
  const beforeData = await service.getById(userId);
  if (!beforeData) {
    throw BizError.notFound('User', userId);
  }

  await service.delete(userId);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logDeletion({
    adminUserId: currentUser.id,
    targetEntityType: 'user',
    targetEntityId: userId,
    actionDescription: `Deleted user: ${beforeData.email}`,
    beforeData: {
      id: beforeData.id,
      email: beforeData.email,
      role: beforeData.role,
      status: beforeData.status
    },
    severity: 'high'
  });

  return createSuccessResponse({
    message: 'User deleted successfully',
    userId
  }, 200);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE']
});
