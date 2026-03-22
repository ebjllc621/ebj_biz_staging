/**
 * Billing Refund Request API Route
 * POST /api/billing/refund-request - Submit a refund request
 * GET  /api/billing/refund-request - List user's refund requests
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 4
 * @tier ENTERPRISE (billing data)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { RefundService } from '@core/services/RefundService';
import type { NextRequest } from 'next/server';
import type { RefundEntityType, RefundReasonCategory } from '@core/types/subscription';

/**
 * POST /api/billing/refund-request
 * Submit a new refund request
 *
 * Body: {
 *   entity_type, entity_id, listing_id?, requested_amount,
 *   original_amount, reason_category, reason_details?,
 *   stripe_payment_intent_id?
 * }
 *
 * @authenticated Required
 * @csrf Required (state-changing POST)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(BizError.unauthorized('Authentication required'), context.requestId);
  }

  let body: Record<string, unknown>;
  try {
    body = await (context.request as NextRequest).json();
  } catch {
    throw BizError.badRequest('Invalid request body');
  }

  // Validate required fields
  if (!body.entity_type || typeof body.entity_type !== 'string') {
    throw BizError.validation('entity_type', body.entity_type, 'entity_type is required');
  }
  if (!body.entity_id || typeof body.entity_id !== 'number') {
    throw BizError.validation('entity_id', body.entity_id, 'entity_id must be a number');
  }
  if (!body.requested_amount || typeof body.requested_amount !== 'number') {
    throw BizError.validation('requested_amount', body.requested_amount, 'requested_amount must be a number');
  }
  if (!body.original_amount || typeof body.original_amount !== 'number') {
    throw BizError.validation('original_amount', body.original_amount, 'original_amount must be a number');
  }
  if (!body.reason_category || typeof body.reason_category !== 'string') {
    throw BizError.validation('reason_category', body.reason_category, 'reason_category is required');
  }

  const db = getDatabaseService();
  const refundService = new RefundService(db);

  const refundRequest = await refundService.createRefundRequest(user.id, {
    entityType: body.entity_type as RefundEntityType,
    entityId: body.entity_id as number,
    listingId: body.listing_id ? (body.listing_id as number) : undefined,
    originalAmount: body.original_amount as number,
    requestedAmount: body.requested_amount as number,
    reasonCategory: body.reason_category as RefundReasonCategory,
    reasonDetails: body.reason_details ? (body.reason_details as string) : undefined,
    stripePaymentIntentId: body.stripe_payment_intent_id ? (body.stripe_payment_intent_id as string) : undefined
  });

  return createSuccessResponse({ refund_request: refundRequest }, context.requestId);
}, {
  allowedMethods: ['POST']
}));

/**
 * GET /api/billing/refund-request
 * List all refund requests for the authenticated user
 *
 * @authenticated Required
 * @csrf Not required (read-only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(BizError.unauthorized('Authentication required'), context.requestId);
  }

  const db = getDatabaseService();
  const refundService = new RefundService(db);

  const items = await refundService.getRefundsForUser(user.id);

  return createSuccessResponse({ items }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
