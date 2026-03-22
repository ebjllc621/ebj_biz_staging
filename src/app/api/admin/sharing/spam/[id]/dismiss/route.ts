import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingAnalyticsService } from '@features/contacts/services/SharingAnalyticsService';
import { BizError } from '@core/errors/BizError';
import {
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
    const { reason } = body;

    const db = getDatabaseService();
    const analyticsService = new SharingAnalyticsService(db);

    const userId = parseInt(context.userId || '0');
    await analyticsService.dismissSpamAlert(alertId, userId, reason);

    return createSuccessResponse({ success: true, message: 'Alert dismissed successfully' });
  }, {
    requireAuth: true,
    rbac: { action: 'update', resource: 'admin:moderation' }
  })(request);
}
