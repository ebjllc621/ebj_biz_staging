/**
 * Subscription Renewal Reminder CRON Endpoint
 *
 * POST /api/admin/notifications/cron/subscription-reminders
 * Sends renewal reminder notifications for subscriptions renewing within 14 days
 * Intended to be called by external CRON (Vercel Cron, crontab, etc.)
 *
 * @phase Phase 6C - Subscription Notifications
 * @authority docs/notificationService/admin/3-6-26/phases/PHASE_6_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getNotificationService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';
import { jsonMethodNotAllowed } from '@/lib/http/json';

interface RenewalCandidate {
  subscription_id: number;
  listing_id: number;
  user_id: number;
  tier: string;
  renews_at: Date;
}

async function subscriptionReminderHandler(context: ApiContext) {
  const db = getDatabaseService();
  const notificationService = getNotificationService();

  // Find subscriptions renewing in 7-14 days that haven't been reminded
  const candidates = await db.query<RenewalCandidate>(
    `SELECT ls.id AS subscription_id, ls.listing_id, l.user_id,
            sp.tier, ls.renews_at
     FROM listing_subscriptions ls
     INNER JOIN listings l ON ls.listing_id = l.id
     INNER JOIN subscription_plans sp ON ls.plan_id = sp.id
     WHERE ls.status = 'active'
       AND ls.renews_at BETWEEN NOW() + INTERVAL 7 DAY AND NOW() + INTERVAL 14 DAY
       AND NOT EXISTS (
         SELECT 1 FROM user_notifications un
         WHERE un.user_id = l.user_id
           AND un.entity_type = 'subscription'
           AND un.entity_id = ls.id
           AND un.title LIKE 'Subscription renewing%'
           AND un.created_at > NOW() - INTERVAL 30 DAY
       )
     ORDER BY ls.renews_at ASC`,
    []
  );

  let sent = 0;
  let failed = 0;

  for (const candidate of candidates.rows) {
    try {
      const daysUntilRenewal = Math.ceil(
        (new Date(candidate.renews_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      await notificationService.dispatch({
        type: 'subscription.renewing_soon',
        recipientId: candidate.user_id,
        title: `Subscription renewing in ${daysUntilRenewal} days`,
        message: `Your ${candidate.tier} subscription will renew on ${new Date(candidate.renews_at).toLocaleDateString()}. Review your plan details.`,
        entityType: 'subscription',
        entityId: candidate.subscription_id,
        actionUrl: '/dashboard/subscription',
        priority: 'normal',
        metadata: {
          subscription_id: candidate.subscription_id,
          listing_id: candidate.listing_id,
          tier: candidate.tier,
          renews_at: candidate.renews_at,
          days_until_renewal: daysUntilRenewal
        }
      });
      sent++;
    } catch (err) {
      failed++;
      ErrorService.capture(`[SubscriptionReminder] Failed for user ${candidate.user_id}:`, err);
    }
  }

  return createSuccessResponse({
    reminders_sent: sent,
    reminders_failed: failed,
    total_candidates: candidates.rows.length,
    timestamp: new Date().toISOString()
  }, context.requestId);
}

export const POST = apiHandler(subscriptionReminderHandler, {
  requireAuth: true,
  rbac: { action: 'write', resource: 'notification_admin' }
});

// Method guards
const ALLOWED_METHODS = ['POST'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
