/**
 * GET /api/admin/sharing/metrics/funnel
 *
 * Get funnel metrics (sent → viewed → rated → helpful → thanked)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - DatabaseService boundary: Service layer only
 * - Admin authentication: Required
 * - Response format: createSuccessResponse
 *
 * @phase Phase 10 - Analytics & Admin Dashboard
 * @authority docs/components/connections/userrecommendations/phases/PHASE_10_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingAnalyticsService } from '@features/contacts/services/SharingAnalyticsService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return apiHandler(async (context: ApiContext) => {
    const db = getDatabaseService();
    const analyticsService = new SharingAnalyticsService(db);

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'day' | 'week' | 'month') || 'week';

    const funnel = await analyticsService.getFunnelMetrics(period);

    return createSuccessResponse(funnel);
  }, {
    requireAuth: true,
    rbac: { action: 'read', resource: 'admin:analytics' }
  })(request);
}
