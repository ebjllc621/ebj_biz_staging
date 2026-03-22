/**
 * Admin Connection Pool Stats Endpoint
 *
 * GET /api/admin/database/pool - Get pool statistics and health
 *
 * @phase Phase 4 - Database Health Monitoring
 * @authority DATABASE_SCALING_MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionPoolManager } from '@core/services/ConnectionPoolManager';
import { jsonMethodNotAllowed } from '@/lib/http/json';

/**
 * GET /api/admin/database/pool
 * Returns connection pool statistics and health
 */
async function getPoolHandler(context: ApiContext) {
  const poolManager = getConnectionPoolManager();
  const stats = poolManager.getPoolStats();
  const health = await poolManager.healthCheck();
  const config = poolManager.getConfig();

  return createSuccessResponse({
    stats,
    health: {
      healthy: health.healthy,
      initialized: health.initialized,
      connected: health.connected,
      lastSuccessfulQuery: health.lastSuccessfulQuery?.toISOString() || null,
      errors: health.errors
    },
    config: {
      connectionLimit: config.connectionLimit,
      maxIdle: config.maxIdle,
      idleTimeout: config.idleTimeout,
      queueLimit: config.queueLimit
    }
  }, context.requestId);
}

export const GET = apiHandler(getPoolHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'database_pool'
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
