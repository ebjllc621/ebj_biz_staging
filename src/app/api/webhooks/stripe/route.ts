/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 *
 * Handles checkout, subscription lifecycle, and payment events.
 * Verifies Stripe signature for security. NO auth/CSRF (external webhook).
 * Uses stripe_events table for idempotency to prevent duplicate processing.
 *
 * @authority CLAUDE.md - Security (webhook signature verification)
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 1
 * @phase Phase 5A - Native Ticketing + Phase 1 Billing
 * @tier ENTERPRISE (payment processing)
 */

import { NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@core/config/stripe';
import { getEventService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import type Stripe from 'stripe';

const eventService = getEventService();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * @authenticated NONE (Stripe calls this — verified via signature)
 * @csrf NONE (external webhook)
 */
export async function POST(request: Request) {
  // Read raw body for signature verification (MUST use text(), not json())
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    ErrorService.capture('STRIPE_WEBHOOK_SECRET not configured', {
      source: 'stripe-webhook',
    });
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown verification error';
    ErrorService.warn(`Stripe webhook signature verification failed: ${message}`, {
      source: 'stripe-webhook',
    });
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // --- IDEMPOTENCY CHECK ---
  // Prevent duplicate processing if Stripe retries the same event
  const db = getDatabaseService();

  const existingEvent = await db.query<{ id: number }>(
    'SELECT id FROM stripe_events WHERE stripe_event_id = ?',
    [event.id]
  );

  if (existingEvent.rows.length > 0) {
    // Already processed (or in progress) — return 200 to acknowledge
    return NextResponse.json({ received: true });
  }

  // Record event as being processed
  await db.query(
    'INSERT INTO stripe_events (stripe_event_id, event_type, processing_status) VALUES (?, ?, ?)',
    [event.id, event.type, 'processing']
  );

  // Handle supported event types
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || '';

        await eventService.confirmTicketPurchase(sessionId, paymentIntentId);

        // Dispatch notification (non-blocking)
        try {
          const metadata = session.metadata || {};
          const eventId = parseInt(metadata.event_id || '0');
          const userId = parseInt(metadata.user_id || '0');

          if (eventId && userId) {
            const { EventNotificationService } = await import('@core/services/notification/EventNotificationService');
            const { getNotificationService } = await import('@core/services/ServiceRegistry');
            const notificationService = getNotificationService();
            const eventNotificationService = new EventNotificationService(getDatabaseService(), notificationService);
            await eventNotificationService.notifyRsvpConfirmed(eventId, userId);
          }
        } catch (notifyErr) {
          ErrorService.warn('Stripe webhook: notification dispatch failed', {
            source: 'stripe-webhook',
            error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
          });
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await eventService.failTicketPurchase(session.id);
        break;
      }

      case 'charge.refunded': {
        // Handle refunds initiated from Stripe Dashboard (not via our API)
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id || '';

        if (paymentIntentId) {
          const purchase = await eventService.getTicketPurchaseByPaymentIntent(paymentIntentId);
          if (purchase && purchase.payment_status !== 'refunded') {
            await eventService.refundTicketPurchase(purchase.id);
          }
        }
        break;
      }

      // --- SUBSCRIPTION LIFECYCLE EVENTS ---

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubId = subscription.id;
        const stripeStatus = subscription.status;

        // Find listing_subscription by stripe_subscription_id
        const subResult = await db.query<{ id: number; listing_id: number }>(
          `SELECT id, listing_id FROM listing_subscriptions WHERE stripe_subscription_id = ?`,
          [stripeSubId]
        );

        if (subResult.rows.length > 0) {
          const sub = subResult.rows[0]!;
          const dbStatus = stripeStatus === 'active' ? 'active' : 'suspended';

          await db.query(
            `UPDATE listing_subscriptions SET status = ? WHERE id = ?`,
            [dbStatus, sub.id]
          );

          // Sync listing tier from plan
          const planResult = await db.query<{ plan_id: number }>(
            'SELECT plan_id FROM listing_subscriptions WHERE id = ?',
            [sub.id]
          );
          if (planResult.rows[0]) {
            const tierResult = await db.query<{ tier: string }>(
              'SELECT tier FROM subscription_plans WHERE id = ?',
              [planResult.rows[0].plan_id]
            );
            if (tierResult.rows[0]) {
              await db.query(
                'UPDATE listings SET tier = ? WHERE id = ?',
                [tierResult.rows[0].tier, sub.listing_id]
              );
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubId = subscription.id;
        const stripeStatus = subscription.status;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end ? 1 : 0;

        const dbStatus = stripeStatus === 'active' ? 'active'
          : stripeStatus === 'past_due' ? 'active'  // still accessible, just payment due
          : stripeStatus === 'canceled' ? 'cancelled'
          : 'suspended';

        await db.query(
          `UPDATE listing_subscriptions
           SET status = ?, cancel_at_period_end = ?
           WHERE stripe_subscription_id = ?`,
          [dbStatus, cancelAtPeriodEnd, stripeSubId]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription fully ended — downgrade to essentials
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubId = subscription.id;

        const subResult = await db.query<{ id: number; listing_id: number }>(
          'SELECT id, listing_id FROM listing_subscriptions WHERE stripe_subscription_id = ?',
          [stripeSubId]
        );

        if (subResult.rows.length > 0) {
          const sub = subResult.rows[0]!;

          await db.query(
            `UPDATE listing_subscriptions
             SET status = 'expired', cancel_at_period_end = 0
             WHERE id = ?`,
            [sub.id]
          );

          // Downgrade listing to essentials tier
          await db.query(
            `UPDATE listings SET tier = 'essentials' WHERE id = ?`,
            [sub.listing_id]
          );
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.type === 'subscription_details'
          ? invoice.parent.subscription_details
          : null;
        const rawSubId = subDetails?.subscription ?? null;
        const stripeSubId = typeof rawSubId === 'string'
          ? rawSubId
          : (rawSubId as Stripe.Subscription | null)?.id || null;

        if (stripeSubId) {
          // Reset failed payment count, update next billing date
          const periodEnd = (invoice as unknown as { lines?: { data?: Array<{ period?: { end?: number } }> } }).lines?.data?.[0]?.period?.end;
          const nextBillingDate = periodEnd
            ? new Date(periodEnd * 1000).toISOString().split('T')[0]
            : null;

          await db.query(
            `UPDATE listing_subscriptions
             SET failed_payment_count = 0,
                 status = 'active',
                 next_billing_date = ?
             WHERE stripe_subscription_id = ?`,
            [nextBillingDate, stripeSubId]
          );

          // Apply pending tier change if one exists
          const subResult = await db.query<{ id: number; pending_tier_change: string | null }>(
            'SELECT id, pending_tier_change FROM listing_subscriptions WHERE stripe_subscription_id = ?',
            [stripeSubId]
          );

          if (subResult.rows[0]?.pending_tier_change) {
            const sub = subResult.rows[0]!;
            // Get plan for pending tier
            const planResult = await db.query<{ id: number }>(
              `SELECT id FROM subscription_plans
               WHERE tier = ? AND status = 'active'
               ORDER BY effective_date DESC LIMIT 1`,
              [sub.pending_tier_change]
            );

            if (planResult.rows[0]) {
              const listingResult = await db.query<{ listing_id: number }>(
                'SELECT listing_id FROM listing_subscriptions WHERE id = ?',
                [sub.id]
              );

              await db.query(
                'UPDATE listing_subscriptions SET plan_id = ?, pending_tier_change = NULL WHERE id = ?',
                [planResult.rows[0].id, sub.id]
              );

              if (listingResult.rows[0]) {
                await db.query(
                  'UPDATE listings SET tier = ? WHERE id = ?',
                  [sub.pending_tier_change, listingResult.rows[0].listing_id]
                );
              }
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetailsFailed = invoice.parent?.type === 'subscription_details'
          ? invoice.parent.subscription_details
          : null;
        const rawSubIdFailed = subDetailsFailed?.subscription ?? null;
        const stripeSubId = typeof rawSubIdFailed === 'string'
          ? rawSubIdFailed
          : (rawSubIdFailed as Stripe.Subscription | null)?.id || null;

        if (stripeSubId) {
          // Increment failed payment count
          await db.query(
            `UPDATE listing_subscriptions
             SET failed_payment_count = failed_payment_count + 1
             WHERE stripe_subscription_id = ?`,
            [stripeSubId]
          );

          // Suspend if 3 or more failures
          const countResult = await db.query<{ failed_payment_count: number }>(
            'SELECT failed_payment_count FROM listing_subscriptions WHERE stripe_subscription_id = ?',
            [stripeSubId]
          );

          if ((countResult.rows[0]?.failed_payment_count ?? 0) >= 3) {
            await db.query(
              `UPDATE listing_subscriptions SET status = 'suspended' WHERE stripe_subscription_id = ?`,
              [stripeSubId]
            );

            ErrorService.warn('Stripe: subscription suspended after 3 payment failures', {
              source: 'stripe-webhook',
              stripeSubId,
            });
          }
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Trial ending in 3 days — placeholder for future notification
        ErrorService.warn('Stripe: subscription trial will end soon', {
          source: 'stripe-webhook',
          subscriptionId: (event.data.object as Stripe.Subscription).id,
        });
        break;
      }

      // --- PAYMENT INTENT EVENTS (required for ACH bank transfers) ---

      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        // Log successful payment — specific handling can be added as needed
        // ACH payments are asynchronous, so this fires when the bank transfer clears
        ErrorService.warn(`Stripe: payment_intent succeeded: ${intent.id}`, {
          source: 'stripe-webhook',
          amount: intent.amount,
          currency: intent.currency,
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const failMessage = intent.last_payment_error?.message || 'Unknown failure';
        ErrorService.warn(`Stripe: payment_intent failed: ${intent.id} - ${failMessage}`, {
          source: 'stripe-webhook',
          paymentIntentId: intent.id,
          error: failMessage,
        });
        break;
      }

      default:
        // Unhandled event type — log but don't error
        break;
    }

    // Mark event as completed
    await db.query(
      `UPDATE stripe_events SET processing_status = 'completed', processed_at = NOW() WHERE stripe_event_id = ?`,
      [event.id]
    );

  } catch (err) {
    // Mark event as failed
    const errMessage = err instanceof Error ? err.message : String(err);
    await db.query(
      `UPDATE stripe_events
       SET processing_status = 'failed', error_message = ?, processed_at = NOW()
       WHERE stripe_event_id = ?`,
      [errMessage, event.id]
    ).catch(() => { /* best effort */ });

    ErrorService.capture('Stripe webhook event processing failed', {
      source: 'stripe-webhook',
      eventType: event.type,
      error: errMessage,
    });
    // Return 500 so Stripe retries
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }

  // Stripe expects 200 response
  return NextResponse.json({ received: true });
}
