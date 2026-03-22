/**
 * Referrals API Route
 * GET /api/contacts/referrals - Get current user's referrals
 * POST /api/contacts/referrals - Create a new referral
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 3
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 * @reference src/app/api/contacts/route.ts - API pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ReferralService, DuplicateReferralError } from '@features/contacts/services/ReferralService';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { ReferralStatus, RewardStatus } from '@features/contacts/types/referral';

/**
 * GET /api/contacts/referrals
 * Get all referrals for the authenticated user
 *
 * Query Parameters:
 * - status (optional): Filter by referral status
 * - reward_status (optional): Filter by reward status
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ReferralService(db);

  const userId = parseInt(context.userId!, 10);

  // Parse query parameters
  const url = new URL(context.request.url);
  const status = url.searchParams.get('status') as ReferralStatus | null;
  const rewardStatus = url.searchParams.get('reward_status') as RewardStatus | null;

  const filters = {
    status: status || undefined,
    reward_status: rewardStatus || undefined
  };

  // Get referrals with filters
  const referrals = await service.getByUserId(userId, filters);

  // Get stats
  const stats = await service.getStats(userId);

  return createSuccessResponse({
    referrals,
    stats,
    total: referrals.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/contacts/referrals
 * Create a new referral
 *
 * Body:
 * - referred_email (required): Email of person being referred
 * - referred_phone (optional): Phone of person being referred
 * - referred_name (optional): Name of person being referred
 * - referral_message (optional): Custom message
 * - contact_id (optional): Contact ID if referring existing contact
 *
 * @authenticated Required
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ReferralService(db);
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();

  // Validate required fields
  if (!body.referred_email?.trim()) {
    return createErrorResponse(
      new BizError({
        code: 'MISSING_EMAIL',
        message: 'Referred email is required'
      }),
      context.requestId
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.referred_email)) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_EMAIL',
        message: 'Please provide a valid email address'
      }),
      context.requestId
    );
  }

  try {
    const referral = await service.createReferral(userId, {
      referred_email: body.referred_email,
      referred_phone: body.referred_phone,
      referred_name: body.referred_name,
      referral_message: body.referral_message,
      contact_id: body.contact_id
    });

    return createSuccessResponse({ referral }, context.requestId);
  } catch (error) {
    if (error instanceof DuplicateReferralError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  requireAuth: true
});
