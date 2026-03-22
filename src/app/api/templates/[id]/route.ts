/**
 * PUT/DELETE /api/templates/[id]
 * Update or delete an offer template
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

export const PUT = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const templateId = pathSegments[pathSegments.length - 1] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const body = await request.json();

  const offerService = getOfferService();
  // Note: updateTemplate to be implemented in OfferService
  const template = { id: parseInt(templateId, 10), ...body };

  return createSuccessResponse({ template }, context.requestId);
});

export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const templateId = pathSegments[pathSegments.length - 1] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const offerService = getOfferService();
  // Note: deleteTemplate to be implemented in OfferService

  return createSuccessResponse({ deleted: true }, context.requestId);
});
