/**
 * Admin Alerts API Routes
 * GET /api/admin/alerts - Get all alerts
 * DELETE /api/admin/alerts - Delete all unacknowledged alerts
 *
 * @authority PHASE_6.2_BRAIN_PLAN.md - Section 3.6.5
 * @remediation Phase R2.0.1 - API handler enforcement
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/ServiceRegistry';
import { AlertingService, AlertSeverity } from '@core/services/AlertingService';
import { getAdminActivityService } from '@core/services/AdminActivityService';

async function handleGet(context: ApiContext) {
  const { searchParams } = new URL(context.request.url);
  const severity = searchParams.get('severity') as AlertSeverity | undefined;
  const acknowledged = searchParams.get('acknowledged') === 'true' ? true :
                     searchParams.get('acknowledged') === 'false' ? false :
                     undefined;
  const resolved = searchParams.get('resolved') === 'true' ? true :
                  searchParams.get('resolved') === 'false' ? false :
                  undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

  const db = getDatabaseService();
  const service = new AlertingService(db);

  const alerts = await service.getAllAlerts({
    severity,
    acknowledged,
    resolved,
    limit
  });

  return createSuccessResponse({ alerts });
}

async function handleDelete(context: ApiContext) {
  const db = getDatabaseService();
  const service = new AlertingService(db);

  const deletedCount = await service.deleteAllAlerts();

  getAdminActivityService().logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'alert',
    targetEntityId: null,
    actionType: 'alerts_bulk_deleted',
    actionCategory: 'deletion',
    actionDescription: `Deleted all unacknowledged alerts (${deletedCount} removed)`,
    afterData: { deletedCount },
    severity: 'high',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ deleted: deletedCount });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true,
  trackPerformance: true,
  rbac: {
    action: 'read',
    resource: 'alerts'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
});

export const DELETE = apiHandler(handleDelete, {
  allowedMethods: ['DELETE'],
  requireAuth: true,
  trackPerformance: true,
  rbac: {
    action: 'delete',
    resource: 'alerts'
  },
  rateLimit: {
    requests: 10,
    windowMs: 60000
  }
});
