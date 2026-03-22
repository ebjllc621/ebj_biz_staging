/**
 * Verification Code Confirm API Route
 * POST /api/listings/claim/verify/confirm - Confirm verification code
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Claim Listing Phase 3
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getClaimListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import {
  ClaimNotFoundError,
  MaxAttemptsExceededError,
  VerificationExpiredError,
  InvalidClaimTransitionError,
} from '@core/services/ClaimListingService';

/**
 * POST /api/listings/claim/verify/confirm
 * Verify the 6-digit code and submit claim for review
 *
 * Body: { listing_id: number, verification_code: string }
 * Response: { success: true, data: { verified: boolean, score: number, submitted: boolean, message?: string } }
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
  const { listing_id, verification_code } = body;

  if (!listing_id || typeof listing_id !== 'number') {
    throw BizError.badRequest('listing_id is required and must be a number');
  }

  if (!verification_code || typeof verification_code !== 'string') {
    throw BizError.badRequest('verification_code is required');
  }

  // Validate code format (6 digits)
  if (!/^\d{6}$/.test(verification_code)) {
    throw BizError.badRequest('verification_code must be exactly 6 digits');
  }

  const claimService = getClaimListingService();

  try {
    // 3. Find the user's active claim
    const claim = await claimService.getClaimStatus(listing_id, userIdNum);
    if (!claim) {
      throw BizError.notFound('No active claim found for this listing');
    }

    // 4. Verify the code
    const verifyResult = await claimService.verifyCode(claim.id, verification_code);

    if (!verifyResult.verified) {
      return createSuccessResponse({
        verified: false,
        score: 0,
        submitted: false,
        message: 'Invalid verification code. Please try again.',
      }, context.requestId);
    }

    // 5. Code is correct - submit claim for admin review
    let submitted = false;
    try {
      await claimService.submitForReview(claim.id);
      submitted = true;
    } catch (submitError) {
      // If submit fails (e.g., already under review), still report verification success
      if (submitError instanceof InvalidClaimTransitionError) {
        submitted = false; // Already submitted or in wrong state
      } else {
        throw submitError;
      }
    }

    return createSuccessResponse({
      verified: true,
      score: verifyResult.score,
      submitted,
    }, context.requestId);

  } catch (error) {
    if (error instanceof ClaimNotFoundError) {
      throw BizError.notFound('Claim not found');
    }
    if (error instanceof MaxAttemptsExceededError) {
      throw new BizError({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Maximum verification attempts exceeded. Please request a new code.',
        userMessage: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }
    if (error instanceof VerificationExpiredError) {
      throw BizError.badRequest('Verification code has expired. Please request a new one.');
    }
    throw error;
  }

}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
