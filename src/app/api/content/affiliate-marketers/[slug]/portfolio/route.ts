/**
 * Affiliate Marketer Portfolio API Route
 * GET /api/content/affiliate-marketers/[slug]/portfolio - Portfolio items for a marketer
 *
 * @authority Tier3_Phases/PHASE_2_PUBLIC_API_ROUTES.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @phase Tier 3 - Phase 2
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { BizError } from '@core/errors/BizError';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export const GET = apiHandler(async (context: ApiContext, routeParams?: RouteParams) => {
  // Next.js 15 async params
  const params = await routeParams?.params;
  const idParam = params?.slug;

  const marketerId = parseInt(idParam || '');
  if (isNaN(marketerId)) {
    throw BizError.badRequest('Invalid marketer ID');
  }

  // Initialize service
  const db = getDatabaseService();
  const marketerService = new AffiliateMarketerService(db);

  const portfolio = await marketerService.getPortfolio(marketerId);

  return createSuccessResponse({ portfolio }, context.requestId);
}, {
  allowedMethods: ['GET']
});
