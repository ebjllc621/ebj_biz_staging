/**
 * Admin Newsletter Statistics API Route
 * GET /api/admin/newsletters/statistics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - bigIntToNumber: ALL COUNT(*) queries
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 2 Content Types - Phase N6
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

// ============================================================================
// GET /api/admin/newsletters/statistics
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin newsletter statistics', 'admin');
  }

  const db = getDatabaseService();

  // --------------------------------------------------------------------------
  // Newsletter stats by status + featured + sent
  // --------------------------------------------------------------------------
  const [newsletterStatusResult, newsletterFeaturedResult, newsletterSentResult] = await Promise.all([
    db.query<StatusCountRow>(
      'SELECT status, COUNT(*) as count FROM content_newsletters GROUP BY status',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_newsletters WHERE is_featured = 1',
      []
    ),
    db.query<CountRow>(
      'SELECT COUNT(*) as count FROM content_newsletters WHERE sent_at IS NOT NULL',
      []
    ),
  ]);

  // Build newsletter stats
  const newsletterStats = {
    total: 0,
    draft: 0,
    scheduled: 0,
    published: 0,
    archived: 0,
    featured: bigIntToNumber(newsletterFeaturedResult.rows?.[0]?.count ?? 0),
  };

  for (const row of newsletterStatusResult.rows ?? []) {
    const n = bigIntToNumber(row.count);
    newsletterStats.total += n;
    if (row.status === 'draft') newsletterStats.draft = n;
    else if (row.status === 'scheduled') newsletterStats.scheduled = n;
    else if (row.status === 'published') newsletterStats.published = n;
    else if (row.status === 'archived') newsletterStats.archived = n;
  }

  // --------------------------------------------------------------------------
  // Subscriber stats by status
  // --------------------------------------------------------------------------
  const subscriberStatusResult = await db.query<StatusCountRow>(
    'SELECT status, COUNT(*) as count FROM newsletter_subscribers GROUP BY status',
    []
  );

  const subscriberStats = {
    total: 0,
    active: 0,
    pending: 0,
    unsubscribed: 0,
    bounced: 0,
  };

  for (const row of subscriberStatusResult.rows ?? []) {
    const n = bigIntToNumber(row.count);
    subscriberStats.total += n;
    if (row.status === 'active') subscriberStats.active = n;
    else if (row.status === 'pending') subscriberStats.pending = n;
    else if (row.status === 'unsubscribed') subscriberStats.unsubscribed = n;
    else if (row.status === 'bounced') subscriberStats.bounced = n;
  }

  // --------------------------------------------------------------------------
  // Delivery stats
  // --------------------------------------------------------------------------
  const deliveryStats = {
    total_sent: bigIntToNumber(newsletterSentResult.rows?.[0]?.count ?? 0),
  };

  return createSuccessResponse({
    statistics: {
      newsletters: newsletterStats,
      subscribers: subscriberStats,
      delivery: deliveryStats,
    },
  });
});
