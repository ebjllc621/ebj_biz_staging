/**
 * Schema.org JSON-LD API Route
 * GET /api/seo/schema/[entityType]/[entityId] - Get schema.org JSON-LD for entity
 *
 * @authority PHASE_6.3_BRAIN_PLAN.md - Section 3.4.4
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SEOService } from '@core/services/SEOService';

export async function GET(request: NextRequest, context: { params: { entityType: string; entityId: string } }) {
  return apiHandler(async (ctx: ApiContext) => {
    const { entityType, entityId } = context.params;

    const db = getDatabaseService();
    const seoService = new SEOService(db);

    let schema: Record<string, unknown>;

    try {
      if (entityType === 'listing') {
        schema = await seoService.generateLocalBusinessSchema(parseInt(entityId));
      } else if (entityType === 'event') {
        schema = await seoService.generateEventSchema(parseInt(entityId));
      } else if (entityType === 'offer') {
        schema = await seoService.generateOfferSchema(parseInt(entityId));
      } else if (entityType === 'review') {
        schema = await seoService.generateReviewSchema(parseInt(entityId));
      } else {
        return createErrorResponse(`Unsupported entity type: ${entityType}`, 400);
      }

      return createSuccessResponse({ schema }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate schema';
      return createErrorResponse(message, 500);
    }
  })(request);
}
