/**
 * Sitemap Regeneration API Route
 * POST /api/seo/sitemap/regenerate - Trigger sitemap regeneration
 *
 * @authority PHASE_6.3_BRAIN_PLAN.md - Section 3.5 (referenced in dashboard)
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SEOService } from '@core/services/SEOService';

export async function POST(request: NextRequest) {
  return apiHandler(async (ctx: ApiContext) => {
    // TODO: Add admin authentication check
    // const session = await getSession(ctx.request);
    // if (!session || session.role !== 'admin') {
    //   throw BizError.unauthorized('Admin access required');
    // }

    const db = getDatabaseService();
    const seoService = new SEOService(db);

    // Generate new sitemap
    const sitemap = await seoService.generateSitemap();

    // Count URLs in sitemap
    const urlCount = (sitemap.match(/<url>/g) || []).length;

    return createSuccessResponse({
      message: 'Sitemap regenerated successfully',
      urlCount,
      timestamp: new Date().toISOString()
    }, 200);
  })(request);
}
