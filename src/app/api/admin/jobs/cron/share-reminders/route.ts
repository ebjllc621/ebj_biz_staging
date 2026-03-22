/**
 * Job Share Reminder CRON Endpoint
 *
 * POST /api/admin/jobs/cron/share-reminders
 * Sends nudge notifications to job creators who haven't shared their job posting:
 * - 24-36 hours post-publish: "Your job has views — share it to attract more applicants!"
 * - Low-application jobs (48h+ old, 0 applications, 0 shares): "Boost your listing..."
 *
 * Intended to be called by external CRON (Vercel Cron, crontab, etc.)
 *
 * @phase Phase 8C - Share Reminders CRON
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_8_PLAN.md
 * @tier STANDARD
 * @canon src/app/api/admin/events/cron/share-reminders/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getNotificationService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';
import { jsonMethodNotAllowed } from '@/lib/http/json';

interface ShareNudgeCandidate {
  job_id: number;
  job_title: string;
  job_slug: string | null;
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
  low_application_nudges: NudgeResult;
  timestamp: string;
}

async function shareReminderHandler(context: ApiContext) {
  const db = getDatabaseService();
  const notificationService = getNotificationService();

  // ============================================================
  // 1. Post-publish nudge (24-36h after status→active, 0 shares)
  // ============================================================
  const postPublishCandidates = await db.query<ShareNudgeCandidate>(
    `SELECT jp.id AS job_id, jp.title AS job_title, jp.slug AS job_slug,
            jp.creator_user_id, jp.view_count
     FROM job_postings jp
     WHERE jp.status = 'active'
       AND jp.created_at BETWEEN NOW() - INTERVAL 36 HOUR AND NOW() - INTERVAL 24 HOUR
       AND NOT EXISTS (
         SELECT 1 FROM job_shares js
         WHERE js.job_id = jp.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM user_notifications un
         WHERE un.user_id = jp.creator_user_id
           AND un.entity_type = 'job'
           AND un.entity_id = jp.id
           AND un.title LIKE 'Share:%'
           AND un.created_at > NOW() - INTERVAL 72 HOUR
       )
     ORDER BY jp.created_at ASC`,
    []
  );

  let ppSent = 0;
  let ppFailed = 0;

  for (const candidate of postPublishCandidates.rows) {
    try {
      const viewText = candidate.view_count > 0
        ? `Your job has ${candidate.view_count} views`
        : 'Your job is live';
      await notificationService.dispatch({
        type: 'job.share_reminder',
        recipientId: candidate.creator_user_id,
        title: `Share: ${candidate.job_title}`,
        message: `${viewText} — share it to attract more applicants!`,
        entityType: 'job',
        entityId: candidate.job_id,
        actionUrl: `/jobs/${candidate.job_slug || candidate.job_id}`,
        priority: 'normal',
        metadata: {
          job_id: candidate.job_id,
          reminder_type: 'post_publish',
        },
      });
      ppSent++;
    } catch (err) {
      ppFailed++;
      ErrorService.capture(
        `[ShareReminder] Post-publish nudge failed for user ${candidate.creator_user_id}, job ${candidate.job_id}:`,
        err
      );
    }
  }

  // ============================================================
  // 2. Low-application nudge (48h+ old, 0 applications, 0 shares)
  // ============================================================
  const lowAppCandidates = await db.query<ShareNudgeCandidate>(
    `SELECT jp.id AS job_id, jp.title AS job_title, jp.slug AS job_slug,
            jp.creator_user_id, jp.view_count
     FROM job_postings jp
     WHERE jp.status = 'active'
       AND jp.created_at < NOW() - INTERVAL 48 HOUR
       AND jp.application_count = 0
       AND NOT EXISTS (
         SELECT 1 FROM job_shares js
         WHERE js.job_id = jp.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM user_notifications un
         WHERE un.user_id = jp.creator_user_id
           AND un.entity_type = 'job'
           AND un.entity_id = jp.id
           AND un.title LIKE 'Share:%'
           AND un.created_at > NOW() - INTERVAL 72 HOUR
       )
     ORDER BY jp.created_at ASC`,
    []
  );

  let laSent = 0;
  let laFailed = 0;

  for (const candidate of lowAppCandidates.rows) {
    try {
      await notificationService.dispatch({
        type: 'job.share_reminder',
        recipientId: candidate.creator_user_id,
        title: `Share: ${candidate.job_title}`,
        message: `Boost your listing — jobs shared on social see 4x more applications.`,
        entityType: 'job',
        entityId: candidate.job_id,
        actionUrl: `/jobs/${candidate.job_slug || candidate.job_id}`,
        priority: 'normal',
        metadata: {
          job_id: candidate.job_id,
          reminder_type: 'low_application',
        },
      });
      laSent++;
    } catch (err) {
      laFailed++;
      ErrorService.capture(
        `[ShareReminder] Low-application nudge failed for user ${candidate.creator_user_id}, job ${candidate.job_id}:`,
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
    low_application_nudges: {
      sent: laSent,
      failed: laFailed,
      candidates: lowAppCandidates.rows.length,
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
