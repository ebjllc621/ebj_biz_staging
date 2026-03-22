/**
 * Newsletter Subscription Confirmation API
 *
 * GET /api/newsletters/confirm?token=xxx
 *
 * - Public route (token-based security)
 * - Confirms pending subscription → active
 *
 * @component API Route
 * @tier SIMPLE
 * @phase Tier 2 - Phase N5
 * @governance Build Map v2.1 ENHANCED
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return createErrorResponse(
      BizError.badRequest('Confirmation token is required'),
      context.requestId
    );
  }

  const db = getDatabaseService();
  const newsletterService = new NewsletterService(db);

  const subscriber = await newsletterService.confirmSubscription(token);

  if (!subscriber) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_TOKEN',
        message: 'Confirmation token is invalid or has already been used',
        userMessage: 'This confirmation link is invalid or has already been used.',
      }),
      context.requestId
    );
  }

  return createSuccessResponse({
    confirmed: true,
    email: subscriber.email,
    message: 'Your subscription has been confirmed! You will now receive newsletters.',
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: false,
});
