/**
 * SEO Metadata API Routes
 * GET /api/seo/[entityType]/[entityId] - Get SEO metadata for entity
 * POST /api/seo/[entityType]/[entityId] - Save SEO metadata for entity
 *
 * @authority PHASE_6.3_BRAIN_PLAN.md - Section 3.4.1 & 3.4.2
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

    const metadata = await seoService.getMetaTags(entityType, parseInt(entityId));

    if (!metadata) {
      return createErrorResponse('SEO metadata not found', 404);
    }

    return createSuccessResponse({ metadata }, 200);
  })(request);
}

export async function POST(request: NextRequest, context: { params: { entityType: string; entityId: string } }) {
  return apiHandler(async (ctx: ApiContext) => {
    const { entityType, entityId } = context.params;
    const body = await ctx.request.json();

    const db = getDatabaseService();
    const seoService = new SEOService(db);

    const metadata = await seoService.saveMetaTags(
      entityType,
      parseInt(entityId),
      body
    );

    return createSuccessResponse({ metadata }, 200);
  })(request);
}
