/**
 * Admin Listings Moderation API Route
 * PATCH /api/admin/listings/[id]/moderate - Approve or reject a listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - CSRF protection: MANDATORY for state-changing operations
 * - Error handling: BizError-based custom errors
 * - Admin authorization required
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - Route Integration
 * @phase Listing Approval System Phase 4
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getListingApprovalService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { NextRequest } from 'next/server';

/**
 * PATCH /api/admin/listings/[id]/moderate
 * Moderate a listing (approve or reject)
 *
 * @admin Admin authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'moderate')
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

  // Parse request body for action
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

  const action = requestBody.action as string;
  if (!action || !['approve', 'reject'].includes(action)) {
    throw BizError.badRequest('Action must be "approve" or "reject"', { action });
  }

  const service = getListingApprovalService();

  // Execute approval or rejection
  if (action === 'approve') {
    const adminNotes = requestBody.adminNotes as string | undefined;

    const result = await service.approve({
      listingId,
      adminUserId: adminIdNum,
      options: { adminNotes }
    });

    // Log to AdminActivityService for admin audit trail
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: currentUser.id,
      targetEntityType: 'listing',
      targetEntityId: listingId,
      actionType: 'listing_moderated',
      actionCategory: 'moderation',
      actionDescription: `Approved listing ID ${listingId}`,
      afterData: { action: 'approve', adminNotes, userRoleUpdated: result.userRoleUpdated },
      severity: 'normal'
    });

    return createSuccessResponse({
      message: `Listing approved successfully${result.userRoleUpdated ? ' (user upgraded to listing_member)' : ''}`,
      listing: result.listing,
      userRoleUpdated: result.userRoleUpdated,
      activityLogged: result.activityLogged
    }, context.requestId);
  } else {
    // Reject action
    const reason = (requestBody.reason as string) || 'Listing rejected by administrator';
    const adminNotes = requestBody.adminNotes as string | undefined;

    const result = await service.reject({
      listingId,
      adminUserId: adminIdNum,
      options: {
        reason,
        adminNotes
      }
    });

    // Log to AdminActivityService for admin audit trail
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: currentUser.id,
      targetEntityType: 'listing',
      targetEntityId: listingId,
      actionType: 'listing_moderated',
      actionCategory: 'moderation',
      actionDescription: `Rejected listing ID ${listingId}: ${reason}`,
      afterData: { action: 'reject', reason, adminNotes, userRoleUpdated: result.userRoleUpdated },
      severity: 'normal'
    });

    return createSuccessResponse({
      message: 'Listing rejected successfully',
      listing: result.listing,
      userRoleUpdated: result.userRoleUpdated,
      activityLogged: result.activityLogged
    }, context.requestId);
  }
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
  trackPerformance: true,
  rateLimit: {
    requests: 20,
    windowMs: 3600000 // 20 moderation actions per hour per admin
  }
}));
