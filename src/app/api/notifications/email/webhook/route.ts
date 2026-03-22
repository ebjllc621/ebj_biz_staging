/**
 * Email Provider Webhook Handler
 *
 * Receives bounce/complaint/delivery status updates from email providers.
 * Updates notification_email_logs.status from 'sent' to 'bounced' when
 * provider reports a bounce or complaint.
 *
 * POST /api/notifications/email/webhook?provider=sendgrid|mailgun|ses
 *
 * NOTE: This route is NOT wrapped in apiHandler - it accepts external
 * provider callbacks secured via HMAC signature verification, not
 * admin session cookies.
 *
 * @phase Phase 3 - Email Metrics & Engagement
 * @tier ADVANCED
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import crypto from 'crypto';

// Provider event type mapping
type WebhookProvider = 'sendgrid' | 'mailgun' | 'ses';

interface WebhookEvent {
  provider: WebhookProvider;
  eventType: 'bounce' | 'complaint' | 'delivered' | 'dropped';
  recipientEmail: string;
  timestamp: string;
  reason?: string;
  bounceType?: 'hard' | 'soft';
}

/**
 * Verify webhook signature based on provider
 */
function verifySignature(
  req: NextRequest,
  body: string,
  provider: WebhookProvider
): boolean {
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
  if (!secret) {
    // If no secret configured, reject all webhooks for this provider
    return false;
  }

  switch (provider) {
    case 'sendgrid': {
      // SendGrid: X-Twilio-Email-Event-Webhook-Signature (ECDSA)
      // Simplified: Use shared secret verification
      const signature = req.headers.get('x-twilio-email-event-webhook-signature');
      if (!signature) return false;
      const hmac = crypto.createHmac('sha256', secret).update(body).digest('base64');
      try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac));
      } catch {
        return false;
      }
    }
    case 'mailgun': {
      // Mailgun: timestamp + token + signing key
      const timestamp = req.headers.get('x-mailgun-timestamp') || '';
      const token = req.headers.get('x-mailgun-token') || '';
      const signature = req.headers.get('x-mailgun-signature') || '';
      const hmac = crypto.createHmac('sha256', secret)
        .update(timestamp + token)
        .digest('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
      } catch {
        return false;
      }
    }
    case 'ses': {
      // AWS SES: SNS message - verify shared bearer token
      const auth = req.headers.get('authorization');
      return auth === `Bearer ${secret}`;
    }
    default:
      return false;
  }
}

/**
 * Parse provider-specific webhook payload into normalized events
 */
function parseWebhookEvents(
  provider: WebhookProvider,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
): WebhookEvent[] {
  const events: WebhookEvent[] = [];

  switch (provider) {
    case 'sendgrid': {
      // SendGrid sends array of event objects
      const items = Array.isArray(payload) ? payload : [payload];
      for (const item of items) {
        const eventType = mapSendGridEvent(item.event);
        if (eventType) {
          events.push({
            provider,
            eventType,
            recipientEmail: item.email,
            timestamp: item.timestamp
              ? new Date(item.timestamp * 1000).toISOString()
              : new Date().toISOString(),
            reason: item.reason || item.response,
            bounceType: item.event === 'bounce' ? (item.type === 'blocked' ? 'soft' : 'hard') : undefined
          });
        }
      }
      break;
    }
    case 'mailgun': {
      // Mailgun sends single event per request
      const eventData = payload['event-data'] || payload;
      const eventType = mapMailgunEvent(eventData.event);
      if (eventType) {
        events.push({
          provider,
          eventType,
          recipientEmail: eventData.recipient || eventData.message?.headers?.to,
          timestamp: eventData.timestamp
            ? new Date(eventData.timestamp * 1000).toISOString()
            : new Date().toISOString(),
          reason: eventData['delivery-status']?.description || eventData.reason,
          bounceType: eventData.severity === 'temporary' ? 'soft' : 'hard'
        });
      }
      break;
    }
    case 'ses': {
      // AWS SES SNS notification
      const message = payload.Message ? JSON.parse(payload.Message) : payload;
      const notificationType = message.notificationType || message.eventType;
      const eventType = mapSESEvent(notificationType);
      if (eventType) {
        const recipients = message.bounce?.bouncedRecipients
          || message.complaint?.complainedRecipients
          || message.delivery?.recipients
          || [];
        for (const recipient of recipients) {
          events.push({
            provider,
            eventType,
            recipientEmail: recipient.emailAddress || recipient,
            timestamp: message.mail?.timestamp || new Date().toISOString(),
            reason: message.bounce?.bounceSubType || message.complaint?.complaintSubType,
            bounceType: message.bounce?.bounceType === 'Transient' ? 'soft' : 'hard'
          });
        }
      }
      break;
    }
  }

  return events;
}

function mapSendGridEvent(event: string): WebhookEvent['eventType'] | null {
  switch (event) {
    case 'bounce': return 'bounce';
    case 'spamreport': return 'complaint';
    case 'delivered': return 'delivered';
    case 'dropped': return 'dropped';
    default: return null;
  }
}

function mapMailgunEvent(event: string): WebhookEvent['eventType'] | null {
  switch (event) {
    case 'failed':
    case 'rejected': return 'bounce';
    case 'complained': return 'complaint';
    case 'delivered': return 'delivered';
    default: return null;
  }
}

function mapSESEvent(event: string): WebhookEvent['eventType'] | null {
  switch (event) {
    case 'Bounce': return 'bounce';
    case 'Complaint': return 'complaint';
    case 'Delivery': return 'delivered';
    default: return null;
  }
}

/**
 * POST /api/notifications/email/webhook?provider=sendgrid|mailgun|ses
 */
export async function POST(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider') as WebhookProvider | null;

  if (!provider || !['sendgrid', 'mailgun', 'ses'].includes(provider)) {
    return NextResponse.json(
      { error: 'Invalid or missing provider parameter' },
      { status: 400 }
    );
  }

  try {
    const body = await req.text();

    // Verify webhook signature
    if (!verifySignature(req, body, provider)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const events = parseWebhookEvents(provider, payload);

    if (events.length === 0) {
      // Acknowledge but nothing to process
      return NextResponse.json({ processed: 0 });
    }

    const db = getDatabaseService();
    let updated = 0;

    for (const event of events) {
      try {
        if (event.eventType === 'bounce' || event.eventType === 'complaint') {
          // Update the most recent 'sent' log for this recipient to 'bounced'
          const result = await db.query(
            `UPDATE notification_email_logs
             SET status = 'bounced',
                 error_message = ?
             WHERE recipient_email = ?
               AND status = 'sent'
             ORDER BY sent_at DESC
             LIMIT 1`,
            [
              event.reason || `${event.eventType} (${event.bounceType || 'unknown'})`,
              event.recipientEmail
            ]
          );

          if (result.rowCount > 0) {
            updated++;
          }
        }
        // 'delivered' events: status is already 'sent', no action needed
        // 'dropped' events: low priority, no action taken
      } catch (err) {
        ErrorService.capture(`[EmailWebhook] Failed to process ${event.eventType} for ${event.recipientEmail}:`, err);
      }
    }

    return NextResponse.json({
      processed: events.length,
      updated,
      provider
    });
  } catch (error) {
    ErrorService.capture('[EmailWebhook] Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
