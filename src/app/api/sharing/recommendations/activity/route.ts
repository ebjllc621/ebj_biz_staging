/**
 * GET /api/sharing/recommendations/activity
 * Recommendation Activity Log - unified activity feed with points ledger
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const sharingService = new SharingService(db);
  const userId = parseInt(context.userId!, 10);

  try {
    const url = new URL(context.request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '20', 10);
    const filter = (url.searchParams.get('filter') || 'all') as 'all' | 'sent' | 'received' | 'points';
    const entityType = url.searchParams.get('entity_type') || undefined;
    const includePoints = url.searchParams.get('include_points') !== 'false';

    // Fetch activity log and optionally points ledger in parallel
    const [activityResult, pointsLedger, impactStats] = await Promise.all([
      sharingService.getActivityLog(userId, {
        page,
        per_page: perPage,
        filter,
        entity_type: entityType
      }),
      includePoints ? sharingService.getPointsLedger(userId) : null,
      includePoints ? sharingService.getImpactStats(userId) : null
    ]);

    return createSuccessResponse({
      activity: activityResult.items,
      total: activityResult.total,
      page: activityResult.page,
      per_page: activityResult.per_page,
      total_pages: activityResult.total_pages,
      ...(pointsLedger ? { points_ledger: pointsLedger } : {}),
      ...(impactStats ? { impact_stats: impactStats } : {})
    }, context.requestId);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }
    console.error('[GET /api/sharing/recommendations/activity] Error:', error);
    return createErrorResponse(
      new BizError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch activity log' }),
      context.requestId
    );
  }
}, { requireAuth: true });
