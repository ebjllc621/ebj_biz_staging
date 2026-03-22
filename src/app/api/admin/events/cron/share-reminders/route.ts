/**
 * Share Reminder CRON Endpoint
 *
 * POST /api/admin/events/cron/share-reminders
 * Sends nudge notifications to event creators who haven't shared their event:
 * - 24-36 hours post-publish: "Your event has views — share it to reach more people!"
 * - Low-RSVP events (48h+ old, <5 RSVPs, 0 shares): "Boost your event..."
 *
 * Intended to be called by external CRON (Vercel Cron, crontab, etc.)
 *
 * @phase Phase 8 - Polish + KPI Dashboard (FM 4.5)
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_8_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getNotificationService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';
import { bigIntToNumber } from '@core/utils/bigint';
import { jsonMethodNotAllowed } from '@/lib/http/json';

interface ShareNudgeCandidate {
  event_id: number;
  event_title: string;
  event_slug: string | null;
  creator_user_id: number;
  view_count: number;
}

interface NudgeResult {
  sent: number;
  failed: number;
  candidates: number;
}

interface ShareReminderResult {
  post_publish_nudges: NudgeResult;
  low_rsvp_nudges: NudgeResult;
  timestamp: string;
}

async function shareReminderHandler(context: ApiContext) {
  const db = getDatabaseService();
  const notificationService = getNotificationService();

  // ============================================================
  // 1. 24-hour post-publish nudge
  // Find published events created 24-36 hours ago with 0 shares
  // and no existing nudge notification for the creator
  // ============================================================
  const postPublishCandidates = await db.query<ShareNudgeCandidate>(
    `SELECT e.id AS event_id, e.title AS event_title, e.slug AS event_slug,
            e.creator_user_id, e.view_count
     FROM events e
     WHERE e.status = 'published'
       AND e.created_at BETWEEN NOW() - INTERVAL 36 HOUR AND NOW() - INTERVAL 24 HOUR
       AND NOT EXISTS (
         SELECT 1 FROM event_shares es
         WHERE es.event_id = e.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM user_notifications un
         WHERE un.user_id = e.creator_user_id
           AND un.entity_type = 'event'
           AND un.entity_id = e.id
           AND un.title LIKE 'Share:%'
           AND un.created_at > NOW() - INTERVAL 72 HOUR
       )
     ORDER BY e.created_at ASC`,
    []
  );

  let ppSent = 0;
  let ppFailed = 0;

  for (const candidate of postPublishCandidates.rows) {
    try {
      const viewText = candidate.view_count > 0
        ? `Your event has ${candidate.view_count} views`
        : 'Your event is live';
      await notificationService.dispatch({
        type: 'event.share_reminder',
        recipientId: candidate.creator_user_id,
        title: `Share: ${candidate.event_title}`,
        message: `${viewText} — share it to reach more people!`,
        entityType: 'event',
        entityId: candidate.event_id,
        actionUrl: `/events/${candidate.event_slug || candidate.event_id}`,
        priority: 'normal',
        metadata: {
          event_id: candidate.event_id,
          reminder_type: 'post_publish',
        },
      });
      ppSent++;
    } catch (err) {
      ppFailed++;
      ErrorService.capture(
        `[ShareReminder] Post-publish nudge failed for user ${candidate.creator_user_id}, event ${candidate.event_id}:`,
        err
      );
    }
  }

  // ============================================================
  // 2. Low-RSVP performance nudge
  // Find published future events (3+ days out), 48+ hours old,
  // with <5 RSVPs, 0 shares, and no existing nudge
  // ============================================================
  const lowRsvpCandidates = await db.query<ShareNudgeCandidate>(
    `SELECT e.id AS event_id, e.title AS event_title, e.slug AS event_slug,
            e.creator_user_id, e.view_count
     FROM events e
     WHERE e.status = 'published'
       AND e.start_date > NOW() + INTERVAL 3 DAY
       AND e.created_at < NOW() - INTERVAL 48 HOUR
       AND (SELECT COUNT(*) FROM event_rsvps r WHERE r.event_id = e.id AND r.rsvp_status IN ('confirmed', 'pending')) < 5
       AND NOT EXISTS (
         SELECT 1 FROM event_shares es
         WHERE es.event_id = e.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM user_notifications un
         WHERE un.user_id = e.creator_user_id
           AND un.entity_type = 'event'
           AND un.entity_id = e.id
           AND un.title LIKE 'Share:%'
           AND un.created_at > NOW() - INTERVAL 72 HOUR
       )
     ORDER BY e.start_date ASC`,
    []
  );

  let lrSent = 0;
  let lrFailed = 0;

  for (const candidate of lowRsvpCandidates.rows) {
    try {
      await notificationService.dispatch({
        type: 'event.share_reminder',
        recipientId: candidate.creator_user_id,
        title: `Share: ${candidate.event_title}`,
        message: `Boost your ${candidate.event_title} — events shared on social see 4x more RSVPs.`,
        entityType: 'event',
        entityId: candidate.event_id,
        actionUrl: `/events/${candidate.event_slug || candidate.event_id}`,
        priority: 'normal',
        metadata: {
          event_id: candidate.event_id,
          reminder_type: 'low_rsvp',
        },
      });
      lrSent++;
    } catch (err) {
      lrFailed++;
      ErrorService.capture(
        `[ShareReminder] Low-RSVP nudge failed for user ${candidate.creator_user_id}, event ${candidate.event_id}:`,
        err
      );
    }
  }

  const result: ShareReminderResult = {
    post_publish_nudges: {
      sent: ppSent,
      failed: ppFailed,
      candidates: postPublishCandidates.rows.length,
    },
    low_rsvp_nudges: {
      sent: lrSent,
      failed: lrFailed,
      candidates: lowRsvpCandidates.rows.length,
    },
    timestamp: new Date().toISOString(),
  };

  return createSuccessResponse(result, context.requestId);
}

export const POST = apiHandler(shareReminderHandler, {
  requireAuth: true,
  rbac: { action: 'write', resource: 'notification_admin' },
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
