/**
 * Admin Guide Statistics API Route
 * GET /api/admin/guides/statistics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - bigIntToNumber: ALL COUNT(*) queries
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 2 Content Types - Phase G7
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

interface DifficultyCountRow {
  difficulty_level: string;
  count: bigint | number;
}

interface CountRow {
  count: bigint | number;
}

interface EngagementRow {
  total_completions: bigint | number | null;
  total_views: bigint | number | null;
}

interface ProgressCountRow {
  count: bigint | number;
}

// ============================================================================
// GET /api/admin/guides/statistics
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin guide statistics', 'admin');
  }

  const db = getDatabaseService();

  // --------------------------------------------------------------------------
  // Guide stats by status + featured
  // --------------------------------------------------------------------------
  const [guideStatusResult, guideFeaturedResult] = await Promise.all([
    db.query<StatusCountRow>(
      'SELECT status, COUNT(*) as count FROM content_guides GROUP BY status',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_guides WHERE is_featured = 1',
      []
    ),
  ]);

  // Build guide stats
  const guideStats = {
    total: 0,
    draft: 0,
    scheduled: 0,
    published: 0,
    archived: 0,
    featured: bigIntToNumber(guideFeaturedResult.rows?.[0]?.count ?? 0),
  };

  for (const row of guideStatusResult.rows ?? []) {
    const n = bigIntToNumber(row.count);
    guideStats.total += n;
    if (row.status === 'draft') guideStats.draft = n;
    else if (row.status === 'scheduled') guideStats.scheduled = n;
    else if (row.status === 'published') guideStats.published = n;
    else if (row.status === 'archived') guideStats.archived = n;
  }

  // --------------------------------------------------------------------------
  // Difficulty breakdown
  // --------------------------------------------------------------------------
  const difficultyResult = await db.query<DifficultyCountRow>(
    'SELECT difficulty_level, COUNT(*) as count FROM content_guides GROUP BY difficulty_level',
    []
  );

  const difficultyStats = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  };

  for (const row of difficultyResult.rows ?? []) {
    const n = bigIntToNumber(row.count);
    if (row.difficulty_level === 'beginner') difficultyStats.beginner = n;
    else if (row.difficulty_level === 'intermediate') difficultyStats.intermediate = n;
    else if (row.difficulty_level === 'advanced') difficultyStats.advanced = n;
  }

  // --------------------------------------------------------------------------
  // Engagement stats (views, completions, sections, progress)
  // --------------------------------------------------------------------------
  const [engagementResult, sectionCountResult, inProgressResult, completedResult] = await Promise.all([
    db.query<EngagementRow>(
      'SELECT SUM(completion_count) as total_completions, SUM(view_count) as total_views FROM content_guides',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_guide_sections',
      []
    ),
    db.query<ProgressCountRow>(
      'SELECT COUNT(*) as count FROM content_guide_progress WHERE is_completed = 0',
      []
    ),
    db.query<ProgressCountRow>(
      'SELECT COUNT(*) as count FROM content_guide_progress WHERE is_completed = 1',
      []
    ),
  ]);

  const engagementRow = engagementResult.rows?.[0];
  const engagementStats = {
    total_views: bigIntToNumber(engagementRow?.total_views ?? 0),
    total_completions: bigIntToNumber(engagementRow?.total_completions ?? 0),
    total_sections: bigIntToNumber(sectionCountResult.rows?.[0]?.count ?? 0),
    users_in_progress: bigIntToNumber(inProgressResult.rows?.[0]?.count ?? 0),
    users_completed: bigIntToNumber(completedResult.rows?.[0]?.count ?? 0),
  };

  return createSuccessResponse({
    statistics: {
      guides: guideStats,
      difficulty: difficultyStats,
      engagement: engagementStats,
    },
  });
});
