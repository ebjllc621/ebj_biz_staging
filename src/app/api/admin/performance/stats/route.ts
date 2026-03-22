/**
 * Admin Performance Statistics API Routes
 * GET /api/admin/performance/stats - Get aggregate performance statistics
 *
 * @authority PHASE_6.2_BRAIN_PLAN.md - Section 3.6.2
 * @remediation Phase R2.0.1 - API handler enforcement
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { PerformanceMonitoringService } from '@core/services/PerformanceMonitoringService';

async function handleGet(context: ApiContext) {
const { searchParams } = new URL(context.request.url);
    const hours = parseInt(searchParams.get('hours') || '24');

    const db = getDatabaseService();
    const service = new PerformanceMonitoringService(db);

    const end = new Date();
    const start = new Date(end.getTime() - (hours * 60 * 60 * 1000));

    const stats = await service.getAggregateStats({ start, end });

    return createSuccessResponse({ stats });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true,
  trackPerformance: true,
  rbac: {
    action: 'read',
    resource: 'resource'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
});
