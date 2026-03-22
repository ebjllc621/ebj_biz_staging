/**
 * Admin Claims API Routes
 * GET /api/admin/claims - List all claims with admin filters
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
 * GET /api/admin/claims
 * Get all claims with optional filters and pagination for admin management
 *
 * @query {string} status - Filter by claim status
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 *
 * @returns {Object} Response with claims and pagination
 * @returns {Array} claims - Enriched claim records
 * @returns {Object} pagination - { page, limit, total, totalPages }
 *
 * @admin Admin authentication required
 * @ratelimit None (read operation)
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin claims', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const status = searchParams.get('status') as 'initiated' | 'verification_pending' | 'under_review' | 'approved' | 'rejected' | 'expired' | null;

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // Build filters object for ClaimListingService
  const filters: {
    status?: 'initiated' | 'verification_pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  } = {};
  if (status) filters.status = status;

  // Initialize service
  const db = getDatabaseService();
  const claimService = getClaimListingService();

  // Get claims with filters
  const result = await claimService.getClaimsForAdmin(filters, page, limit);

  // Enrich claims with listing_name, claimant_name, claimant_email
  const claimsWithEnrichment = await Promise.all(
    result.claims.map(async (claim) => {
      let listingName = 'Unknown';
      let claimantName = 'Unknown';
      let claimantEmail = 'Unknown';

      // Fetch listing name
      const listingResult = await db.query<{ name: string }>(
        'SELECT name FROM listings WHERE id = ?',
        [claim.listingId]
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
        [claim.claimantUserId]
      );
      if (userResult.rows && userResult.rows.length > 0) {
        const userData = userResult.rows[0];
        claimantName = userData?.display_name
          || [userData?.first_name, userData?.last_name].filter(Boolean).join(' ')
          || 'Unknown';
        claimantEmail = userData?.email || 'Unknown';
      }

      return {
        id: claim.id,
        listing_id: claim.listingId,
        listing_name: listingName,
        claimant_user_id: claim.claimantUserId,
        claimant_name: claimantName,
        claimant_email: claimantEmail,
        claim_type: claim.claimType,
        status: claim.status,
        verification_score: claim.verificationScore,
        claimant_description: claim.claimantDescription,
        admin_notes: claim.adminNotes,
        rejection_reason: claim.rejectionReason,
        created_at: claim.createdAt.toISOString(),
        updated_at: claim.updatedAt.toISOString(),
      };
    })
  );

  return createSuccessResponse({
    claims: claimsWithEnrichment,
    pagination: {
      page,
      limit,
      total: result.pagination.total,
      totalPages: result.pagination.totalPages,
    }
  }, 200);
});
