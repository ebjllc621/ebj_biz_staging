/**
 * Admin SEO Health API Route
 * GET /api/admin/seo/health - Get SEO health scores for all entities
 *
 * @authority PHASE_6.3_BRAIN_PLAN.md - Section 3.4.5
 * @phase Content Phase 4B - SEO Health Extension (content types coverage)
 */

import { NextRequest } from 'next/server';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SEOService, SEOMetadata } from '@core/services/SEOService';
import { bigIntToNumber } from '@core/utils/bigint';

interface ContentEntityRow {
  entity_type: string;
  entity_id: number;
  name: string;
}

interface CountRow {
  cnt: bigint | number;
}

interface MaxDateRow {
  latest: string | null;
}

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    // TODO: Add admin authentication check
    // const session = await getSession(ctx.request);
    // if (!session || session.role !== 'admin') {
    //   throw BizError.unauthorized('Admin access required');
    // }

    const db = getDatabaseService();
    const seoService = new SEOService(db);

    // Get all SEO metadata and all public entities in parallel
    const [allMetadata, contentEntitiesResult, sitemapCountResult, sitemapLatestResult] = await Promise.all([
      seoService.getAllSEOMetadata(),
      db.query<ContentEntityRow>(
        `SELECT 'listing' as entity_type, id as entity_id, name FROM listings WHERE status = 'active'
         UNION ALL
         SELECT 'event', id, title as name FROM events WHERE status = 'published'
         UNION ALL
         SELECT 'offer', id, title as name FROM offers WHERE status = 'active'
         UNION ALL
         SELECT 'article', id, title as name FROM content_articles WHERE status = 'published'
         UNION ALL
         SELECT 'podcast', id, title as name FROM content_podcasts WHERE status = 'published'
         UNION ALL
         SELECT 'video', id, title as name FROM content_videos WHERE status = 'published'`
      ),
      // Real sitemap URL count: matches SEOService.generateSitemap() entity sources
      db.query<CountRow>(
        `SELECT (
           (SELECT COUNT(*) FROM listings WHERE status = 'active') +
           (SELECT COUNT(*) FROM categories) +
           (SELECT COUNT(*) FROM events WHERE status = 'published') +
           (SELECT COUNT(*) FROM job_postings WHERE status = 'active') +
           (SELECT COUNT(*) FROM content_guides WHERE status = 'published')
         ) as cnt`
      ),
      // Most recent update across sitemap-eligible tables as proxy for "last generated"
      db.query<MaxDateRow>(
        `SELECT GREATEST(
           COALESCE((SELECT MAX(updated_at) FROM listings WHERE status = 'active'), '2000-01-01'),
           COALESCE((SELECT MAX(updated_at) FROM categories), '2000-01-01'),
           COALESCE((SELECT MAX(updated_at) FROM events WHERE status = 'published'), '2000-01-01'),
           COALESCE((SELECT MAX(updated_at) FROM job_postings WHERE status = 'active'), '2000-01-01'),
           COALESCE((SELECT MAX(updated_at) FROM content_guides WHERE status = 'published'), '2000-01-01')
         ) as latest`
      ),
    ]);

    // Build lookup of real entity names from source tables (NOT from seo_metadata)
    const entityNameLookup = new Map<string, string>();
    for (const row of contentEntitiesResult.rows) {
      entityNameLookup.set(`${row.entity_type}:${row.entity_id}`, row.name);
    }

    // Build a lookup set of existing seo_metadata entries
    const metadataLookup = new Set(
      allMetadata.map(m => `${m.entityType}:${m.entityId}`)
    );

    // Calculate health scores ONLY for seo_metadata entries that reference real entities
    const entityHealthPromises = allMetadata
      .filter(metadata => entityNameLookup.has(`${metadata.entityType}:${metadata.entityId}`))
      .map(async (metadata: SEOMetadata) => {
        const score = await seoService.calculateSEOScore(
          metadata.entityType,
          metadata.entityId
        );

        // Use REAL entity name from source table, not meta_title from seo_metadata
        const realName = entityNameLookup.get(`${metadata.entityType}:${metadata.entityId}`)!;

        return {
          entityType: metadata.entityType,
          entityId: metadata.entityId,
          name: realName,
          score: score.score,
          grade: score.grade,
          issues: score.issues
        };
      });

    const entityHealth = await Promise.all(entityHealthPromises);

    // Count orphaned seo_metadata records (reference non-existent entities)
    const orphanedMetadata = allMetadata.filter(
      m => !entityNameLookup.has(`${m.entityType}:${m.entityId}`)
    );

    // Add entities WITHOUT seo_metadata (score 0 / grade F)
    const contentWithoutMetadata = contentEntitiesResult.rows.filter(
      row => !metadataLookup.has(`${row.entity_type}:${row.entity_id}`)
    );

    for (const contentItem of contentWithoutMetadata) {
      entityHealth.push({
        entityType: contentItem.entity_type,
        entityId: contentItem.entity_id,
        name: contentItem.name,
        score: 0,
        grade: 'F',
        issues: ['No SEO metadata configured'],
      });
    }

    // Calculate aggregate statistics from REAL entities only
    const totalEntities = entityHealth.length;
    const averageScore = totalEntities > 0
      ? entityHealth.reduce((sum, e) => sum + e.score, 0) / totalEntities
      : 0;

    // Grade distribution
    const gradeDistribution = [
      { grade: 'A', count: entityHealth.filter(e => e.grade === 'A').length },
      { grade: 'B', count: entityHealth.filter(e => e.grade === 'B').length },
      { grade: 'C', count: entityHealth.filter(e => e.grade === 'C').length },
      { grade: 'F', count: entityHealth.filter(e => e.grade === 'F').length }
    ];

    // Count of content items without any SEO metadata
    const entitiesWithoutMetadata = contentWithoutMetadata.length;

    // Sitemap info from real DB counts (matches SEOService.generateSitemap() sources)
    const sitemapUrlCount = bigIntToNumber(sitemapCountResult.rows[0]?.cnt ?? 0);
    const sitemapLastGenerated = sitemapLatestResult.rows[0]?.latest
      ? new Date(sitemapLatestResult.rows[0].latest).toISOString()
      : null;

    const healthData = {
      totalEntities,
      averageScore: Math.round(averageScore),
      gradeDistribution,
      entitiesWithoutMetadata,
      orphanedMetadataCount: orphanedMetadata.length,
      sitemapLastGenerated,
      sitemapUrlCount,
      entityHealth: entityHealth.slice(0, 50) // Limit to 50 for performance
    };

    return createSuccessResponse({ healthData }, 200);
  })(request);
}
