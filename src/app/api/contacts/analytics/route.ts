/**
 * Contact Analytics API Route
 * GET /api/contacts/analytics - Get contact analytics data
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authentication: Required
 * - Response format: createSuccessResponse with explicit keys
 *
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_E_ADVANCED_FEATURES_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/analytics
 * Get contact analytics data
 *
 * Query Parameters:
 * - dateRange (optional): '7d' | '30d' | '90d' | '1y' | 'all' (default: '30d')
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  // Parse query parameters
  const url = new URL(context.request.url);
  const dateRange = (url.searchParams.get('dateRange') || '30d') as import('@features/contacts/types').AnalyticsDateRange;

  // Get analytics
  const analytics = await service.getContactAnalytics(userId, dateRange);

  return createSuccessResponse({
    analytics,
    date_range: dateRange
  }, context.requestId);
}, {
  requireAuth: true
});
