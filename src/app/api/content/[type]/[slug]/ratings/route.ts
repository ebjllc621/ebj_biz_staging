/**
 * Content Rating API Routes
 * GET  /api/content/[type]/[slug]/ratings — Public aggregate + optional user rating
 * POST /api/content/[type]/[slug]/ratings — Auth required, submit/update rating
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing POST
 * - getUserFromRequest: Optional for GET (public), required for POST
 * - bigIntToNumber: MANDATORY for all COUNT/AVG queries
 *
 * Supported content types:
 *   article, video → binary mode (is_helpful)
 *   guide, podcast  → star mode (rating 1-5)
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 5 - Content Ratings
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import { awardReviewPoints } from '@core/utils/review-rewards';

type ContentType = 'article' | 'guide' | 'video' | 'podcast';
type RatingMode = 'binary' | 'star';

const VALID_CONTENT_TYPES: ContentType[] = ['article', 'guide', 'video', 'podcast'];

const RATING_MODE_MAP: Record<ContentType, RatingMode> = {
  article: 'binary',
  video: 'binary',
  guide: 'star',
  podcast: 'star',
};

function extractPathParams(requestUrl: string): { contentType: string; contentId: number } {
  const url = new URL(requestUrl);
  const segments = url.pathname.split('/');
  // Path: /api/content/[contentType]/[contentId]/ratings
  // segments: ['', 'api', 'content', contentType, contentId, 'ratings']
  const contentType = segments[segments.length - 3] ?? '';
  const contentId = parseInt(segments[segments.length - 2] ?? '');
  return { contentType, contentId };
}

// Accept both singular (article) and plural (articles) forms from URL path
const PLURAL_TO_SINGULAR: Record<string, ContentType> = {
  articles: 'article',
  guides: 'guide',
  videos: 'video',
  podcasts: 'podcast',
};

function validateContentType(contentType: string): ContentType {
  // Normalise plural URL segments to singular canonical type
  const normalised = PLURAL_TO_SINGULAR[contentType] ?? contentType;
  if (!VALID_CONTENT_TYPES.includes(normalised as ContentType)) {
    throw BizError.badRequest(
      `Invalid content type "${contentType}". Must be one of: ${VALID_CONTENT_TYPES.join(', ')}`
    );
  }
  return normalised as ContentType;
}

/**
 * GET /api/content/[contentType]/[contentId]/ratings
 * Public — returns aggregate rating data + user's own rating if authenticated
 */
