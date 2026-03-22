/**
 * Event Reminder CRON Endpoint
 *
 * POST /api/admin/notifications/cron/event-reminders
 * Sends reminder notifications for events across three windows:
 * - 1 week before (6-8 day window)
 * - 24 hours before (12-36 hour window)
 * - 2 hours before (1-3 hour window)
 *
 * Intended to be called by external CRON (Vercel Cron, crontab, etc.)
 *
 * @phase Phase 6B - Event Notifications (Enhanced in Events Phase 6 - G20)
 * @authority docs/pages/layouts/events/build/3-10-26/phases/PHASE_6_NOTIFICATION_WIRING.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getNotificationService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';
import { jsonMethodNotAllowed } from '@/lib/http/json';

interface ReminderCandidate {
  event_id: number;
  event_title: string;
  event_slug: string | null;
  start_date: Date;
  venue_name: string | null;
  user_id: number;
}

interface ReminderWindow {
  label: string;
  type: string;
  startInterval: string;
  endInterval: string;
  deduplicationHours: number;
}

interface WindowResult {
  sent: number;
  failed: number;
  candidates: number;
}

const REMINDER_WINDOWS: ReminderWindow[] = [
  {
    label: '1 week',
    type: '1w',
    startInterval: 'NOW() + INTERVAL 6 DAY',
    endInterval: 'NOW() + INTERVAL 8 DAY',
    deduplicationHours: 48
  },
  {
    label: '24 hours',
    type: '24h',
    startInterval: 'NOW() + INTERVAL 12 HOUR',
    endInterval: 'NOW() + INTERVAL 36 HOUR',
    deduplicationHours: 48
  },
  {
    label: '2 hours',
    type: '2h',
    startInterval: 'NOW() + INTERVAL 1 HOUR',
    endInterval: 'NOW() + INTERVAL 3 HOUR',
    deduplicationHours: 6
  }
];

function formatReminderMessage(window: ReminderWindow, candidate: ReminderCandidate): string {
  const venue = candidate.venue_name ? ` at ${candidate.venue_name}` : '';
  switch (window.type) {
    case '1w':
      return `Starts in about a week${venue}`;
    case '2h':
      return `Starts in about 2 hours${venue}`;
    case '24h':
    default: {
      const now = new Date();
      const diff = candidate.start_date.getTime() - now.getTime();
      const hours = Math.round(diff / (1000 * 60 * 60));
      if (hours <= 1) return `Starts in about 1 hour${venue}`;
      if (hours < 24) return `Starts in about ${hours} hours${venue}`;
      return `Starts tomorrow${venue}`;
    }
  }
}

async function eventReminderHandler(context: ApiContext) {
  const db = getDatabaseService();
  const notificationService = getNotificationService();

  let totalSent = 0;
  let totalFailed = 0;
  let totalCandidates = 0;
  const byWindow: Record<string, WindowResult> = {};

  // Process each reminder window sequentially to avoid DB contention
  for (const window of REMINDER_WINDOWS) {
    const candidates = await db.query<ReminderCandidate>(
      `SELECT e.id AS event_id, e.title AS event_title, e.slug AS event_slug,
              e.start_date, e.venue_name, r.user_id
       FROM events e
       INNER JOIN event_rsvps r ON e.id = r.event_id
       WHERE e.status = 'published'
         AND e.start_date BETWEEN ${window.startInterval} AND ${window.endInterval}
         AND r.rsvp_status IN ('confirmed', 'pending')
         AND NOT EXISTS (
           SELECT 1 FROM user_notifications un
           WHERE un.user_id = r.user_id
             AND un.entity_type = 'event'
             AND un.entity_id = e.id
             AND un.notification_type = 'system'
             AND un.title LIKE 'Reminder:%'
             AND un.created_at > NOW() - INTERVAL ${window.deduplicationHours} HOUR
         )
       ORDER BY e.start_date ASC`,
      []
    );

    let windowSent = 0;
    let windowFailed = 0;

    for (const candidate of candidates.rows) {
      try {
        await notificationService.dispatch({
          type: 'event.reminder',
          recipientId: candidate.user_id,
          title: `Reminder: ${candidate.event_title}`,
          message: formatReminderMessage(window, candidate),
          entityType: 'event',
          entityId: candidate.event_id,
          actionUrl: `/events/${candidate.event_slug || candidate.event_id}`,
          priority: 'high',
          metadata: {
            event_id: candidate.event_id,
            start_date: candidate.start_date,
            reminder_type: window.type
          }
        });
        windowSent++;
      } catch (err) {
        windowFailed++;
        ErrorService.capture(`[EventReminder] Failed for user ${candidate.user_id}, event ${candidate.event_id} (${window.type}):`, err);
      }
    }

    byWindow[window.type] = {
      sent: windowSent,
      failed: windowFailed,
      candidates: candidates.rows.length
    };

    totalSent += windowSent;
    totalFailed += windowFailed;
    totalCandidates += candidates.rows.length;
  }

  return createSuccessResponse({
    reminders_sent: totalSent,
    reminders_failed: totalFailed,
    total_candidates: totalCandidates,
    by_window: byWindow,
    timestamp: new Date().toISOString()
  }, context.requestId);
}

export const POST = apiHandler(eventReminderHandler, {
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
