import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingAnalyticsService } from '@features/contacts/services/SharingAnalyticsService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import {
  SpamActionSchema,
  RecommendationIdSchema,
  validateInput,
  formatValidationErrors
} from '@features/contacts/validation/sharingSchemas';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // Zod validation for ID (TD-008)
    const idValidation = validateInput(RecommendationIdSchema, { id: params.id });
    if (!idValidation.success) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: formatValidationErrors(idValidation.error)
      });
    }

    const alertId = idValidation.data.id;
    const body = await request.json();

    // Zod validation for body (TD-008)
    const bodyValidation = validateInput(SpamActionSchema, body);
    if (!bodyValidation.success) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: formatValidationErrors(bodyValidation.error)
      });
    }

    const { action, notes } = bodyValidation.data;

    const db = getDatabaseService();
    const analyticsService = new SharingAnalyticsService(db);

    const userId = parseInt(context.userId || '0');
    await analyticsService.takeSpamAction(alertId, userId, {
      type: action,
      notes: notes || undefined
    });

    getAdminActivityService().logActivity({
      adminUserId: userId,
      targetEntityType: 'spam_alert',
      targetEntityId: alertId,
      actionType: 'spam_action_taken',
      actionCategory: 'moderation',
      actionDescription: `Took spam action '${action}' on alert #${alertId}`,
      afterData: { alertId, action, notes: notes || null },
      severity: 'normal',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({
      success: true,
      message: `Action '${action}' taken successfully`
    });
  }, {
    requireAuth: true,
    rbac: { action: 'update', resource: 'admin:moderation' }
  })(request);
}
