import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingAnalyticsService } from '@features/contacts/services/SharingAnalyticsService';
import { BizError } from '@core/errors/BizError';
import {
  DateRangeQuerySchema,
  validateInput,
  formatValidationErrors
} from '@features/contacts/validation/sharingSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return apiHandler(async (context: ApiContext) => {
    const db = getDatabaseService();
    const analyticsService = new SharingAnalyticsService(db);

    const { searchParams } = new URL(request.url);
    const queryParams = {
      from_date: searchParams.get('from_date'),
      to_date: searchParams.get('to_date')
    };

    // Zod validation (TD-008)
    const validation = validateInput(DateRangeQuerySchema, queryParams);
    if (!validation.success) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: formatValidationErrors(validation.error)
      });
    }

    const { from_date, to_date } = validation.data;

    let period: { from: Date; to: Date } | undefined;
    if (from_date && to_date) {
      period = {
        from: new Date(from_date),
        to: new Date(to_date)
      };
    }

    const quality = await analyticsService.getQualityMetrics(period);

    return createSuccessResponse(quality);
  }, {
    requireAuth: true,
    rbac: { action: 'read', resource: 'admin:analytics' }
  })(request);
}
