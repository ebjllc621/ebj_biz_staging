/**
 * Admin Database Health Detailed Endpoint
 *
 * GET /api/admin/database/health
 * Returns comprehensive database health metrics with alert evaluation
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Full health metrics for dashboard display
 * - Alert threshold evaluation
 *
 * @phase Phase 4 - Database Health Monitoring
 * @authority DATABASE_SCALING_MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseHealthService } from '@core/services/DatabaseHealthService';
import { jsonMethodNotAllowed } from '@/lib/http/json';

/**
 * GET /api/admin/database/health
 * Returns comprehensive database health with alerts
 *
 * NOTE: Error persistence is now initialized automatically at pool startup
 * in ConnectionPoolManager.initializeErrorPersistenceEarly() - no manual init needed here
 */
async function getHealthHandler(context: ApiContext) {
  const healthService = getDatabaseHealthService();
  const health = await healthService.getDetailedHealth();

  // Optionally create persistent alerts for critical issues
  if (health.activeAlerts.some(a => a.level === 'critical')) {
    await healthService.createAlertsForThresholdViolations(health);
  }

  return createSuccessResponse({ ...health }, context.requestId);
}

export const GET = apiHandler(getHealthHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'database_health'
  },
  rateLimit: {
    requests: 60,
    windowMs: 60000
  }
});

// Method guards
const ALLOWED_METHODS = ['GET'];

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
