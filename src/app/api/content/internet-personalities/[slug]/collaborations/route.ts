/**
 * Internet Personality Collaborations API Route
 * GET /api/content/internet-personalities/[slug]/collaborations - Collaborations for a personality
 *
 * @authority Tier3_Phases/PHASE_2_PUBLIC_API_ROUTES.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @phase Tier 3 - Phase 2
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { BizError } from '@core/errors/BizError';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export const GET = apiHandler(async (context: ApiContext, routeParams?: RouteParams) => {
  // Next.js 15 async params
  const params = await routeParams?.params;
  const idParam = params?.slug;

  const personalityId = parseInt(idParam || '');
  if (isNaN(personalityId)) {
    throw BizError.badRequest('Invalid personality ID');
  }

  // Initialize service
  const db = getDatabaseService();
  const personalityService = new InternetPersonalityService(db);

  const collaborations = await personalityService.getCollaborations(personalityId);

  return createSuccessResponse({ collaborations }, context.requestId);
}, {
  allowedMethods: ['GET']
});
