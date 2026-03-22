/**
 * Hiring Events API Route
 *
 * GET /api/jobs/events - Get hiring events
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { safeJsonParse } from '@core/utils/bigint';
import type { HiringEventRow } from '@core/types/db-rows';

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const searchParams = url.searchParams;

  const eventType = searchParams.get('event_type');
  const listingId = searchParams.get('listing_id');
  const upcoming = searchParams.get('upcoming') === 'true';

  const db = getDatabaseService();

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];

  if (eventType) {
    conditions.push('he.event_type = ?');
    params.push(eventType);
  }

  if (listingId) {
    conditions.push('JSON_CONTAINS(he.participating_listings, CAST(? AS JSON))');
    params.push(listingId);
  }

  if (upcoming) {
    conditions.push('e.start_date >= CURDATE()');
  }

  const query = `
    SELECT
      he.*,
      e.name as event_name,
      e.start_date as event_date,
      e.location as event_location,
      e.city,
      e.state
    FROM hiring_events he
    JOIN events e ON he.event_id = e.id
    WHERE ${conditions.join(' AND ')}
      AND e.status = 'active'
    ORDER BY e.start_date ASC
  `;

  const result = await db.query<HiringEventRow & {
    event_name: string;
    event_date: string;
    event_location: string;
    city: string;
    state: string;
  }>(query, params);

  const events = result.rows.map(row => ({
    id: row.id,
    event_id: row.event_id,
    event_type: row.event_type,
    participating_listings: row.participating_listings ? safeJsonParse<number[]>(row.participating_listings, []) : null,
    expected_openings: row.expected_openings,
    featured_roles: row.featured_roles ? safeJsonParse<string[]>(row.featured_roles, []) : null,
    registration_required: Boolean(row.registration_required),
    external_registration_url: row.external_registration_url,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    event_name: row.event_name,
    event_date: new Date(row.event_date),
    event_location: row.event_location,
    city: row.city,
    state: row.state
  }));

  return createSuccessResponse({ events }, context.requestId);
});
