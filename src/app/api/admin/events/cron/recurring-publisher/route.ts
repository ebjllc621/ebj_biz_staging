/**
 * Recurring Event Auto-Publisher CRON Endpoint
 *
 * POST /api/admin/events/cron/recurring-publisher
 * Generates instances for all published recurring events for the next 4 weeks.
 *
 * Architecture follows event-reminders CRON pattern:
 * - POST endpoint with admin RBAC
 * - Queries all parent recurring events
 * - Generates missing instances via EventService.generateRecurringInstances()
 * - Returns structured result report
 *
 * Intended to be called by external CRON (Vercel Cron, crontab, etc.)
 *
 * @phase Phase 3B: Recurring Events
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_3B_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import { bigIntToNumber } from '@core/utils/bigint';
import { DbResult } from '@core/types/db';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { jsonMethodNotAllowed } from '@/lib/http/json';

interface ParentEventRow {
  id: number;
  title: string;
  listing_id: number | null;
}

interface PublisherResult {
  processed: number;
  instances_created: number;
  errors: number;
  skipped: number;
  by_event: Array<{
    event_id: number;
    title: string;
    instances_created: number;
    error?: string;
  }>;
}

async function recurringPublisherHandler(context: ApiContext) {
  const db = getDatabaseService();
  const eventService = getEventService();

  // Query all published recurring parent events (not children)
  const parentEventsResult: DbResult<ParentEventRow> = await db.query<ParentEventRow>(
    `SELECT id, title, listing_id
     FROM events
     WHERE is_recurring = 1
       AND status = 'published'
       AND parent_event_id IS NULL
     ORDER BY id ASC`,
    []
  );

  const parentEvents = parentEventsResult.rows;

  let totalProcessed = 0;
  let totalInstancesCreated = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  const byEvent: PublisherResult['by_event'] = [];

  for (const parent of parentEvents) {
    totalProcessed++;

    if (!parent.listing_id) {
      // Recurring events require a listing — skip orphaned parents
      totalSkipped++;
      byEvent.push({
        event_id: parent.id,
        title: parent.title,
        instances_created: 0,
        error: 'No listing_id — skipped',
      });
      continue;
    }

    try {
      const instances = await eventService.generateRecurringInstances(parent.id, 4);
      totalInstancesCreated += instances.length;
      byEvent.push({
        event_id: parent.id,
        title: parent.title,
        instances_created: instances.length,
      });
    } catch (err) {
      totalErrors++;
      ErrorService.capture(
        `[RecurringPublisher] Failed for parent event ${parent.id} (${parent.title}):`,
        err
      );
      byEvent.push({
        event_id: parent.id,
        title: parent.title,
        instances_created: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Get total count for reporting
  const countResult: DbResult<{ total: number | bigint }> = await db.query<{ total: number | bigint }>(
    `SELECT COUNT(*) AS total FROM events WHERE is_recurring = 1 AND status = 'published' AND parent_event_id IS NULL`,
    []
  );
  const totalParents = bigIntToNumber(countResult.rows[0]?.total ?? 0);

  if (totalInstancesCreated > 0) {
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'event',
      targetEntityId: 0,
      actionType: 'event_recurring_published',
      actionCategory: 'creation',
      actionDescription: `Recurring publisher created ${totalInstancesCreated} instances from ${totalProcessed} parent events`,
      afterData: { processed: totalProcessed, instances_created: totalInstancesCreated, errors: totalErrors, skipped: totalSkipped },
      severity: 'low'
    });
  }

  return createSuccessResponse(
    {
      processed: totalProcessed,
      instances_created: totalInstancesCreated,
      errors: totalErrors,
      skipped: totalSkipped,
      total_recurring_parents: totalParents,
      by_event: byEvent,
      timestamp: new Date().toISOString(),
    },
    context.requestId
  );
}

export const POST = apiHandler(recurringPublisherHandler, {
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
