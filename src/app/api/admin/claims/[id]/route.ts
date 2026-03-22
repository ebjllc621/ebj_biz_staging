/**
 * Admin Claim Detail API Route
 * GET /api/admin/claims/[id] - Get claim with verifications
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse/createErrorResponse
 * - DatabaseService boundary compliance
 *
 * @authority CLAUDE.md - API Standards
 * @authority Phase 4 Brain Plan - Admin Claims Review Dashboard
 * @phase Claim Listing Phase 4
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { getClaimListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/admin/claims/[id]
 * Get claim detail with verifications
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin claim detail', 'admin');
  }

  // Extract claim ID from URL segments
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const idSegment = pathParts[pathParts.length - 1]; // Last segment is ID

  if (!idSegment) {
    throw BizError.badRequest('Claim ID is required');
  }

  const claimId = parseInt(idSegment);

  if (isNaN(claimId)) {
    throw BizError.badRequest('Invalid claim ID');
  }

  // Initialize services
  const db = getDatabaseService();
  const claimService = getClaimListingService();

  // Get claim with verifications
  const result = await claimService.getClaimWithVerifications(claimId);

  if (!result) {
    throw BizError.notFound('Claim not found', claimId);
  }

  // Enrich claim with listing_name, claimant_name, claimant_email
  let listingName = 'Unknown';
  let claimantName = 'Unknown';
  let claimantEmail = 'Unknown';

  // Fetch listing name
  const listingResult = await db.query<{ name: string }>(
    'SELECT name FROM listings WHERE id = ?',
    [result.claim.listingId]
  );
  if (listingResult.rows && listingResult.rows.length > 0) {
    listingName = listingResult.rows[0]?.name || 'Unknown';
  }

  // Fetch claimant info
  const userResult = await db.query<{
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string;
  }>(
    'SELECT display_name, first_name, last_name, email FROM users WHERE id = ?',
    [result.claim.claimantUserId]
  );
  if (userResult.rows && userResult.rows.length > 0) {
    const userData = userResult.rows[0];
    claimantName = userData?.display_name
      || [userData?.first_name, userData?.last_name].filter(Boolean).join(' ')
      || 'Unknown';
    claimantEmail = userData?.email || 'Unknown';
  }

  const enrichedClaim = {
    id: result.claim.id,
    listing_id: result.claim.listingId,
    listing_name: listingName,
    claimant_user_id: result.claim.claimantUserId,
    claimant_name: claimantName,
    claimant_email: claimantEmail,
    claim_type: result.claim.claimType,
    status: result.claim.status,
    verification_score: result.claim.verificationScore,
    claimant_description: result.claim.claimantDescription,
    admin_notes: result.claim.adminNotes,
    rejection_reason: result.claim.rejectionReason,
    created_at: result.claim.createdAt.toISOString(),
    updated_at: result.claim.updatedAt.toISOString(),
  };

  const verifications = result.verifications.map(v => ({
    id: v.id,
    method: v.method,
    status: v.status,
    score: v.score,
    created_at: v.createdAt.toISOString(),
    completed_at: v.completedAt ? v.completedAt.toISOString() : null,
  }));

  return createSuccessResponse({
    claim: enrichedClaim,
    verifications,
  }, 200);
});
