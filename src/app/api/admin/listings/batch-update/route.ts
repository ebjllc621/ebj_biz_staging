/**
 * Admin Listings Batch Update API Route
 * POST /api/admin/listings/batch-update - Update multiple listings
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
 * POST /api/admin/listings/batch-update
 * Batch update listing status
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

  const body = await context.request.json();
  const { listingIds, updates } = body;

  if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
    throw BizError.badRequest('listingIds array is required', { listingIds });
  }

  if (!updates || typeof updates !== 'object') {
    throw BizError.badRequest('updates object is required', { updates });
  }

  // Phase 9: Validate forbidden fields (defense-in-depth)
  const forbiddenFields = ['section_layout', 'password', 'user_id'];
  const requestedFields = Object.keys(updates || {});
  const violations = requestedFields.filter(f => forbiddenFields.includes(f));

  if (violations.length > 0) {
    throw BizError.badRequest(`Fields not allowed in batch update: ${violations.join(', ')}`);
  }

  const listingService = getListingService();
  const adminActivityService = getAdminActivityService();

  let successCount = 0;
  let failureCount = 0;
  const results: Array<{ id: number; success: boolean; error?: string }> = [];

  for (const listingId of listingIds) {
    try {
      const id = parseInt(listingId);
      if (isNaN(id)) {
        results.push({ id: listingId, success: false, error: 'Invalid ID' });
        failureCount++;
        continue;
      }

      // Get before data for logging
      const beforeData = await listingService.getById(id);
      if (!beforeData) {
        results.push({ id, success: false, error: 'Listing not found' });
        failureCount++;
        continue;
      }

      // Handle status update
      if (updates.status) {
        await listingService.updateStatus(id, updates.status as ListingStatus);

        // Log activity
        await adminActivityService.logModeration({
          adminUserId: currentUser.id,
          targetEntityType: 'listing',
          targetEntityId: id,
          actionType: updates.status === 'suspended' ? 'listing_suspended' : 'listing_status_updated',
          actionDescription: `Batch update: Changed listing "${beforeData.name}" status to ${updates.status}`,
          beforeData: { id: beforeData.id, name: beforeData.name, status: beforeData.status },
          afterData: { status: updates.status },
          severity: 'normal'
        });
      }

      // Handle approved update
      if (updates.approved) {
        if (updates.approved === 'approved') {
          await listingService.approveListing(id, currentUser.id);
        } else if (updates.approved === 'rejected') {
          await listingService.rejectListing(id, currentUser.id, 'Batch rejection');
        }
        // Note: 'pending' status change would need a separate method if required

        // Log activity
        await adminActivityService.logModeration({
          adminUserId: currentUser.id,
          targetEntityType: 'listing',
          targetEntityId: id,
          actionType: updates.approved === 'approved' ? 'listing_approved' : 'listing_rejected',
          actionDescription: `Batch update: Changed listing "${beforeData.name}" approval to ${updates.approved}`,
          beforeData: { id: beforeData.id, name: beforeData.name, approved: beforeData.approved },
          afterData: { approved: updates.approved },
          severity: 'normal'
        });
      }

      results.push({ id, success: true });
      successCount++;
    } catch (error) {
      results.push({
        id: listingId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      failureCount++;
    }
  }

  return createSuccessResponse({
    successCount,
    failureCount,
    results
  }, 200);
}));
