/**
 * Admin Performance Metrics API Routes
 * GET /api/admin/performance/metrics - Get performance metrics with time range filter
 *
 * @authority PHASE_6.2_BRAIN_PLAN.md - Section 3.6.1
 * @remediation Phase R2.0.1 - API handler enforcement
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { PerformanceMonitoringService, MetricType } from '@core/services/PerformanceMonitoringService';

async function handleGet(context: ApiContext) {
  const { searchParams } = new URL(context.request.url);
  const type = (searchParams.get('type') || 'api_response') as MetricType;
  const hours = parseInt(searchParams.get('hours') || '24');

  const db = getDatabaseService();
  const service = new PerformanceMonitoringService(db);

  const end = new Date();
  const start = new Date(end.getTime() - (hours * 60 * 60 * 1000));

  const metrics = await service.getMetrics(type, { start, end });

  return createSuccessResponse({ metrics });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true,
  trackPerformance: true,
  rbac: {
    action: 'read',
    resource: 'performance_metrics'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
});