export const GET = apiHandler<unknown>(async (context: ApiContext) => {
  const { contentType: rawType, contentId } = extractPathParams(context.request.url);

  const contentType = validateContentType(rawType);

  if (isNaN(contentId) || contentId <= 0) {
    throw BizError.badRequest('Invalid content ID');
  }

  const mode = RATING_MODE_MAP[contentType];
  const db = getDatabaseService();

  // ?reviews=true — return paginated individual reviews with user data
  const url = new URL(context.request.url);
  const wantsReviews = url.searchParams.get('reviews') === 'true';

  if (wantsReviews) {
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '10', 10) || 10));
    const offset = (page - 1) * limit;

    const countRows = await db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total
       FROM content_ratings
       WHERE content_type = ? AND content_id = ? AND comment IS NOT NULL AND comment != '' AND status = 'approved'`,
      [contentType, contentId]
    );
    const total = bigIntToNumber(countRows.rows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    type ReviewRow = {
      id: number;
      user_id: number;
      rating: number | null;
      is_helpful: number | null;
      comment: string | null;
      title: string | null;
      images: string[] | string | null;
      helpful_count: number;
      not_helpful_count: number;
      created_at: string;
      display_name: string | null;
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    };

    const reviewRows = await db.query<ReviewRow>(
      `SELECT cr.id, cr.user_id, cr.rating, cr.is_helpful, cr.comment, cr.title,
              cr.images, cr.helpful_count, cr.not_helpful_count, cr.created_at,
              u.display_name, u.username, u.first_name, u.last_name, u.avatar_url
       FROM content_ratings cr
       LEFT JOIN users u ON cr.user_id = u.id
       WHERE cr.content_type = ? AND cr.content_id = ? AND cr.comment IS NOT NULL AND cr.comment != ''
       ORDER BY cr.created_at DESC
       LIMIT ? OFFSET ?`,
      [contentType, contentId, limit, offset]
    );

    const reviews = reviewRows.rows.map((row) => {
      // mariadb may auto-parse JSON; normalise to string[] either way
      const images = safeJsonParse<string[]>(
        typeof row.images === 'string' ? row.images : JSON.stringify(row.images ?? null),
        []
      );

      const reviewerName =
        row.display_name ||
        (row.first_name && row.last_name ? `${row.first_name} ${row.last_name}`.trim() : null) ||
        row.username ||
        'Anonymous';

      return {
        id: row.id,
        user_id: row.user_id,
        rating: row.rating,
        is_helpful: row.is_helpful !== null ? row.is_helpful === 1 : null,
        comment: row.comment,
        title: row.title,
        images,
        helpful_count: bigIntToNumber(row.helpful_count),
        not_helpful_count: bigIntToNumber(row.not_helpful_count),
        created_at: row.created_at,
        reviewer_name: reviewerName,
        reviewer_avatar_url: row.avatar_url ?? null,
      };
    });

    return createSuccessResponse(
      {
        reviews,
        pagination: { page, limit, total, totalPages },
      },
      context.requestId
    );
  }

  // Attempt to get authenticated user (optional — public endpoint)
  let userId: number | null = null;
  try {
    const user = await getUserFromRequest(context.request);
    if (user) {
      userId = Number(user.id);
    }
  } catch {
    // Not authenticated — continue as public
  }

  if (mode === 'binary') {
    // Binary mode: COUNT helpful / not helpful
    const aggregateRows = await db.query<{
      helpful_count: bigint | number;
      not_helpful_count: bigint | number;
      total: bigint | number;
    }>(
      `SELECT
        COUNT(CASE WHEN is_helpful = 1 THEN 1 END) as helpful_count,
        COUNT(CASE WHEN is_helpful = 0 THEN 1 END) as not_helpful_count,
        COUNT(*) as total
       FROM content_ratings
       WHERE content_type = ? AND content_id = ?`,
      [contentType, contentId]
    );

    const row = aggregateRows.rows[0] ?? { helpful_count: 0, not_helpful_count: 0, total: 0 };
    const helpfulCount = bigIntToNumber(row.helpful_count);
    const notHelpfulCount = bigIntToNumber(row.not_helpful_count);
    const totalCount = bigIntToNumber(row.total);

    const helpfulPercentage =
      totalCount > 0 ? Math.round((helpfulCount / totalCount) * 100) : 0;

    // User's own vote (if authenticated)
    let userRating: { is_helpful: boolean } | null = null;
    if (userId) {
      const userRows = await db.query<{ is_helpful: number }>(
        `SELECT is_helpful FROM content_ratings
         WHERE content_type = ? AND content_id = ? AND user_id = ? LIMIT 1`,
        [contentType, contentId, userId]
      );
      const firstUserRow = userRows.rows[0];
      if (userRows.rows.length > 0 && firstUserRow && firstUserRow.is_helpful !== null) {
        userRating = { is_helpful: firstUserRow.is_helpful === 1 };
      }
    }

    return createSuccessResponse(
      {
        contentType,
        contentId,
        mode: 'binary',
        helpfulCount,
        notHelpfulCount,
        totalCount,
        helpfulPercentage,
        userRating,
      },
      context.requestId
    );
  } else {
    // Star mode: AVG rating + distribution
    const aggregateRows = await db.query<{
      average_rating: number | null;
      total_ratings: bigint | number;
    }>(
      `SELECT AVG(rating) as average_rating, COUNT(*) as total_ratings
       FROM content_ratings
       WHERE content_type = ? AND content_id = ? AND rating IS NOT NULL`,
      [contentType, contentId]
    );

    const aggRow = aggregateRows.rows[0] ?? { average_rating: null, total_ratings: 0 };
    const totalRatings = bigIntToNumber(aggRow.total_ratings);
    const averageRating =
      aggRow.average_rating !== null ? Math.round(Number(aggRow.average_rating) * 10) / 10 : null;

    // Distribution: count per star value (1-5)
    const distRows = await db.query<{ rating: number; count: bigint | number }>(
      `SELECT rating, COUNT(*) as count
       FROM content_ratings
       WHERE content_type = ? AND content_id = ? AND rating IS NOT NULL
       GROUP BY rating`,
      [contentType, contentId]
    );

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const distRow of distRows.rows) {
      const star = Number(distRow.rating);
      if (star >= 1 && star <= 5) {
        distribution[star] = bigIntToNumber(distRow.count);
      }
    }

    // User's own rating (if authenticated)
    let userRating: { rating: number } | null = null;
    if (userId) {
      const userRows = await db.query<{ rating: number }>(
        `SELECT rating FROM content_ratings
         WHERE content_type = ? AND content_id = ? AND user_id = ? LIMIT 1`,
        [contentType, contentId, userId]
      );
      const firstUserRow = userRows.rows[0];
      if (userRows.rows.length > 0 && firstUserRow && firstUserRow.rating !== null) {
        userRating = { rating: Number(firstUserRow.rating) };
      }
    }

    return createSuccessResponse(
      {
        contentType,
        contentId,
        mode: 'star',
        averageRating,
        totalRatings,
        distribution,
        userRating,
      },
      context.requestId
    );
  }
}, {
  allowedMethods: ['GET'],
});

/**
 * POST /api/content/[type]/[slug]/ratings
 * Auth required — submit or update rating (UPSERT)
 * Binary body: { is_helpful: boolean }
 * Star body:   { rating: number } (1-5)
 */
export const POST = withCsrf(apiHandler<unknown>(async (context: ApiContext) => {
  const { contentType: rawType, contentId } = extractPathParams(context.request.url);

  const contentType = validateContentType(rawType);

  if (isNaN(contentId) || contentId <= 0) {
    throw BizError.badRequest('Invalid content ID');
  }

  // Require authentication
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to submit a rating');
  }
  const userId = Number(user.id);

  const mode = RATING_MODE_MAP[contentType];

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Optional review fields
  const comment =
    requestBody.comment !== undefined && typeof requestBody.comment === 'string'
      ? requestBody.comment.trim() || null
      : null;

  const title =
    requestBody.title !== undefined && typeof requestBody.title === 'string'
      ? requestBody.title.trim() || null
      : null;

  let imagesJson: string | null = null;
  if (
    requestBody.images !== undefined &&
    Array.isArray(requestBody.images) &&
    requestBody.images.length > 0
  ) {
    if (!requestBody.images.every((img) => typeof img === 'string')) {
      throw BizError.validation('images', requestBody.images, 'images must be an array of strings');
    }
    imagesJson = JSON.stringify(requestBody.images);
  }

  const db = getDatabaseService();

  // Reviews with comments require moderation; pure ratings are auto-approved
  const status = comment ? 'pending' : 'approved';

  // Fire-and-forget: award review points (only when comment provided = full review)
  if (comment) {
    awardReviewPoints(userId, {
      reviewText: comment,
      images: imagesJson ? (JSON.parse(imagesJson) as string[]) : null,
      entityType: contentType,
      entityId: contentId,
    });
  }

  if (mode === 'binary') {
    if (requestBody.is_helpful === undefined || typeof requestBody.is_helpful !== 'boolean') {
      throw BizError.validation('is_helpful', requestBody.is_helpful, 'is_helpful is required and must be a boolean');
    }

    const isHelpful = requestBody.is_helpful ? 1 : 0;

    await db.query(
      `INSERT INTO content_ratings (content_type, content_id, user_id, is_helpful, comment, title, images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_helpful = VALUES(is_helpful),
         comment = VALUES(comment),
         title = VALUES(title),
         images = VALUES(images),
         status = VALUES(status),
         updated_at = NOW()`,
      [contentType, contentId, userId, isHelpful, comment, title, imagesJson, status]
    );

    // Re-query aggregate after upsert
    const aggregateRows = await db.query<{
      helpful_count: bigint | number;
      not_helpful_count: bigint | number;
      total: bigint | number;
    }>(
      `SELECT
        COUNT(CASE WHEN is_helpful = 1 THEN 1 END) as helpful_count,
        COUNT(CASE WHEN is_helpful = 0 THEN 1 END) as not_helpful_count,
        COUNT(*) as total
       FROM content_ratings
       WHERE content_type = ? AND content_id = ?`,
      [contentType, contentId]
    );

    const row = aggregateRows.rows[0] ?? { helpful_count: 0, not_helpful_count: 0, total: 0 };
    const helpfulCount = bigIntToNumber(row.helpful_count);
    const notHelpfulCount = bigIntToNumber(row.not_helpful_count);
    const totalCount = bigIntToNumber(row.total);
    const helpfulPercentage =
      totalCount > 0 ? Math.round((helpfulCount / totalCount) * 100) : 0;

    return createSuccessResponse(
      {
        contentType,
        contentId,
        mode: 'binary',
        helpfulCount,
        notHelpfulCount,
        totalCount,
        helpfulPercentage,
        userRating: { is_helpful: requestBody.is_helpful },
      },
      context.requestId
    );
  } else {
    // Star mode
    if (requestBody.rating === undefined || typeof requestBody.rating !== 'number') {
      throw BizError.validation('rating', requestBody.rating, 'rating is required and must be a number');
    }

    const rating = requestBody.rating;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw BizError.validation('rating', rating, 'rating must be an integer between 1 and 5');
    }

    await db.query(
      `INSERT INTO content_ratings (content_type, content_id, user_id, rating, comment, title, images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         rating = VALUES(rating),
         comment = VALUES(comment),
         title = VALUES(title),
         images = VALUES(images),
         status = VALUES(status),
         updated_at = NOW()`,
      [contentType, contentId, userId, rating, comment, title, imagesJson, status]
    );

    // Re-query aggregate after upsert
    const aggregateRows = await db.query<{
      average_rating: number | null;
      total_ratings: bigint | number;
    }>(
      `SELECT AVG(rating) as average_rating, COUNT(*) as total_ratings
       FROM content_ratings
       WHERE content_type = ? AND content_id = ? AND rating IS NOT NULL`,
      [contentType, contentId]
    );

    const aggRow = aggregateRows.rows[0] ?? { average_rating: null, total_ratings: 0 };
    const totalRatings = bigIntToNumber(aggRow.total_ratings);
    const averageRating =
      aggRow.average_rating !== null ? Math.round(Number(aggRow.average_rating) * 10) / 10 : null;

    // Distribution
    const distRows = await db.query<{ rating: number; count: bigint | number }>(
      `SELECT rating, COUNT(*) as count
       FROM content_ratings
       WHERE content_type = ? AND content_id = ? AND rating IS NOT NULL
       GROUP BY rating`,
      [contentType, contentId]
    );

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const distRow of distRows.rows) {
      const star = Number(distRow.rating);
      if (star >= 1 && star <= 5) {
        distribution[star] = bigIntToNumber(distRow.count);
      }
    }

    return createSuccessResponse(
      {
        contentType,
        contentId,
        mode: 'star',
        averageRating,
        totalRatings,
        distribution,
        userRating: { rating },
      },
      context.requestId
    );
  }
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
