/**
 * Billing Downgrade API Route
 * POST /api/billing/downgrade - Schedule a listing subscription downgrade at period end
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

/**
 * POST /api/billing/downgrade
 * Schedule a downgrade to a lower tier (takes effect at period end)
 * Body: { listing_id, new_plan_id }
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

  if (!requestBody.new_plan_id || typeof requestBody.new_plan_id !== 'number') {
    throw BizError.validation('new_plan_id', requestBody.new_plan_id, 'new_plan_id is required and must be a number');
  }

  const db = getDatabaseService();
  const service = new BillingService(db);

  const result = await service.downgradeSubscription(
    user.id,
    requestBody.listing_id,
    requestBody.new_plan_id
  );

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
