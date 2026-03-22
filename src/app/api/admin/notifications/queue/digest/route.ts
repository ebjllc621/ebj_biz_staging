/**
 * Admin Notification Digest Queue Endpoint
 *
 * GET /api/admin/notifications/queue/digest
 * Returns paginated list of pending digest queue items with statistics
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 * - frequency: 'daily' | 'weekly' | 'all' (default: 'all')
 *
 * @phase Phase 4 - Queue Management Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { bigIntToNumber } from '@core/utils/bigint';
import type { DigestQueueEntry, DigestQueueResponse } from '@core/types/notification-admin';

/**
 * GET /api/admin/notifications/queue/digest
 * Returns paginated digest queue items
 */
async function getDigestQueueHandler(context: ApiContext) {
  const { searchParams } = new URL(context.request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
  const frequency = searchParams.get('frequency') || 'all';
  const offset = (page - 1) * pageSize;

  const db = getDatabaseService();

  // Build frequency filter
  const frequencyFilter = frequency !== 'all' ? 'AND q.digest_frequency = ?' : '';
  const frequencyParams = frequency !== 'all' ? [frequency] : [];

  // Get total count
  const countResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM notification_email_queue q
     WHERE q.processed_at IS NULL ${frequencyFilter}`,
    [...frequencyParams]
  );
  const totalItems = bigIntToNumber(countResult.rows[0]?.count ?? 0n);
  const totalPages = Math.ceil(totalItems / pageSize);

  // Get paginated items with user info
  const itemsResult = await db.query<{
    id: number;
    user_id: number;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    email: string;
    notification_id: number;
    event_type: string;
    category: string;
    title: string;
    message: string | null;
    action_url: string | null;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    digest_frequency: 'daily' | 'weekly';
    scheduled_for: Date;
    created_at: Date;
  }>(
    `SELECT
      q.id, q.user_id, u.first_name, u.last_name, u.display_name, u.email,
      q.notification_id, q.event_type, q.category, q.title, q.message,
      q.action_url, q.priority, q.digest_frequency, q.scheduled_for, q.created_at
     FROM notification_email_queue q
     JOIN users u ON q.user_id = u.id
     WHERE q.processed_at IS NULL ${frequencyFilter}
     ORDER BY q.scheduled_for ASC, q.priority DESC, q.created_at ASC
     LIMIT ? OFFSET ?`,
    [...frequencyParams, pageSize, offset]
  );

  const now = Date.now();
  const items: DigestQueueEntry[] = itemsResult.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    userName: row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown',
    userEmail: row.email,
    notificationId: row.notification_id,
    eventType: row.event_type,
    category: row.category,
    title: row.title,
    message: row.message,
    actionUrl: row.action_url,
    priority: row.priority,
    digestFrequency: row.digest_frequency,
    scheduledFor: new Date(row.scheduled_for).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    ageHours: Math.round((now - new Date(row.created_at).getTime()) / (1000 * 60 * 60))
  }));

  // Get statistics
  const statistics = await getDigestQueueStatistics(db);

  const response: DigestQueueResponse = {
    items,
    statistics,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages
    }
  };

  return createSuccessResponse({ ...response }, context.requestId);
}

/**
 * Get digest queue statistics
 */
async function getDigestQueueStatistics(
  db: ReturnType<typeof getDatabaseService>
): Promise<DigestQueueResponse['statistics']> {
  // Total pending by frequency
  const frequencyResult = await db.query<{
    digest_frequency: string;
    count: bigint;
  }>(
    `SELECT digest_frequency, COUNT(*) as count
     FROM notification_email_queue
     WHERE processed_at IS NULL
     GROUP BY digest_frequency`
  );

  let dailyPending = 0;
  let weeklyPending = 0;
  for (const row of frequencyResult.rows) {
    if (row.digest_frequency === 'daily') {
      dailyPending = bigIntToNumber(row.count);
    } else if (row.digest_frequency === 'weekly') {
      weeklyPending = bigIntToNumber(row.count);
    }
  }

  // Oldest entry
  const oldestResult = await db.query<{ created_at: Date }>(
    `SELECT created_at FROM notification_email_queue
     WHERE processed_at IS NULL
     ORDER BY created_at ASC
     LIMIT 1`
  );
  const oldestCreated = oldestResult.rows[0]?.created_at;
  const oldestEntryHours = oldestCreated
    ? Math.round((Date.now() - new Date(oldestCreated).getTime()) / (1000 * 60 * 60))
    : 0;

  // Users affected
  const usersResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(DISTINCT user_id) as count
     FROM notification_email_queue
     WHERE processed_at IS NULL`
  );
  const usersAffected = bigIntToNumber(usersResult.rows[0]?.count ?? 0n);

  return {
    totalPending: dailyPending + weeklyPending,
    dailyPending,
    weeklyPending,
    oldestEntryHours,
    usersAffected
  };
}

export const GET = apiHandler(getDigestQueueHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 30,
    windowMs: 60000
  }
});

// Method guards
const ALLOWED_METHODS = ['GET'];

export async function POST() {
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
