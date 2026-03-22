/**
 * Listing Rejection API Route
 * PATCH /api/listings/[id]/reject - Reject listing (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Admin authorization required
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getListingApprovalService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { NextRequest } from 'next/server';

/**
 * PATCH /api/listings/[id]/reject
 * Reject listing (sets approved status to 'rejected')
 *
 * @admin Admin authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'reject')
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
  }

  // Get admin ID from context
  const adminId = context.userId;
  if (!adminId) {
    throw BizError.unauthorized('Admin authentication required');
  }
  const adminIdNum = parseInt(adminId);
  if (isNaN(adminIdNum)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // GOVERNANCE: Admin role verification - CRITICAL security fix
  const currentUser = await getUserFromRequest(context.request as NextRequest);
  if (!currentUser) {
    throw BizError.unauthorized('Authentication required');
  }
  if (currentUser.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Parse request body for rejection reason
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  const reason = (requestBody.reason as string) || 'Listing rejected by administrator';
  const adminNotes = requestBody.adminNotes as string | undefined;

  const service = getListingApprovalService();
  const result = await service.reject({
    listingId,
    adminUserId: adminIdNum,
    options: {
      reason,
      adminNotes
    }
  });

  return createSuccessResponse({
    listing: result.listing,
    userRoleUpdated: result.userRoleUpdated,
    activityLogged: result.activityLogged
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
  trackPerformance: true,
  rateLimit: {
    requests: 20,
    windowMs: 3600000 // 20 rejections per hour per admin
  }
}));
