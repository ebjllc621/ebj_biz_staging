/**
 * GET /api/events/search - Search events endpoint
 *
 * @phase Phase 3 - Events Page API Route Implementation
 * @pattern Following exact listings/search + apiHandler pattern
 * @canonical Uses DatabaseService → MariaDB (same as listings/search)
 * @see docs/pages/layouts/events/phases/PHASE_3_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Direct SQL queries with parameterized values
 * - Error handling: BizError-based validation errors
 * - Response format: createSuccessResponse with pagination
 *
 * Query parameters:
 * - page: number >= 1 (default 1) - Page number for pagination
 * - pageSize: number 1-50 (default 20) - Items per page
 * - sort: 'priority' | 'date' | 'name' (default 'priority') - Sort order
 * - q: optional string - Search query for title/description
 * - eventType: optional string - Filter by event type
 * - locationType: optional string - Filter by location type (physical, virtual, hybrid)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { DbResult } from '@core/types/db';

/**
 * Event row type for search results (from events table joined with listings)
 *
 * @fixed 2026-01-04 - SYSREP schema validation fix
 * @schema docs/audits/phase/P3A/db/schema.sql (CREATE TABLE events, lines 401-442)
 * @migration scripts/migrations/events-schema-fix/ (adds latitude, longitude, registration_required)
 *
 * Column name corrections (schema.sql column names):
 * - location_type: enum('physical','virtual','hybrid') - NOT is_virtual
 * - total_capacity: int - NOT capacity
 * - is_ticketed: tinyint(1) - NOT registration_required (migration adds this)
 * - ticket_price: decimal(10,2) - NOT price
 * - banner_image: varchar(500) - NOT image_url
 *
 * NOTE: latitude, longitude, registration_required are added via migration.
 * Until migration runs, lat/lng fall back to listings table values.
 */
interface EventSearchRow {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  end_date: string;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  // Location - from events if available (after migration), else from listings
  latitude: number | null;
  longitude: number | null;
  location_type: 'physical' | 'virtual' | 'hybrid';
  // Capacity - CORRECT column names per schema
  total_capacity: number | null;
  remaining_capacity: number | null;
  rsvp_count: number;
  // Ticketing - CORRECT column names per schema
  is_ticketed: number;
  registration_required: number | null;  // Added via migration, nullable until then
  ticket_price: number | null;
  // Media - CORRECT column name per schema
  banner_image: string | null;
  is_featured: number;
  // Joined from listings table
  listing_name: string;
  listing_slug: string;
  // Listing tier for map markers (2026-01-05 - use listing tier-based markers)
  listing_tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  listing_claimed: number;
}

/**
 * Search result item (transformed for API response)
 * Matches EventWithCoordinates from Phase 2 types
 */
interface EventSearchItem {
  id: number;
  title: string;
  slug: string;
  listing_name: string;
  listing_slug: string;
  event_type?: string;
  start_date: Date;
  end_date: Date;
  venue_name?: string;
  city?: string;
  state?: string;
  banner_image?: string;
  is_ticketed: boolean;
  ticket_price?: number;
  remaining_capacity?: number;
  latitude: number | null;
  longitude: number | null;
  // Listing tier for map markers (2026-01-05)
  listing_tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  listing_claimed: boolean;
}

/**
 * Search response data structure
 */
interface EventsSearchData {
  items: EventSearchItem[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Allowed sort options
 */
type EventSortOption = 'priority' | 'date' | 'name';

/**
 * Allowed location types
 */
type LocationTypeOption = 'physical' | 'virtual' | 'hybrid';

/**
 * Parse and validate search parameters from request
 */
function parseSearchParams(request: Request): {
  page: number;
  pageSize: number;
  sort: EventSortOption;
  q?: string;
  eventType?: string;
  locationType?: LocationTypeOption;
} {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse page (default: 1, min: 1)
  let page = 1;
  const pageParam = searchParams.get('page');
  if (pageParam !== null) {
    const parsed = parseInt(pageParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'Page parameter must be a positive integer'
      });
    }
    page = parsed;
  }

  // Parse pageSize (default: 20, range: 1-50)
  let pageSize = 20;
  const pageSizeParam = searchParams.get('pageSize');
  if (pageSizeParam !== null) {
    const parsed = parseInt(pageSizeParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'PageSize parameter must be an integer between 1 and 50'
      });
    }
    pageSize = parsed;
  }

  // Parse sort (default: 'priority', allowed: 'priority' | 'date' | 'name')
  let sort: EventSortOption = 'priority';
  const sortParam = searchParams.get('sort');
  if (sortParam !== null) {
    if (sortParam !== 'priority' && sortParam !== 'date' && sortParam !== 'name') {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'Sort parameter must be "priority", "date", or "name"'
      });
    }
    sort = sortParam;
  }

  // Parse search query (optional)
  const q = searchParams.get('q') || undefined;

  // Parse eventType (optional)
  const eventType = searchParams.get('eventType') || undefined;

  // Parse locationType (optional, validate if provided)
  let locationType: LocationTypeOption | undefined;
  const locationTypeParam = searchParams.get('locationType');
  if (locationTypeParam !== null) {
    if (locationTypeParam !== 'physical' && locationTypeParam !== 'virtual' && locationTypeParam !== 'hybrid') {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'LocationType parameter must be "physical", "virtual", or "hybrid"'
      });
    }
    locationType = locationTypeParam;
  }

  return { page, pageSize, sort, q, eventType, locationType };
}

