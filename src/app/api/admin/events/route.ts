/**
 * Admin Events API Route
 *
 * GET /api/admin/events - Get all events with admin features
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Service boundary: EventService
 *
 * @authority CLAUDE.md - API Standards
 * @authority admin-build-map-v2.1.mdc - Admin API patterns
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/events
 * Get all events with optional filters and pagination for admin management
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin events', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const eventType = searchParams.get('event_type');
  const status = searchParams.get('status');
  // Support both 'q' and 'search' param names
  const searchQuery = searchParams.get('q') || searchParams.get('search');
  const id = searchParams.get('id');
  const featured = searchParams.get('featured');

  const filters: Record<string, unknown> = {};
  if (eventType) filters.eventType = eventType;
  if (status) filters.status = status;
  if (searchQuery) filters.searchQuery = searchQuery;
  if (id) {
    const eventId = parseInt(id);
    if (!isNaN(eventId)) filters.id = eventId;
  }
  if (featured === 'true') filters.isFeatured = true;
  if (featured === 'false') filters.isFeatured = false;

  // Parse pagination - support both 'limit' and 'pageSize'
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20');
  const pagination = { page, limit };

  // Initialize services
  const eventService = getEventService();

  // Get events with filters
  const result = await eventService.getAll(filters, pagination);

  return createSuccessResponse({
    events: result.data,
    pagination: result.pagination
  }, 200);
});
