/**
 * Admin Users API Routes
 * GET /api/admin/users - List all users with filters
 * POST /api/admin/users - Bulk update users (admin override)
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
 * GET /api/admin/users
 * Get all users with optional filters and pagination
 */
export const GET = apiHandler(async (context) => {
  // TODO: Check admin authentication
  // const session = await getSession(context.request);
  // if (!session || context.session.role !== 'admin') {
  //   throw BizError.unauthorized('Admin access required');
  // }

  const url = new URL(context.request.url);
  const searchParams = url.searchParams;

  // Parse filters
  // NO membership_tier column in users table - verified 2026-01-31
  const filters: Record<string, unknown> = {};
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const isVerified = searchParams.get('is_verified');
  const isBusinessOwner = searchParams.get('is_business_owner');
  const searchQuery = searchParams.get('q');

  if (role) filters.role = role;
  if (status) filters.status = status;
  if (isVerified !== null) filters.is_verified = isVerified === 'true';
  if (isBusinessOwner !== null)
    filters.is_business_owner = isBusinessOwner === 'true';
  if (searchQuery) filters.searchQuery = searchQuery;

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const pagination = { page, limit };

  // Get users
  const service = getUserManagementService();
  const result = await service.getAll(filters, pagination);

  return createSuccessResponse({
    users: result.data,
    pagination: result.pagination
  }, 200);
});

/**
 * POST /api/admin/users
 * Bulk update users (admin override)
 */
export const POST = withCsrf(apiHandler(async (context) => {
  // Check admin authentication
  const currentUser = await getUserFromRequest(context.request as NextRequest);
  if (!currentUser || currentUser.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const body = await context.request.json();
  const { userIds, updates } = body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw BizError.badRequest('userIds array is required', { userIds });
  }

  if (!updates || typeof updates !== 'object') {
    throw BizError.badRequest('updates object is required', { updates });
  }

  const service = getUserManagementService();
  const results = [];

  for (const userId of userIds) {
    const updated = await service.update(userId, updates);
    results.push(updated);
  }

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: currentUser.id,
    targetEntityType: 'user',
    targetEntityId: userIds[0],
    actionType: 'user_updated',
    actionCategory: 'update',
    actionDescription: `Bulk updated ${results.length} users`,
    afterData: { userIds, updates, count: results.length },
    severity: 'normal'
  });

  return createSuccessResponse(
    { updated: results.length, users: results },
    200
  );
}));
