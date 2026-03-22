/**
 * Admin Notification Digest Process Endpoint
 *
 * POST /api/admin/notifications/queue/digest/process
 * Triggers immediate processing of pending digest emails
 *
 * Request Body:
 * - frequency: 'daily' | 'weekly' | 'all' (default: 'all')
 * - dryRun: boolean (default: false) - Preview without sending
 *
 * @phase Phase 4 - Queue Management Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { bigIntToNumber } from '@core/utils/bigint';
import { EmailNotificationService } from '@core/services/notification/EmailNotificationService';
import { BizError } from '@core/errors/BizError';
import type { QueueActionResult } from '@core/types/notification-admin';

/**
 * POST /api/admin/notifications/queue/digest/process
 * Process pending digest emails
 */
async function processDigestQueueHandler(context: ApiContext) {
  const db = getDatabaseService();

  let body: { frequency?: string; dryRun?: boolean } = {};
  try {
    body = await context.request.json();
  } catch {
    // Empty body is allowed
  }

  const frequency = body.frequency || 'all';
  const dryRun = body.dryRun === true;

  // Validate frequency
  if (!['daily', 'weekly', 'all'].includes(frequency)) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_FREQUENCY',
        message: 'Frequency must be daily, weekly, or all',
        userMessage: 'Frequency must be daily, weekly, or all'
      }),
      context.requestId
    );
  }

  // Get count of pending items
  const frequencyFilter = frequency !== 'all' ? 'AND digest_frequency = ?' : '';
  const frequencyParams = frequency !== 'all' ? [frequency] : [];

  const countResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM notification_email_queue
     WHERE processed_at IS NULL
       AND scheduled_for <= CURDATE()
       ${frequencyFilter}`,
    [...frequencyParams]
  );
  const pendingCount = bigIntToNumber(countResult.rows[0]?.count ?? 0n);

  if (pendingCount === 0) {
    const result: QueueActionResult = {
      success: true,
      message: 'No pending digest items to process',
      processed: 0,
      failed: 0
    };
    return createSuccessResponse({ ...result }, context.requestId);
  }

  // Dry run - just return count
  if (dryRun) {
    const result: QueueActionResult = {
      success: true,
      message: `Dry run: ${pendingCount} digest items would be processed`,
      processed: pendingCount,
      failed: 0
    };
    return createSuccessResponse({ ...result }, context.requestId);
  }

  // Process digests
  const emailService = new EmailNotificationService(db);
  const results: { sent: number; failed: number; errors: string[] } = {
    sent: 0,
    failed: 0,
    errors: []
  };

  if (frequency === 'all' || frequency === 'daily') {
    const dailyResult = await emailService.sendPendingDigests('daily');
    results.sent += dailyResult.sent;
    results.failed += dailyResult.failed;
    results.errors.push(...dailyResult.errors);
  }

  if (frequency === 'all' || frequency === 'weekly') {
    const weeklyResult = await emailService.sendPendingDigests('weekly');
    results.sent += weeklyResult.sent;
    results.failed += weeklyResult.failed;
    results.errors.push(...weeklyResult.errors);
  }

  const result: QueueActionResult = {
    success: results.failed === 0,
    message: results.failed === 0
      ? `Successfully processed ${results.sent} digest emails`
      : `Processed ${results.sent} digest emails with ${results.failed} failures`,
    processed: results.sent,
    failed: results.failed,
    errors: results.errors.length > 0 ? results.errors : undefined
  };

  return createSuccessResponse({ ...result }, context.requestId);
}

export const POST = apiHandler(processDigestQueueHandler, {
  allowedMethods: ['POST'],
  requireAuth: true,
  rbac: {
    action: 'write',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 5,
    windowMs: 60000 // Max 5 process requests per minute
  }
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
