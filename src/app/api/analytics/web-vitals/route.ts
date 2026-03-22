/**
 * Web Vitals Analytics API Endpoint
 *
 * @api POST /api/analytics/web-vitals
 * @tier SIMPLE
 * @phase Phase 9 - Performance & SEO
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/admin-api-route-standard.mdc
 *
 * Features:
 * - Receives Core Web Vitals metrics from client
 * - Stores metrics in database (future implementation)
 * - Returns success response
 * - No authentication required (public analytics)
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_9_BRAIN_PLAN.md
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ErrorService } from '@core/services/ErrorService';

interface WebVitalMetric {
  metric: string;
  value: number;
  id: string;
  page: string;
  timestamp: number;
}

/**
 * POST /api/analytics/web-vitals
 * Store Web Vitals metrics
 */
export const POST = apiHandler(async (context: ApiContext) => {
  try {
    const body = await context.request.json() as WebVitalMetric;

    const { metric, value, id, page, timestamp } = body;

    // Validate required fields
    if (!metric || value === undefined || !id || !page || !timestamp) {
      throw BizError.badRequest('Missing required fields: metric, value, id, page, timestamp');
    }

    // TODO: Store in database for analytics
    // Implementation pending: Create web_vitals table
    // await DatabaseService.execute(
    //   `INSERT INTO web_vitals (metric, value, metric_id, page, timestamp, created_at)
    //    VALUES (?, ?, ?, ?, ?, NOW())`,
    //   [metric, value, id, page, new Date(timestamp)]
    // );

    // For now, just log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${metric}: ${value} (${page})`);
    }

    return createSuccessResponse({ stored: true }, context.requestId);
  } catch (error) {
    ErrorService.capture('Web Vitals API error:', error);
    throw BizError.internalServerError('WebVitalsAPI', error instanceof Error ? error : undefined);
  }
}, {
  allowedMethods: ['POST']
});
