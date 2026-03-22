/**
 * Admin User Suspend/Unsuspend API Route
 * PATCH /api/admin/users/[id]/suspend - Suspend or unsuspend user
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
 * PATCH /api/admin/users/[id]/suspend
 * Suspend or unsuspend user account
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
  const id = pathParts[pathParts.length - 2]; // suspend is last, id is second-to-last

  if (!id) {
    throw BizError.badRequest('User ID is required', {});
  }

  const userId = parseInt(id);

  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { id });
  }

  const body = await context.request.json();
  const { action, reason } = body;

  if (!action || !['suspend', 'unsuspend'].includes(action)) {
    throw BizError.badRequest(
      'Invalid action. Must be "suspend" or "unsuspend"',
      { action }
    );
  }

  if (action === 'suspend' && !reason) {
    throw BizError.badRequest('Reason is required for suspension', {
      reason
    });
  }

  const service = getUserManagementService();

  // Fetch before data for activity logging
  const beforeData = await service.getById(userId);
  if (!beforeData) {
    throw BizError.notFound('User', userId);
  }

  let updated;
  if (action === 'suspend') {
    updated = await service.suspend(userId, reason);
  } else {
    updated = await service.unsuspend(userId);
  }

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  const actionType = action === 'suspend' ? 'user_suspended' : 'user_unsuspended';
  const actionDescription = action === 'suspend'
    ? `Suspended user: ${beforeData.email}. Reason: ${reason}`
    : `Unsuspended user: ${beforeData.email}`;

  await adminActivityService.logModeration({
    adminUserId: currentUser.id,
    targetEntityType: 'user',
    targetEntityId: userId,
    actionType,
    actionDescription,
    beforeData: {
      id: beforeData.id,
      email: beforeData.email,
      status: beforeData.status
    },
    afterData: {
      status: action === 'suspend' ? 'suspended' : 'active',
      reason: action === 'suspend' ? reason : undefined
    },
    severity: 'normal'
  });

  return createSuccessResponse(updated, 200);
}));
