/**
 * Admin Error Log Single Item API Routes
 * DELETE /api/admin/errors/[id] - Delete a single error log
 *
 * @authority PHASE_6.2_BRAIN_PLAN.md - Section 3.6.3
 * @remediation Phase R2.0.1 - API handler enforcement
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ErrorTrackingService } from '@core/services/ErrorTrackingService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';

async function handleDelete(context: ApiContext) {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const idStr = pathParts[pathParts.length - 1] ?? '';
  const id = parseInt(idStr, 10);

  if (isNaN(id)) {
    throw new BizError({
      code: 'VALIDATION_ERROR',
      message: 'Invalid error ID',
      context: { id: idStr },
      userMessage: 'Invalid error ID provided'
    });
  }

  const db = getDatabaseService();
  const service = new ErrorTrackingService(db);

  const deleted = await service.deleteError(id);

  if (!deleted) {
    throw new BizError({
      code: 'NOT_FOUND',
      message: `Error log not found: ${id}`,
      context: { id },
      userMessage: 'Error log not found'
    });
  }

  getAdminActivityService().logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'error_log',
    targetEntityId: id,
    actionType: 'error_log_deleted',
    actionCategory: 'deletion',
    actionDescription: `Deleted error log #${id}`,
    severity: 'high',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ deleted: true, id });
}

export const DELETE = apiHandler(handleDelete, {
  allowedMethods: ['DELETE'],
  requireAuth: true,
  trackPerformance: true,
  rbac: {
    action: 'delete',
    resource: 'errors'
  },
  rateLimit: {
    requests: 50,
    windowMs: 60000
  }
});
