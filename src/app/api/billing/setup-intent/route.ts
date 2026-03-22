/**
 * Billing Setup Intent API Route
 * POST /api/billing/setup-intent - Create Stripe SetupIntent for adding payment method
 *
 * Creates a SetupIntent that the client uses with Stripe Elements to collect
 * card details. Returns the client_secret needed for the Elements flow.
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
 * POST /api/billing/setup-intent
 * Create Stripe SetupIntent for adding a payment method
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

  const db = getDatabaseService();
  const service = new PaymentMethodService(db);
  const result = await service.createSetupIntent(user.id);

  return createSuccessResponse({ client_secret: result.clientSecret }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
