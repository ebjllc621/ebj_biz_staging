/**
 * Admin Listing Suspend/Unsuspend API Route
 * PATCH /api/admin/listings/[id]/suspend - Suspend or unsuspend listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse/createErrorResponse
 * - DatabaseService boundary compliance
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 4.5 - Confirmation Modals
 */

import { getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { NextRequest } from 'next/server';
import { ListingStatus } from '@core/services/ListingService';

/**
 * PATCH /api/admin/listings/[id]/suspend
 * Suspend or unsuspend listing
 */
export const PATCH = withCsrf(apiHandler(async (context) => {
  // Admin authentication
  const currentUser = await getUserFromRequest(context.request as NextRequest);
  if (!currentUser) {
    throw BizError.unauthorized('Authentication required');
  }
  if (currentUser.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Extract listing ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // suspend is last, id is second-to-last

  if (!id) {
    throw BizError.badRequest('Listing ID is required', {});
  }

  const listingId = parseInt(id);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
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

  const listingService = getListingService();

  // Fetch before data for activity logging
  const beforeData = await listingService.getById(listingId);
  if (!beforeData) {
    throw BizError.notFound('Listing', listingId);
  }

  // Update status
  const newStatus = action === 'suspend' ? ListingStatus.SUSPENDED : ListingStatus.ACTIVE;
  const updated = await listingService.updateStatus(listingId, newStatus);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  const actionType = action === 'suspend' ? 'listing_suspended' : 'listing_unsuspended';
  const actionDescription = action === 'suspend'
    ? `Suspended listing: ${beforeData.name}. Reason: ${reason}`
    : `Unsuspended listing: ${beforeData.name}`;

  await adminActivityService.logModeration({
    adminUserId: currentUser.id,
    targetEntityType: 'listing',
    targetEntityId: listingId,
    actionType,
    actionDescription,
    beforeData: {
      id: beforeData.id,
      name: beforeData.name,
      status: beforeData.status
    },
    afterData: {
      status: newStatus,
      reason: action === 'suspend' ? reason : undefined
    },
    severity: 'normal'
  });

  return createSuccessResponse(updated, 200);
}));
