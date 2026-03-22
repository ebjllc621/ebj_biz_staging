/**
 * Admin User Tags API Routes
 * POST /api/admin/users/[id]/tags - Add tag to user
 * DELETE /api/admin/users/[id]/tags - Remove tag from user
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
 * POST /api/admin/users/[id]/tags
 * Add tag to user
 */
export const POST = withCsrf(apiHandler(async (context) => {
  // Check admin authentication
  const currentUser = await getUserFromRequest(context.request as NextRequest);
  if (!currentUser || currentUser.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Extract user ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // tags is last, id is second-to-last

  if (!id) {
    throw BizError.badRequest('User ID is required', {});
  }

  const userId = parseInt(id);

  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { id });
  }

  const body = await context.request.json();
  const { tag, color } = body;

  if (!tag || typeof tag !== 'string') {
    throw BizError.badRequest('Tag name is required', { tag });
  }

  const service = getUserManagementService();

  await service.addTag(userId, tag, color);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: currentUser.id,
    targetEntityType: 'user',
    targetEntityId: userId,
    actionType: 'user_tag_added',
    actionCategory: 'update',
    actionDescription: `Added tag "${tag}" to user ${userId}`,
    afterData: { tag, color },
    severity: 'normal'
  });

  // Get updated tags
  const tags = await service.getUserTags(userId);

  return createSuccessResponse({ tags }, 201);
}));

/**
 * DELETE /api/admin/users/[id]/tags
 * Remove tag from user
 */
export const DELETE = withCsrf(apiHandler(async (context) => {
  // Check admin authentication
  const currentUser = await getUserFromRequest(context.request as NextRequest);
  if (!currentUser || currentUser.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Extract user ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // tags is last, id is second-to-last

  if (!id) {
    throw BizError.badRequest('User ID is required', {});
  }

  const userId = parseInt(id);

  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { id });
  }

  const searchParams = url.searchParams;
  const tag = searchParams.get('tag');

  if (!tag) {
    throw BizError.badRequest('Tag query parameter is required', { tag });
  }

  const service = getUserManagementService();

  await service.removeTag(userId, tag);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: currentUser.id,
    targetEntityType: 'user',
    targetEntityId: userId,
    actionType: 'user_tag_removed',
    actionCategory: 'update',
    actionDescription: `Removed tag "${tag}" from user ${userId}`,
    afterData: { tag },
    severity: 'normal'
  });

  // Get updated tags
  const tags = await service.getUserTags(userId);

  return createSuccessResponse({ tags }, 200);
}));
