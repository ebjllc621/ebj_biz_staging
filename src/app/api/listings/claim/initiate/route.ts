/**
 * Claim Initiation API Route
 * POST /api/listings/claim/initiate - Initiate a new listing claim
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY (state-changing operation)
 * - requireAuth: true (authenticated users only)
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Claim Listing Phase 3 Brain Plan
 * @phase Claim Listing Phase 3
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getClaimListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { ClaimType } from '@core/services/ClaimListingService';
import {
  ListingAlreadyClaimedError,
  ClaimAlreadyExistsError,
} from '@core/services/ClaimListingService';

// Valid claim types
const VALID_CLAIM_TYPES: ClaimType[] = ['owner', 'manager', 'authorized_representative'];

/**
 * POST /api/listings/claim/initiate
 * Initiate a new claim for a listing
 *
 * Body: { listing_id: number, claim_type: ClaimType, claimant_description?: string }
 * Response: { success: true, data: { claim: ListingClaim } }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // 1. Extract authenticated user ID
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // 2. Parse and validate request body
  const body = await context.request.json();
  const { listing_id, claim_type, claimant_description } = body;

  if (!listing_id || typeof listing_id !== 'number') {
    throw BizError.badRequest('listing_id is required and must be a number');
  }

  if (!claim_type || !VALID_CLAIM_TYPES.includes(claim_type)) {
    throw BizError.badRequest('claim_type must be one of: owner, manager, authorized_representative');
  }

  if (claimant_description && typeof claimant_description !== 'string') {
    throw BizError.badRequest('claimant_description must be a string');
  }

  // 3. Call service
  const claimService = getClaimListingService();

  try {
    const claim = await claimService.initiateClaim({
      listingId: listing_id,
      claimantUserId: userIdNum,
      claimType: claim_type,
      claimantDescription: claimant_description || undefined,
    });

    return createSuccessResponse({ claim }, context.requestId);

  } catch (error) {
    // Map claim-specific errors to appropriate HTTP status codes
    if (error instanceof ListingAlreadyClaimedError) {
      throw new BizError({
        code: 'CONFLICT',
        message: 'This business has already been claimed',
        userMessage: 'This business has already been claimed'
      });
    }
    if (error instanceof ClaimAlreadyExistsError) {
      throw new BizError({
        code: 'CONFLICT',
        message: 'You already have a pending claim for this business',
        userMessage: 'You already have a pending claim for this business'
      });
    }
    throw error; // Re-throw other errors for apiHandler to handle
  }

}, {
  requireAuth: true,
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 5,
    windowMs: 3600000 // 5 claims per hour per user
  }
}));
