/**
 * Individual Referral API Route
 * GET /api/contacts/referrals/[referralId] - Get referral details
 * PUT /api/contacts/referrals/[referralId] - Update referral
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 3
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/[contactId]/route.ts - Route pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ReferralService, ReferralNotFoundError } from '@features/contacts/services/ReferralService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/referrals/[referralId]
 * Get referral details by ID
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ReferralService(db);

  // Extract referralId from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const referralIdStr = pathParts[pathParts.length - 1];

  if (!referralIdStr) {
    return createErrorResponse(
      new BizError({
        code: 'MISSING_ID',
        message: 'Missing referral ID'
      }),
      context.requestId
    );
  }

  const referralId = parseInt(referralIdStr, 10);

  if (isNaN(referralId)) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_ID',
        message: 'Invalid referral ID'
      }),
      context.requestId
    );
  }

  try {
    const referral = await service.getById(referralId);

    // Verify ownership
    const userId = parseInt(context.userId!, 10);
    if (referral.referrer_user_id !== userId) {
      return createErrorResponse(
        new BizError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this referral'
        }),
        context.requestId
      );
    }

    return createSuccessResponse({ referral }, context.requestId);
  } catch (error) {
    if (error instanceof ReferralNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  requireAuth: true
});

/**
 * PUT /api/contacts/referrals/[referralId]
 * Update referral (status, message)
 *
 * @authenticated Required
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ReferralService(db);
  const userId = parseInt(context.userId!, 10);

  // Extract referralId from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const referralIdStr = pathParts[pathParts.length - 1];

  if (!referralIdStr) {
    return createErrorResponse(
      new BizError({
        code: 'MISSING_ID',
        message: 'Missing referral ID'
      }),
      context.requestId
    );
  }

  const referralId = parseInt(referralIdStr, 10);

  if (isNaN(referralId)) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_ID',
        message: 'Invalid referral ID'
      }),
      context.requestId
    );
  }

  try {
    // Verify ownership
    const existing = await service.getById(referralId);
    if (existing.referrer_user_id !== userId) {
      return createErrorResponse(
        new BizError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this referral'
        }),
        context.requestId
      );
    }

    const body = await context.request.json();

    // Handle status update
    if (body.status) {
      const referral = await service.updateStatus(referralId, body.status);
      return createSuccessResponse({ referral }, context.requestId);
    }

    // For now, just return existing if no status change
    return createSuccessResponse({ referral: existing }, context.requestId);
  } catch (error) {
    if (error instanceof ReferralNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  requireAuth: true
});
