/**
 * Admin Claim Review API Route
 * PATCH /api/admin/claims/[id]/review - Approve or reject claim
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - CSRF protection: MANDATORY (withCsrf)
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse/createErrorResponse
 * - DatabaseService boundary compliance
 *
 * @authority CLAUDE.md - API Standards
 * @authority Phase 4 Brain Plan - Admin Claims Review Dashboard
 * @phase Claim Listing Phase 4
 */

import { getClaimListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { NextRequest } from 'next/server';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import {
  ClaimNotFoundError,
  InvalidClaimTransitionError,
} from '@core/services/ClaimListingService';

/**
 * PATCH /api/admin/claims/[id]/review
 * Approve or reject a claim
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

  // Extract claim ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // review is last, id is second-to-last

  if (!id) {
    throw BizError.badRequest('Claim ID is required');
  }

  const claimId = parseInt(id);

  if (isNaN(claimId)) {
    throw BizError.badRequest('Invalid claim ID', { id });
  }

  const body = await context.request.json();
  const { decision, admin_notes, rejection_reason } = body;

  if (!decision || !['approved', 'rejected'].includes(decision)) {
    throw BizError.badRequest(
      'Invalid decision. Must be "approved" or "rejected"',
      { decision }
    );
  }

  if (decision === 'rejected' && !rejection_reason) {
    throw BizError.badRequest('Rejection reason is required for rejected claims', {
      rejection_reason
    });
  }

  const service = getClaimListingService();

  // Execute admin review
  try {
    const result = await service.adminReviewClaim({
      claimId,
      adminUserId: currentUser.id,
      decision,
      adminNotes: admin_notes,
      rejectionReason: rejection_reason,
    });

    // Admin activity logging
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: currentUser.id,
      targetEntityType: 'claim',
      targetEntityId: claimId,
      actionType: 'claim_reviewed',
      actionCategory: 'moderation',
      actionDescription: `Claim #${claimId} ${decision} by admin`,
      afterData: { decision, admin_notes, rejection_reason },
      severity: 'normal'
    });

    return createSuccessResponse({
      claim: {
        id: result.claim.id,
        status: result.claim.status,
        admin_reviewer_id: result.claim.adminReviewerId,
        admin_notes: result.claim.adminNotes,
        rejection_reason: result.claim.rejectionReason,
        admin_decision_at: result.claim.adminDecisionAt?.toISOString(),
      },
      listingUpdated: result.listingUpdated,
      userRoleUpdated: result.userRoleUpdated,
    }, 200);
  } catch (error) {
    if (error instanceof ClaimNotFoundError) {
      throw BizError.notFound('Claim not found', claimId);
    }
    if (error instanceof InvalidClaimTransitionError) {
      throw BizError.badRequest(
        'This claim cannot be reviewed in its current status',
        { claimId, error: (error as Error).message }
      );
    }
    throw error;
  }
}));
