/**
 * Billing Subscribe API Route
 * POST /api/billing/subscribe - Purchase a new subscription for a listing
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 2
 * @tier ENTERPRISE (payment processing)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BillingService } from '@core/services/BillingService';
import type { NextRequest } from 'next/server';
import type { BillingCycle } from '@core/types/subscription';

/**
 * POST /api/billing/subscribe
 * Purchase a new subscription for a listing
 * Body: { listing_id, plan_id, billing_cycle, payment_method_id? }
 *
 * @authenticated Required
 * @csrf Required (state-changing POST)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.listing_id || typeof requestBody.listing_id !== 'number') {
    throw BizError.validation('listing_id', requestBody.listing_id, 'listing_id is required and must be a number');
  }

  if (!requestBody.plan_id || typeof requestBody.plan_id !== 'number') {
    throw BizError.validation('plan_id', requestBody.plan_id, 'plan_id is required and must be a number');
  }

  if (!requestBody.billing_cycle || !['monthly', 'annual'].includes(requestBody.billing_cycle as string)) {
    throw BizError.validation('billing_cycle', requestBody.billing_cycle, 'billing_cycle must be "monthly" or "annual"');
  }

  const db = getDatabaseService();
  const service = new BillingService(db);

  const result = await service.purchaseSubscription(user.id, {
    listingId: requestBody.listing_id,
    planId: requestBody.plan_id,
    billingCycle: requestBody.billing_cycle as BillingCycle,
    paymentMethodId: typeof requestBody.payment_method_id === 'string'
      ? requestBody.payment_method_id
      : undefined
  });

  return createSuccessResponse({
    subscription: result.subscription,
    transaction: result.transaction,
    effective_date: result.effectiveDate,
    message: result.message
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
