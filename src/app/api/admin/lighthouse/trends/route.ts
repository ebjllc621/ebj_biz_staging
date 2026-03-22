/**
 * Admin Lighthouse Trends API - Trend Analysis
 *
 * GET /api/admin/lighthouse/trends?category=public&days=30
 * Returns trend analysis for a category.
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @governance apiHandler wrapper, admin auth required
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { LighthouseRunnerService } from '@core/services/LighthouseRunnerService';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(
  async (context: ApiContext) => {
    const { searchParams } = new URL(context.request.url);
    const category = searchParams.get('category') || 'public';
    const days = parseInt(searchParams.get('days') || '30');

    // Validation
    if (!['public', 'dashboard', 'admin'].includes(category)) {
      return createErrorResponse('Valid category is required (public, dashboard, admin)', 400);
    }

    if (days < 1 || days > 365) {
      return createErrorResponse('Days must be between 1 and 365', 400);
    }

    try {
      const service = new LighthouseRunnerService();
      const trends = await service.getTrends(category, days);

      if (!trends) {
        return createSuccessResponse({
          trends: null,
          message: 'Insufficient data for trend analysis',
        });
      }

      return createSuccessResponse({
        trends,
        message: 'Trend analysis completed successfully',
      });
    } catch (error: any) {
      return createErrorResponse(
        `Trend analysis failed: ${error.message}`,
        500
      );
    }
  },
  {
    requireAuth: true,
  }
);
