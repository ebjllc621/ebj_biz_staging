/**
 * GET /api/listings/[id]/templates
 * Get all templates for a listing
 *
 * @tier STANDARD
 * @phase Phase 4 - Advanced Features
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  try {
    // Get user from session
    const user = await getUserFromRequest(request);
    if (!user) {
      return createErrorResponse(
        BizError.unauthorized('You must be logged in to view templates'),
        context.requestId
      );
    }

    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const listingIdStr = pathSegments[pathSegments.length - 2] || ''; // -2 because last is "templates"
    const listingId = parseInt(listingIdStr, 10);

    if (isNaN(listingId)) {
      return createErrorResponse(
        BizError.badRequest('Invalid listing ID'),
        context.requestId
      );
    }

    // Initialize services
    const offerService = getOfferService();

    // Get templates
    const templates = await offerService.getListingTemplates(listingId, user.id);

    return createSuccessResponse({ templates }, context.requestId);
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
});
