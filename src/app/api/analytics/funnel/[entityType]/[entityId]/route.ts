/**
 * GET /api/analytics/funnel/[entityType]/[entityId] - Get funnel data
 *
 * Returns funnel stage counts and conversion rates for any entity type.
 * Supports optional date range via ?start= and ?end= query params.
 * Auth required — listing owner or admin only.
 *
 * @tier STANDARD
 * @phase Phase 1B - Entity-Agnostic Services & UI Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_1B_BRAIN_PLAN.md
 * @reference src/app/api/listings/[id]/shares/route.ts - apiHandler pattern
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getEngagementFunnelService } from '@core/services/EngagementFunnelService';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(BizError.unauthorized('Authentication required'), 401);
  }

  // Extract route params from URL pathname
  // Path: /api/analytics/funnel/[entityType]/[entityId]
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // segments: ['', 'api', 'analytics', 'funnel', entityType, entityId]
  const entityType = pathSegments[pathSegments.length - 2] || '';
  const entityIdStr = pathSegments[pathSegments.length - 1] || '';
  const entityId = parseInt(entityIdStr, 10);

  if (!entityType) {
    return createErrorResponse(BizError.badRequest('entityType is required'), 400);
  }

  if (isNaN(entityId)) {
    return createErrorResponse(BizError.badRequest('Invalid entity ID'), 400);
  }

  // Parse optional date range
  let dateRange: { start: Date; end: Date } | undefined;
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  if (startParam && endParam) {
    const start = new Date(startParam);
    const end = new Date(endParam);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return createErrorResponse(BizError.badRequest('Invalid date range'), 400);
    }

    dateRange = { start, end };
  }

  const service = getEngagementFunnelService();
  const funnelData = await service.getFunnelData(entityType, entityId, dateRange);

  return createSuccessResponse(
    {
      stages: funnelData.stages,
      overall_conversion_rate: funnelData.overall_conversion_rate,
      total_events: funnelData.total_events,
      date_range: funnelData.date_range,
    },
    200
  );
});
