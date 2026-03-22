/**
 * Admin Cache Control Endpoint
 *
 * GET /api/admin/database/cache - Get cache statistics
 * DELETE /api/admin/database/cache - Clear all caches
 *
 * @phase Phase 4 - Database Health Monitoring
 * @authority DATABASE_SCALING_MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getCacheManager } from '@core/cache';
import { jsonMethodNotAllowed } from '@/lib/http/json';

/**
 * GET /api/admin/database/cache
 * Returns cache statistics
 */
async function getCacheHandler(context: ApiContext) {
  const cacheManager = getCacheManager();
  const stats = cacheManager.getStats();
  const health = cacheManager.health();

  return createSuccessResponse({
    ...stats,
    healthy: health.healthy
  }, context.requestId);
}

/**
 * DELETE /api/admin/database/cache
 * Clears all caches (requires confirmation)
 */
async function clearCacheHandler(context: ApiContext) {
  const { request } = context;

  // Require confirmation in request body
  const body = await request.json().catch(() => ({}));
  if (body.confirm !== 'CLEAR_CACHE') {
    return createSuccessResponse({
      cleared: false,
      message: 'Confirmation required. Send { "confirm": "CLEAR_CACHE" } to clear.'
    }, context.requestId);
  }

  const cacheManager = getCacheManager();
  const statsBefore = cacheManager.getStats();

  cacheManager.clearAll();

  const statsAfter = cacheManager.getStats();

  return createSuccessResponse({
    cleared: true,
    entriesCleared: statsBefore.totalSize,
    message: 'All caches cleared successfully',
    statsBefore: {
      sessionCacheSize: statsBefore.sessionCache.size,
      userCacheSize: statsBefore.userCache.size
    },
    statsAfter: {
      sessionCacheSize: statsAfter.sessionCache.size,
      userCacheSize: statsAfter.userCache.size
    }
  }, context.requestId);
}

export const GET = apiHandler(getCacheHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'database_cache'
  }
});

export const DELETE = apiHandler(clearCacheHandler, {
  allowedMethods: ['DELETE'],
  requireAuth: true,
  rbac: {
    action: 'delete',
    resource: 'database_cache'
  }
});

// Method guards
const ALLOWED_METHODS = ['GET', 'DELETE'];

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
