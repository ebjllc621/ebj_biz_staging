/**
 * Admin Error Status Update API Routes
 * PUT /api/admin/errors/[id]/status - Update error status (acknowledge/resolve)
 *
 * @authority PHASE_6.2_BRAIN_PLAN.md - Section 3.6.4
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ErrorTrackingService, ErrorStatus } from '@core/services/ErrorTrackingService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // TODO: Implement admin authentication check

    const id = parseInt(params.id);
    if (isNaN(id)) {
      throw BizError.badRequest('Invalid error ID');
    }

    const body = await context.request.json();
    const { status, resolvedBy } = body;

    if (!status || !Object.values(ErrorStatus).includes(status)) {
      throw BizError.badRequest('Valid status is required (unresolved, investigating, resolved)');
    }

    const db = getDatabaseService();
    const service = new ErrorTrackingService(db);

    const updatedError = await service.updateErrorStatus(id, status as ErrorStatus, resolvedBy);

    getAdminActivityService().logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'error_log',
      targetEntityId: id,
      actionType: 'error_log_status_updated',
      actionCategory: 'moderation',
      actionDescription: `Updated error log #${id} status to ${status}`,
      afterData: { status, resolvedBy },
      severity: 'normal',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ error: updatedError }, 200);
  })(request);
}
