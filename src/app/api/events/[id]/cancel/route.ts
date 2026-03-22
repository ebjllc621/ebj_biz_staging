/**
 * Event Cancel API Route
 * PATCH /api/events/[id]/cancel - Cancel event
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * PATCH /api/events/[id]/cancel
 * Cancel event (sets status to 'cancelled')
 *
 * @authenticated User authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract event ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'cancel')

  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  const eventService = getEventService();
  const event = await eventService.cancel(eventId);

  return createSuccessResponse({ event }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH']
}));
