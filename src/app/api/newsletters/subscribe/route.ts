/**
 * Newsletter Subscribe API
 *
 * POST /api/newsletters/subscribe
 * Body: { listing_id: number, email: string, name?: string }
 *
 * DELETE /api/newsletters/subscribe
 * Body: { listing_id: number, email: string }
 *
 * - Public route (no auth required for anonymous subscribe)
 * - Authenticated users: auto-confirm (skip double opt-in)
 * - Anonymous users: create pending + send confirmation email
 *
 * @component API Route
 * @tier STANDARD
 * @phase Tier 2 - Phase N5
 * @governance Build Map v2.1 ENHANCED
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * POST /api/newsletters/subscribe
 * Subscribe an email to a listing's newsletter.
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const body = await request.json();
  const { listing_id, email, name } = body;

  // Validate required fields
  if (!listing_id || !email) {
    return createErrorResponse(
      BizError.badRequest('listing_id and email are required'),
      context.requestId
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return createErrorResponse(
      BizError.badRequest('Invalid email address'),
      context.requestId
    );
  }

  // Check if user is authenticated (for auto-confirm)
  const user = await getUserFromRequest(request);
  const userId = user?.id || null;

  const db = getDatabaseService();
  const newsletterService = new NewsletterService(db);

  // Verify listing exists
  const listingResult = await db.query<{ id: number; name: string }>(
    'SELECT id, name FROM listings WHERE id = ? LIMIT 1',
    [listing_id]
  );
  if (listingResult.rows.length === 0) {
    return createErrorResponse(
      BizError.notFound('Listing', listing_id),
      context.requestId
    );
  }
  const listingName = listingResult.rows[0]?.name || 'this business';

  const { subscriber, isNew, requiresConfirmation } = await newsletterService.subscribe(
    listing_id,
    email.toLowerCase().trim(),
    name || null,
    userId
  );

  // Send confirmation email if needed (anonymous subscribers)
  if (requiresConfirmation && subscriber.confirmation_token) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bizconekt.com';
      const confirmUrl = `${baseUrl}/newsletters/confirm?token=${subscriber.confirmation_token}`;

      const { AuthServiceRegistry } = await import('@core/registry/AuthServiceRegistry');
      const emailService = AuthServiceRegistry.emailService;

      await emailService.send({
        to: email,
        subject: `Confirm your subscription to ${listingName} newsletter`,
        text: `Please confirm your newsletter subscription by visiting: ${confirmUrl}\n\nIf you did not request this, you can safely ignore this email.`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; padding: 20px;">
            <h2 style="color: #1a365d;">Confirm Your Subscription</h2>
            <p>You've requested to subscribe to the <strong>${listingName}</strong> newsletter on Bizconekt.</p>
            <p>Please confirm your subscription by clicking the button below:</p>
            <a href="${confirmUrl}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0;">
              Confirm Subscription
            </a>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              If you did not request this subscription, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">Bizconekt — Connecting Local Businesses</p>
          </div>
        `,
      }).catch(() => {
        // Fire-and-forget — log but don't fail the subscription
      });
    } catch {
      // Email send failure should not block subscription creation
    }
  }

  return createSuccessResponse({
    subscribed: !requiresConfirmation,
    requiresConfirmation,
    isNew,
    message: requiresConfirmation
      ? 'Please check your email to confirm your subscription.'
      : 'You are now subscribed to this newsletter!',
  }, context.requestId);
}, {
  allowedMethods: ['POST'],
  requireAuth: false,
});

/**
 * DELETE /api/newsletters/subscribe
 * Unsubscribe an authenticated user by listing_id + email.
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const body = await request.json();
  const { listing_id, email } = body;

  if (!listing_id || !email) {
    return createErrorResponse(
      BizError.badRequest('listing_id and email are required'),
      context.requestId
    );
  }

  const db = getDatabaseService();
  const newsletterService = new NewsletterService(db);

  const success = await newsletterService.unsubscribe(listing_id, email.toLowerCase().trim());

  return createSuccessResponse({
    unsubscribed: success,
    message: success ? 'You have been unsubscribed.' : 'No active subscription found.',
  }, context.requestId);
}, {
  allowedMethods: ['DELETE'],
  requireAuth: false,
});
