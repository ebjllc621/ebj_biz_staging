/**
 * Billing Payment Method [id] API Route
 * DELETE /api/billing/payment-methods/[id] - Remove a payment method
 * PATCH  /api/billing/payment-methods/[id] - Set a payment method as default
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
 * Extract the [id] segment from the URL path.
 * URL pattern: /api/billing/payment-methods/[id]
 */
function extractId(url: string): number {
  const urlObj = new URL(url);
  const segments = urlObj.pathname.split('/');
  const pmIndex = segments.indexOf('payment-methods');
  const rawId = segments[pmIndex + 1];
  if (!rawId) {
    throw BizError.badRequest('Payment method ID is required');
  }
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    throw BizError.badRequest('Invalid payment method ID', { id: rawId });
  }
  return id;
}

/**
 * DELETE /api/billing/payment-methods/[id]
 * Remove a payment method (detaches from Stripe, deletes local record)
 *
 * @authenticated Required
 * @csrf Required (state-changing DELETE)
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const id = extractId(context.request.url);

  const db = getDatabaseService();
  const service = new PaymentMethodService(db);
  await service.removePaymentMethod(id, user.id);

  return createSuccessResponse({ deleted: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE']
}));

/**
 * PATCH /api/billing/payment-methods/[id]
 * Set a payment method as the user's default
 *
 * @authenticated Required
 * @csrf Required (state-changing PATCH)
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const id = extractId(context.request.url);

  const db = getDatabaseService();
  const service = new PaymentMethodService(db);
  await service.setDefaultPaymentMethod(id, user.id);

  return createSuccessResponse({ updated: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH']
}));
