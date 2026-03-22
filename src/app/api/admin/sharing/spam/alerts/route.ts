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
    const status = searchParams.get('status') as 'pending' | 'reviewed' | 'dismissed' | 'action_taken' | null;
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    const alerts = await analyticsService.getSpamAlerts({
      status: status || undefined,
      severity: severity || undefined,
      limit,
      offset
    });

    return createSuccessResponse({ alerts, total: alerts.length });
  }, {
    requireAuth: true,
    rbac: { action: 'read', resource: 'admin:moderation' }
  })(request);
}
