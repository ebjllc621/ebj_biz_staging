/**
 * Category Search for Interests API
 * GET /api/users/interests/search?q=query - Search categories
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3A_BRAIN_PLAN.md
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserInterestsService } from '@features/profile/services/UserInterestsService';

/**
 * GET /api/users/interests/search
 * Search categories for interests autocomplete
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { searchParams } = new URL(context.request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return createSuccessResponse(
      { categories: [] },
      context.requestId
    );
  }

  const service = getUserInterestsService();
  const categories = await service.searchCategories(query, 15);

  return createSuccessResponse(
    { categories },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
