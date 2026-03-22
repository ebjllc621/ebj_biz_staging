/**
 * Admin Connection Groups Analytics API Route
 * GET /api/admin/connections/groups/analytics
 *
 * @phase Phase 4A - Group Analytics
 * @tier ADVANCED
 * @generated ComponentBuilder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);

  if (!user || user.role !== 'admin') {
    throw BizError.forbidden('access admin group analytics');
  }

  const service = getConnectionGroupService();

  const url = new URL(context.request.url);
  const startParam = url.searchParams.get('startDate');
  const endParam = url.searchParams.get('endDate');

  const end = endParam ? new Date(endParam) : new Date();
  const start = startParam
    ? new Date(startParam)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const analytics = await service.getAdminGroupAnalytics({ start, end });

  return createSuccessResponse({ analytics }, context.requestId);
}, {
  requireAuth: true
});
