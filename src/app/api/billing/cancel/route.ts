/**
 * Billing Cancel API Route
 * POST /api/billing/cancel - Cancel a listing subscription at period end
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
 * POST /api/billing/cancel
 * Cancel a listing's subscription (access continues until period end)
 * Body: { listing_id }
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

  const db = getDatabaseService();
  const service = new BillingService(db);

  const result = await service.cancelSubscription(user.id, requestBody.listing_id);

  return createSuccessResponse({
    subscription: result.subscription,
    effective_date: result.effectiveDate,
    message: result.message
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
