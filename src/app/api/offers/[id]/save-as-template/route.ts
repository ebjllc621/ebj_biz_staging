/**
 * POST /api/offers/[id]/save-as-template
 * Save offer as template
 *
 * @tier STANDARD
 * @phase Phase 4 - Advanced Features
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  try {
    // Get user from session
    const user = await getUserFromRequest(request);
    if (!user) {
      return createErrorResponse(
        BizError.unauthorized('You must be logged in to save templates'),
        context.requestId
      );
    }

    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const offerIdStr = pathSegments[pathSegments.length - 2] || ''; // -2 because last is "save-as-template"
    const offerId = parseInt(offerIdStr, 10);

    if (isNaN(offerId)) {
      return createErrorResponse(
        BizError.badRequest('Invalid offer ID'),
        context.requestId
      );
    }

    // Parse request body
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return createErrorResponse(
        BizError.badRequest('Template name is required'),
        context.requestId
      );
    }

    // Initialize services
    const offerService = getOfferService();

    // Save as template
    const template = await offerService.saveAsTemplate(offerId, user.id, name);

    return createSuccessResponse(
      { template },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
}));
