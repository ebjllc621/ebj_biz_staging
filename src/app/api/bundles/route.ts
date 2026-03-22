/**
 * GET /api/bundles
 * Get all active bundles (public)
 *
 * @tier STANDARD
 * @phase Phase 4 - Advanced Features
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  try {
    // Parse pagination parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    if (page < 1 || limit < 1 || limit > 100) {
      return createErrorResponse(
        BizError.badRequest('Invalid pagination parameters'),
        context.requestId
      );
    }

    // Initialize services
    const offerService = getOfferService();

    // Get bundles
    const result = await offerService.getBundles({ page, limit });

    return createSuccessResponse(
      {
        items: result.data,
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages
      },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
});
