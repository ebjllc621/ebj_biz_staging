/**
 * Events API Routes (User-Facing)
 * POST /api/events - Create new event (user-facing with tier enforcement)
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md
 * @governance 100% authentication gating (listing_member, admin)
 * @governance Tier enforcement (4-50 events based on subscription)
 * @pattern Exact replication of POST /api/listings pattern
 */

// PATTERN: Imports from @reference src/app/api/listings/route.ts
import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest, isListingMember } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * GET /api/events
 * Get all events with optional filters
 * Query parameters:
 *   - listingId: Filter by listing ID
 *   - status: Filter by status (upcoming, ongoing, ended, cancelled)
 *   - locationtype: Filter by location type (physical, virtual, hybrid)
 *   - startDate: Filter by minimum start date
 *   - endDate: Filter by maximum end date
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10)
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse filters from query parameters
  const filters: Record<string, unknown> = {};

  const listingIdParam = searchParams.get('listingId');
  if (listingIdParam !== null) {
    const listingId = parseInt(listingIdParam);
    if (isNaN(listingId)) {
      throw BizError.badRequest('Invalid listingId parameter', { listingId: listingIdParam });
    }
    filters.listingId = listingId;
  }

  const statusParam = searchParams.get('status');
  if (statusParam !== null) {
    filters.status = statusParam;
  }

  const locationTypeParam = searchParams.get('locationType');
  if (locationTypeParam !== null) {
    filters.locationType = locationTypeParam;
  }

  const startDateParam = searchParams.get('startDate');
  if (startDateParam !== null) {
    filters.startDate = new Date(startDateParam);
  }

  const endDateParam = searchParams.get('endDate');
  if (endDateParam !== null) {
    filters.endDate = new Date(endDateParam);
  }

  const isMockParam = searchParams.get('isMock');
  if (isMockParam !== null) {
    filters.isMock = isMockParam === 'true';
  }

  // Support isUpcoming filter for finding published events with future start dates
  const isUpcomingParam = searchParams.get('isUpcoming');
  if (isUpcomingParam === 'true') {
    filters.isUpcoming = true;
  }

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (isNaN(page) || page < 1) {
    throw BizError.badRequest('Invalid page parameter', { page: searchParams.get('page') });
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw BizError.badRequest('Invalid limit parameter (must be 1-100)', { limit: searchParams.get('limit') });
  }

  // Get events
  const service = getEventService();
  const result = await service.getAll(filters, { page, limit });

  return createSuccessResponse(result, context.requestId);
}, {
  allowedMethods: ['GET', 'POST']
});

/**
 * POST /api/events - Create new event (user-facing)
 *
 * @governance Authentication required (listing_member or admin)
 * @governance Ownership verification (user owns the listing)
 * @governance Tier limit enforcement (SERVER-SIDE)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // PATTERN: Session extraction from @reference POST /api/listings (lines 82-96)
  const user = await getUserFromRequest(request);

  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const body = await request.json();

  // Community event path — any authenticated user can submit a community event
  if (body.is_community_event) {
    const eventService = getEventService();
    const event = await eventService.createCommunityEvent(user.id, {
      title: body.title,
      description: body.description,
      event_type: body.event_type,
      start_date: body.start_date,
      end_date: body.end_date,
      timezone: body.timezone,
      location_type: body.location_type,
      venue_name: body.venue_name,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      virtual_link: body.virtual_link,
      total_capacity: body.total_capacity,
    });
    return createSuccessResponse(
      { event: { id: event.id }, message: 'Community event submitted for moderation' },
      context.requestId
    );
  }

  // GOVERNANCE: Account type check - listing_member or admin only for regular events
  if (!isListingMember(user)) {
    return createErrorResponse(
      BizError.forbidden('create events', 'events'),
      context.requestId
    );
  }

  // PATTERN: Service initialization from @reference POST /api/listings (lines 102-114)
  const eventService = getEventService();
  const listingService = getListingService();

  try {
    // GOVERNANCE: Verify listing ownership
    const listing = await listingService.getById(body.listing_id);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse(
        BizError.forbidden('create events for this listing', 'listing'),
        context.requestId
      );
    }

    // GOVERNANCE: Tier limit check (SERVER-SIDE) - PATTERN from @reference POST /api/listings
    const tierCheck = await eventService.checkEventLimit(listing.id);
    if (!tierCheck.allowed) {
      return createErrorResponse(
        BizError.badRequest(
          `${tierCheck.tier} tier allows maximum ${tierCheck.limit} events. Upgrade to create more.`,
          { tier: tierCheck.tier, limit: tierCheck.limit }
        ),
        context.requestId
      );
    }

    // Phase 3B: Validate recurring fields
    if (body.is_recurring) {
      // Check tier access for recurring
      const tierAccess = await eventService.checkTierFeatureAccess(listing.id);
      if (!tierAccess.allowRecurring) {
        return createErrorResponse(
          BizError.forbidden('create recurring events', 'tier'),
          context.requestId
        );
      }

      // Community events cannot be recurring
      if (body.is_community_event) {
        return createErrorResponse(
          BizError.badRequest('Community events cannot be recurring'),
          context.requestId
        );
      }

      if (!body.recurrence_type || body.recurrence_type === 'none') {
        return createErrorResponse(
          BizError.badRequest('Recurrence type is required when is_recurring is true'),
          context.requestId
        );
      }

      if (body.recurrence_end_date && new Date(body.recurrence_end_date) <= new Date(body.start_date)) {
        return createErrorResponse(
          BizError.badRequest('Recurrence end date must be after event start date'),
          context.requestId
        );
      }
    }

    // Create event
    const event = await eventService.create(listing.id, {
      title: body.title,
      slug: body.slug,
      description: body.description,
      event_type: body.event_type,
      start_date: body.start_date,
      end_date: body.end_date,
      timezone: body.timezone,
      location_type: body.location_type,
      venue_name: body.venue_name,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      virtual_link: body.virtual_link,
      banner_image: body.banner_image,
      thumbnail: body.thumbnail,
      is_ticketed: body.is_ticketed,
      ticket_price: body.ticket_price,
      total_capacity: body.total_capacity,
      status: body.status,
      is_featured: body.is_featured,
      is_mock: body.is_mock,
      external_ticket_url: body.external_ticket_url,
      age_restrictions: body.age_restrictions,
      parking_notes: body.parking_notes,
      weather_contingency: body.weather_contingency,
      waitlist_enabled: body.waitlist_enabled,
      check_in_enabled: body.check_in_enabled,
      // Phase 3B: Recurring fields
      is_recurring: body.is_recurring,
      recurrence_type: body.recurrence_type,
      recurrence_days: body.recurrence_days,
      recurrence_end_date: body.recurrence_end_date,
    });

    // Phase 3B: Generate initial recurring instances after parent creation
    let instancesGenerated = 0;
    if (body.is_recurring && event.is_recurring) {
      try {
        const instances = await eventService.generateRecurringInstances(event.id);
        instancesGenerated = instances.length;
      } catch (instanceError) {
        // Non-blocking — parent event created successfully, instances can be regenerated via CRON
        console.error('[EventCreate] Failed to generate initial recurring instances:', instanceError);
      }
    }

    return createSuccessResponse(
      {
        event: { id: event.id },
        message: 'Event created successfully',
        instances_generated: instancesGenerated,
      },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('EventService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
}));
