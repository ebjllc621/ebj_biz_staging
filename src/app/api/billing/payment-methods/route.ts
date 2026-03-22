/**
 * Billing Payment Methods API Route
 * GET  /api/billing/payment-methods - List user's payment methods
 * POST /api/billing/payment-methods - Add a payment method after SetupIntent completes
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 1
 * @tier ENTERPRISE (payment processing)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { PaymentMethodService } from '@core/services/PaymentMethodService';
import type { NextRequest } from 'next/server';

/**
 * GET /api/billing/payment-methods
 * List authenticated user's payment methods
 *
 * @authenticated Required
 * @csrf Not required (read-only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const db = getDatabaseService();
  const service = new PaymentMethodService(db);
  const methods = await service.getUserPaymentMethods(user.id);

  return createSuccessResponse({ items: methods }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});

/**
 * POST /api/billing/payment-methods
 * Add a new payment method after SetupIntent confirms
 * Body: { stripe_payment_method_id: string }
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

  if (!requestBody.stripe_payment_method_id || typeof requestBody.stripe_payment_method_id !== 'string') {
    throw BizError.validation(
      'stripe_payment_method_id',
      requestBody.stripe_payment_method_id,
      'stripe_payment_method_id is required and must be a string'
    );
  }

  const db = getDatabaseService();
  const service = new PaymentMethodService(db);
  const method = await service.addPaymentMethod(user.id, requestBody.stripe_payment_method_id);

  return createSuccessResponse({ payment_method: method }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
