/**
 * Admin Content Statistics API Route
 * GET /api/admin/content/statistics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - bigIntToNumber: ALL COUNT(*) queries
 *
 * @authority CLAUDE.md - API Standards
 * @phase Content Phase 4A
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Types
// ============================================================================

interface StatusCountRow {
  status: string;
  count: bigint | number;
}

interface CountRow {
  count: bigint | number;
}

interface ContentTypeStat {
  total: number;
  draft: number;
  pending: number;
  published: number;
  archived: number;
  featured: number;
  sponsored: number;
}

// ============================================================================
// Helper: aggregate status rows into counts
// ============================================================================

function buildContentTypeStat(
  statusRows: StatusCountRow[],
  featuredCount: number,
  sponsoredCount: number
): ContentTypeStat {
  const stat: ContentTypeStat = {
    total: 0,
    draft: 0,
    pending: 0,
    published: 0,
    archived: 0,
    featured: featuredCount,
    sponsored: sponsoredCount,
  };

  for (const row of statusRows) {
    const n = bigIntToNumber(row.count);
    stat.total += n;
    if (row.status === 'draft') stat.draft = n;
    else if (row.status === 'pending') stat.pending = n;
    else if (row.status === 'published') stat.published = n;
    else if (row.status === 'archived') stat.archived = n;
  }

  return stat;
}

// ============================================================================
// GET /api/admin/content/statistics
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin content statistics', 'admin');
  }

  const db = getDatabaseService();

  // --------------------------------------------------------------------------
  // Articles stats
  // --------------------------------------------------------------------------
  const [articleStatusResult, articleFeaturedResult, articleSponsoredResult] = await Promise.all([
    db.query<StatusCountRow>(
      'SELECT status, COUNT(*) as count FROM content_articles GROUP BY status',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_articles WHERE is_featured = 1',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_articles WHERE is_sponsored = 1',
      []
    ),
  ]);

  const articleStats = buildContentTypeStat(
    articleStatusResult.rows ?? [],
    bigIntToNumber(articleFeaturedResult.rows?.[0]?.count ?? 0),
    bigIntToNumber(articleSponsoredResult.rows?.[0]?.count ?? 0)
  );

  // --------------------------------------------------------------------------
  // Podcasts stats
  // --------------------------------------------------------------------------
  const [podcastStatusResult, podcastFeaturedResult, podcastSponsoredResult] = await Promise.all([
    db.query<StatusCountRow>(
      'SELECT status, COUNT(*) as count FROM content_podcasts GROUP BY status',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_podcasts WHERE is_featured = 1',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_podcasts WHERE is_sponsored = 1',
      []
    ),
  ]);

  const podcastStats = buildContentTypeStat(
    podcastStatusResult.rows ?? [],
    bigIntToNumber(podcastFeaturedResult.rows?.[0]?.count ?? 0),
    bigIntToNumber(podcastSponsoredResult.rows?.[0]?.count ?? 0)
  );

  // --------------------------------------------------------------------------
  // Videos stats
  // --------------------------------------------------------------------------
  const [videoStatusResult, videoFeaturedResult, videoSponsoredResult] = await Promise.all([
    db.query<StatusCountRow>(
      'SELECT status, COUNT(*) as count FROM content_videos GROUP BY status',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_videos WHERE is_featured = 1',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_videos WHERE is_sponsored = 1',
      []
    ),
  ]);

  const videoStats = buildContentTypeStat(
    videoStatusResult.rows ?? [],
    bigIntToNumber(videoFeaturedResult.rows?.[0]?.count ?? 0),
    bigIntToNumber(videoSponsoredResult.rows?.[0]?.count ?? 0)
  );

  // --------------------------------------------------------------------------
  // Comments stats
  // --------------------------------------------------------------------------
  const commentStatusResult = await db.query<StatusCountRow>(
    'SELECT status, COUNT(*) as count FROM content_comments GROUP BY status',
    []
  );

  const commentStats = { total: 0, active: 0, hidden: 0, deleted: 0 };
  for (const row of commentStatusResult.rows ?? []) {
    const n = bigIntToNumber(row.count);
    commentStats.total += n;
    if (row.status === 'active') commentStats.active = n;
    else if (row.status === 'hidden') commentStats.hidden = n;
    else if (row.status === 'deleted') commentStats.deleted = n;
  }

  // --------------------------------------------------------------------------
  // Reports stats
  // --------------------------------------------------------------------------
  const [reportsTotal, reportsPending] = await Promise.all([
    db.query<CountRow>(
      "SELECT COUNT(*) as count FROM admin_activity WHERE action_type = 'content_report'",
      []
    ),
    db.query<CountRow>(
      "SELECT COUNT(*) as count FROM admin_activity WHERE action_type = 'content_report' AND approved_by IS NULL",
      []
    ),
  ]);

  const reportStats = {
    total: bigIntToNumber(reportsTotal.rows?.[0]?.count ?? 0),
    pending: bigIntToNumber(reportsPending.rows?.[0]?.count ?? 0),
  };

  return createSuccessResponse({
    statistics: {
      articles: articleStats,
      podcasts: podcastStats,
      videos: videoStats,
      comments: commentStats,
      reports: reportStats,
    },
  });
});
