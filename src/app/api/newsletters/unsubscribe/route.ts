/**
 * Newsletter Unsubscribe API
 *
 * GET /api/newsletters/unsubscribe?token=xxx — Verify token validity
 * POST /api/newsletters/unsubscribe — Execute unsubscribe { token }
 *
 * - Public route (token-based security)
 * - Follows notification unsubscribe pattern exactly
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

/**
 * GET — verify token is valid (pre-flight for UI confirmation)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return createErrorResponse(
      BizError.badRequest('Unsubscribe token is required'),
      context.requestId
    );
  }

  const db = getDatabaseService();
  const result = await db.query<{ email: string; listing_id: number; status: string; listing_name: string }>(
    `SELECT ns.email, ns.listing_id, ns.status, l.name as listing_name
     FROM newsletter_subscribers ns
     LEFT JOIN listings l ON l.id = ns.listing_id
     WHERE ns.confirmation_token = ? AND ns.status IN ('active', 'pending') LIMIT 1`,
    [token]
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_TOKEN',
        message: 'Unsubscribe token is invalid or has already been used',
        userMessage: 'This unsubscribe link is invalid or has already been used.',
      }),
      context.requestId
    );
  }

  const row = result.rows[0];

  return createSuccessResponse({
    valid: true,
    email: row.email,
    listingName: row.listing_name || 'this business',
    message: 'Token is valid. Confirm to unsubscribe.',
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: false,
});

/**
 * POST — execute unsubscribe
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const body = await request.json();
  const { token } = body;

  if (!token) {
    return createErrorResponse(
      BizError.badRequest('Unsubscribe token is required'),
      context.requestId
    );
  }

  const db = getDatabaseService();
  const newsletterService = new NewsletterService(db);

  const result = await newsletterService.unsubscribeByToken(token);

  if (!result.success) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_TOKEN',
        message: 'Unsubscribe token is invalid or has already been used',
        userMessage: 'This unsubscribe link is invalid or has already been used.',
      }),
      context.requestId
    );
  }

  return createSuccessResponse({
    unsubscribed: true,
    message: 'You have been unsubscribed from this newsletter.',
  }, context.requestId);
}, {
  allowedMethods: ['POST'],
  requireAuth: false,
});