/**
 * GET /api/events/search
 * Search events with pagination, sorting, and filtering
 *
 * Following exact pattern from /api/listings/search which WORKS:
 * - apiHandler wrapper for error handling
 * - DatabaseService for data access
 * - createSuccessResponse for response formatting
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Parse and validate query parameters
  const { page, pageSize, sort, q, eventType, locationType } = parseSearchParams(context.request);

  // Get database service (canonical pattern)
  const db = getDatabaseService();

  // Build WHERE clause - only published, upcoming events
  const whereClauses = [
    `e.status = 'published'`,
    `e.start_date > NOW()`
  ];
  const params: (string | number)[] = [];

  // Search filter
  if (q) {
    whereClauses.push(`(e.title LIKE ? OR e.description LIKE ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }

  // Event type filter
  if (eventType) {
    whereClauses.push(`e.event_type = ?`);
    params.push(eventType);
  }

  // Location type filter - uses location_type enum column
  if (locationType) {
    whereClauses.push(`e.location_type = ?`);
    params.push(locationType);
  }

  const whereSQL = whereClauses.join(' AND ');

  // Build ORDER BY based on sort option
  let orderSQL: string;
  switch (sort) {
    case 'date':
      orderSQL = 'e.start_date ASC';
      break;
    case 'name':
      orderSQL = 'e.title ASC';
      break;
    case 'priority':
    default:
      // Priority: featured first, then soonest date
      orderSQL = 'e.is_featured DESC, e.start_date ASC';
      break;
  }

  // Calculate offset
  const offset = (page - 1) * pageSize;

  // Get total count
  // GOVERNANCE: mariadb returns BigInt for COUNT(*) - must convert to Number for JSON serialization
  const countResult: DbResult<{ total: bigint | number }> = await db.query<{ total: bigint | number }>(
    `SELECT COUNT(*) as total FROM events e WHERE ${whereSQL}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.total);

  // Get paginated events with listing info
  // NOTE: Uses COALESCE for lat/lng to support both pre-migration (from listings)
  // and post-migration (from events) scenarios. After migration, events can have
  // their own location different from the listing.
  const eventsResult: DbResult<EventSearchRow> = await db.query<EventSearchRow>(
    `SELECT
      e.id,
      e.listing_id,
      e.title,
      e.slug,
      e.description,
      e.event_type,
      e.start_date,
      e.end_date,
      e.venue_name,
      e.city,
      e.state,
      COALESCE(e.latitude, l.latitude) as latitude,
      COALESCE(e.longitude, l.longitude) as longitude,
      e.location_type,
      e.total_capacity,
      e.remaining_capacity,
      e.rsvp_count,
      e.is_ticketed,
      e.registration_required,
      e.ticket_price,
      e.banner_image,
      e.is_featured,
      l.name as listing_name,
      l.slug as listing_slug,
      l.tier as listing_tier,
      l.claimed as listing_claimed
    FROM events e
    INNER JOIN listings l ON e.listing_id = l.id
    WHERE ${whereSQL}
    ORDER BY ${orderSQL}
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  // Transform results to match EventWithCoordinates interface
  // Uses CORRECT column names from schema.sql
  const items: EventSearchItem[] = eventsResult.rows.map((row: EventSearchRow) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    listing_name: row.listing_name,
    listing_slug: row.listing_slug,
    event_type: row.event_type ?? undefined,
    start_date: new Date(row.start_date),
    end_date: new Date(row.end_date),
    venue_name: row.venue_name ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    banner_image: row.banner_image ?? undefined,
    // is_ticketed from schema, registration_required from migration (optional)
    is_ticketed: Boolean(row.is_ticketed) || Boolean(row.registration_required),
    ticket_price: row.ticket_price ?? undefined,
    // Use remaining_capacity from schema, or calculate from total - rsvp
    remaining_capacity: row.remaining_capacity !== null
      ? row.remaining_capacity
      : (row.total_capacity !== null
        ? Math.max(0, row.total_capacity - row.rsvp_count)
        : undefined),
    latitude: row.latitude !== null ? parseFloat(String(row.latitude)) : null,
    longitude: row.longitude !== null ? parseFloat(String(row.longitude)) : null,
    // Listing tier for map markers (2026-01-05)
    listing_tier: row.listing_tier,
    listing_claimed: Boolean(row.listing_claimed)
  }));

  // Build response data
  const data: EventsSearchData = {
    items,
    page,
    pageSize,
    total,
    hasNext: (offset + pageSize) < total,
    hasPrev: page > 1
  };

  return createSuccessResponse(data, context.requestId);
}, {
  allowedMethods: ['GET']
});
