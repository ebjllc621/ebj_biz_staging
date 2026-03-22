/**
 * Unified Creators API Route
 * GET /api/content/creators - Returns newest creator profiles across all types
 *
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

interface CreatorSummary {
  id: number;
  profile_type: 'affiliate_marketer' | 'internet_personality' | 'podcaster';
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
  location: string | null;
  rating: number | null;
  review_count: number;
  slug: string;
  created_at: string;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '3'), 20);

  const db = getDatabaseService();

  // Query all 3 creator profile tables, UNION, sort by newest, limit
  const result = await db.query<{
    id: number;
    profile_type: string;
    display_name: string;
    headline: string | null;
    profile_image: string | null;
    location: string | null;
    rating_average: string | number | null;
    rating_count: number;
    slug: string;
    created_at: string;
  }>(
    `(
      SELECT id, 'affiliate_marketer' as profile_type, display_name, headline,
             profile_image, location, rating_average, rating_count, slug, created_at
      FROM content_affiliate_marketers
      WHERE status = 'active'
    )
    UNION ALL
    (
      SELECT id, 'internet_personality' as profile_type, display_name, headline,
             profile_image, location, rating_average, rating_count, slug, created_at
      FROM content_internet_personalities
      WHERE status = 'active'
    )
    UNION ALL
    (
      SELECT id, 'podcaster' as profile_type, display_name, headline,
             profile_image, location, rating_average, rating_count, slug, created_at
      FROM content_podcasters
      WHERE status = 'active'
    )
    ORDER BY created_at DESC
    LIMIT ?`,
    [limit]
  );

  const creators: CreatorSummary[] = result.rows.map((row) => ({
    id: bigIntToNumber(row.id),
    profile_type: row.profile_type as CreatorSummary['profile_type'],
    display_name: row.display_name,
    headline: row.headline,
    avatar_url: row.profile_image,
    location: row.location,
    rating: row.rating_average != null ? Number(row.rating_average) : null,
    review_count: bigIntToNumber(row.rating_count),
    slug: row.slug,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString(),
  }));

  return createSuccessResponse({ creators }, context.requestId);
}, { requireAuth: false });
