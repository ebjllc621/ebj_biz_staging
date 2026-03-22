/**
 * Sitemap XML Generation API Route
 * GET /api/seo/sitemap - Generate sitemap.xml
 *
 * @authority PHASE_6.3_BRAIN_PLAN.md - Section 3.4.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SEOService } from '@core/services/SEOService';

export async function GET(request: NextRequest) {
  return apiHandler(async (ctx: ApiContext) => {
    const db = getDatabaseService();
    const seoService = new SEOService(db);

    const sitemap = await seoService.generateSitemap();

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  })(request);
}
