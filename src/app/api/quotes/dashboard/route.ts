/**
 * Quotes Dashboard API Route
 *
 * GET /api/quotes/dashboard - Get dashboard summary stats
 *
 * @tier STANDARD
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getQuoteService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/quotes/dashboard
 * Get dashboard summary stats for the authenticated user
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const quoteService = getQuoteService();
  const summary = await quoteService.getQuoteDashboardSummary(user.id);

  return createSuccessResponse({ summary }, context.requestId);
});
