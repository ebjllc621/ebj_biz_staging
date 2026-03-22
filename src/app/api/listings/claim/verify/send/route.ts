/**
 * Verification Code Send API Route
 * POST /api/listings/claim/verify/send - Send verification code for a claim
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Claim Listing Phase 3
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getClaimListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { VerificationMethod } from '@core/services/ClaimListingService';
import {
  ClaimNotFoundError,
  InvalidClaimTransitionError,
} from '@core/services/ClaimListingService';

const VALID_METHODS: VerificationMethod[] = ['email', 'phone', 'domain', 'document', 'manual'];

/**
 * POST /api/listings/claim/verify/send
 * Create verification and send code (or submit for manual review)
 *
 * Body: { listing_id: number, verification_method: VerificationMethod }
 * Response: { success: true, data: { codeSent: boolean, method: string, submitted?: boolean } }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // 1. Extract authenticated user
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // 2. Parse and validate body
  const body = await context.request.json();
  const { listing_id, verification_method } = body;

  if (!listing_id || typeof listing_id !== 'number') {
    throw BizError.badRequest('listing_id is required and must be a number');
  }

  if (!verification_method || !VALID_METHODS.includes(verification_method)) {
    throw BizError.badRequest('verification_method must be one of: email, phone, domain, document, manual');
  }

  const claimService = getClaimListingService();

  try {
    // 3. Find the user's active claim for this listing
    const claim = await claimService.getClaimStatus(listing_id, userIdNum);
    if (!claim) {
      throw BizError.notFound('No active claim found for this listing');
    }

    if (verification_method === 'manual') {
      // Manual verification: submit directly for admin review
      // Create verification record for tracking
      await claimService.createVerification(claim.id, 'manual');
      await claimService.submitForReview(claim.id);

      return createSuccessResponse({
        codeSent: false,
        method: 'manual',
        submitted: true,
      }, context.requestId);
    }

    // 4. Create verification record
    const verification = await claimService.createVerification(claim.id, verification_method);

    // 5. Generate and store code
    const result = await claimService.sendVerificationCode(verification.id);

    // NOTE: Actual email/SMS delivery is deferred to Phase 5
    // For now, the code is stored in DB but not sent externally

    return createSuccessResponse({
      codeSent: result.codeSent,
      method: result.method,
      submitted: false,
    }, context.requestId);

  } catch (error) {
    if (error instanceof ClaimNotFoundError) {
      throw BizError.notFound('Claim not found');
    }
    if (error instanceof InvalidClaimTransitionError) {
      throw BizError.badRequest('Cannot send verification for a claim in this status');
    }
    throw error;
  }

}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
