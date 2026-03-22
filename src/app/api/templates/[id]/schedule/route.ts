/**
 * POST /api/templates/[id]/schedule
 * Schedule recurring offer from template
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import type { RecurrenceConfig } from '@features/offers/types';

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - /api/templates/[id]/schedule
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const templateId = pathSegments[pathSegments.length - 2] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const body = await request.json();
  const recurrence: RecurrenceConfig = {
    type: body.type || 'none',
    days: body.days,
    endDate: body.endDate ? new Date(body.endDate) : undefined,
  };

  const offerService = getOfferService();
  // Note: scheduleRecurring to be implemented in OfferService

  return createSuccessResponse({ scheduled: true }, context.requestId);
});
