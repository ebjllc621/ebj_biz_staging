/**
 * Admin Reviews API Route
 *
 * GET /api/admin/reviews - Get all reviews with admin features
 *
 * Supports filters: page, pageSize, sortColumn, sortDirection, search,
 * searchMode, matchMode, status, rating, highlighted_as_testimonial,
 * id, listing_id, entity_type
 *
 * When entity_type is absent or 'listing': queries only the reviews table (performance).
 * When entity_type is 'all': UNION ALL across all review tables (listings, events, offers, content, creators).
 * When entity_type is 'event': queries event_reviews table.
 * When entity_type is 'offer': queries offer_reviews table.
 * When entity_type is 'content': queries content_ratings table (articles, guides, videos, podcasts).
 * When entity_type is 'creator': queries affiliate/personality/podcaster tables.
 *
 * Field mapping (DB → API response):
 *   review_text → comment
 *   is_featured → highlighted_as_testimonial (boolean)
 *
 * @authority PHASE_2_BRAIN_PLAN.md Tasks 2.1 + 2.7
 * @tier STANDARD
 */

import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

// Sort column whitelist — prevents SQL injection
const SORT_WHITELIST = ['id', 'listing_id', 'rating', 'status', 'created_at'];

// -------------------------------------------------------------------------
// Row type for the primary reviews table query
// -------------------------------------------------------------------------
interface ReviewRow {
  id: bigint | number | null;
  listing_id: bigint | number | null;
  user_id: bigint | number | null;
  rating: bigint | number | null;
  review_text: string | null;
  status: string;
  is_featured: bigint | number | null;
  created_at: string;
  user_name: string | null;
  listing_name: string | null;
}

// -------------------------------------------------------------------------
// Row type for event_reviews table query
// -------------------------------------------------------------------------
interface EventReviewRow {
  id: bigint | number | null;
  event_id: bigint | number | null;
  user_id: bigint | number | null;
  rating: bigint | number | null;
  review_text: string | null;
  status: string;
  is_testimonial_approved: bigint | number | null;
  created_at: string;
  user_name: string | null;
}

// -------------------------------------------------------------------------
// Row type for UNION ALL queries
// -------------------------------------------------------------------------
interface UnionReviewRow {
  id: bigint | number | null;
  entity_type: string;
  entity_id: bigint | number | null;
  user_id: bigint | number | null;
  rating: bigint | number | null;
  review_text: string | null;
  status: string;
  is_featured: bigint | number | null;
  created_at: string;
  user_name: string | null;
  entity_name: string | null;
}

interface CountRow {
  total: bigint | number | null;
}

export const GET = apiHandler(async (context) => {
  const url = new URL(context.request.url);
  const sp = url.searchParams;

  // Parse pagination
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '20')));
  const offset = (page - 1) * pageSize;

  // Parse sort
  const rawSortColumn = sp.get('sortColumn') || 'created_at';
  const sortColumn = SORT_WHITELIST.includes(rawSortColumn) ? rawSortColumn : 'created_at';
  const sortDirection = sp.get('sortDirection') === 'asc' ? 'ASC' : 'DESC';

  // Parse filters
  const search = sp.get('search') || '';
  const status = sp.get('status') || '';
  const ratingStr = sp.get('rating') || '';
  const highlightedStr = sp.get('highlighted_as_testimonial') || '';
  const idStr = sp.get('id') || '';
  const listingIdStr = sp.get('listing_id') || '';
  const entityType = sp.get('entity_type') || '';

  const db = getDatabaseService();

  // -------------------------------------------------------------------------
  // ENTITY TYPE ROUTING
  // -------------------------------------------------------------------------

  if (entityType === 'listing') {
    // -----------------------------------------------------------------------
    // PRIMARY REVIEWS TABLE QUERY (listing reviews)
    // -----------------------------------------------------------------------
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('(r.review_text LIKE ? OR COALESCE(u.display_name, CONCAT(u.first_name, \' \', u.last_name)) LIKE ? OR l.name LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }
    if (ratingStr) {
      const rating = parseInt(ratingStr);
      if (!isNaN(rating)) {
        conditions.push('r.rating = ?');
        params.push(rating);
      }
    }
    if (highlightedStr !== '') {
      conditions.push('r.is_featured = ?');
      params.push(highlightedStr === 'true' ? 1 : 0);
    }
    if (idStr) {
      const id = parseInt(idStr);
      if (!isNaN(id)) {
        conditions.push('r.id = ?');
        params.push(id);
      }
    }
    if (listingIdStr) {
      const listingId = parseInt(listingIdStr);
      if (!isNaN(listingId)) {
        conditions.push('r.listing_id = ?');
        params.push(listingId);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      ${whereClause}
    `;

    const countResult = await db.query<CountRow>(
      `SELECT COUNT(*) as total ${baseQuery}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const dataResult = await db.query<ReviewRow>(
      `SELECT
        r.id,
        r.listing_id,
        r.user_id,
        r.rating,
        r.review_text,
        r.status,
        r.is_featured,
        r.created_at,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name,
        l.name as listing_name
      ${baseQuery}
      ORDER BY r.${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const reviews = dataResult.rows.map(r => ({
      id: bigIntToNumber(r.id),
      listing_id: bigIntToNumber(r.listing_id),
      listing_name: r.listing_name || null,
      user_id: bigIntToNumber(r.user_id),
      user_name: r.user_name || null,
      rating: bigIntToNumber(r.rating),
      comment: r.review_text || '',
      status: r.status,
      highlighted_as_testimonial: Boolean(r.is_featured),
      created_at: r.created_at,
      entity_type: 'listing'
    }));

    return createSuccessResponse({
      reviews,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }, context.requestId);
  }

  if (entityType === 'event') {
    // -----------------------------------------------------------------------
    // EVENT REVIEWS TABLE QUERY
    // -----------------------------------------------------------------------
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('(er.review_text LIKE ? OR COALESCE(u.display_name, CONCAT(u.first_name, \' \', u.last_name)) LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like);
    }
    if (status) {
      conditions.push('er.status = ?');
      params.push(status);
    }
    if (ratingStr) {
      const rating = parseInt(ratingStr);
      if (!isNaN(rating)) {
        conditions.push('er.rating = ?');
        params.push(rating);
      }
    }
    if (idStr) {
      const id = parseInt(idStr);
      if (!isNaN(id)) {
        conditions.push('er.id = ?');
        params.push(id);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      FROM event_reviews er
      LEFT JOIN users u ON er.user_id = u.id
      ${whereClause}
    `;

    const countResult = await db.query<CountRow>(
      `SELECT COUNT(*) as total ${baseQuery}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // event_reviews does not have listing_id — map to event_id for sorting
    const safeSort = sortColumn === 'listing_id' ? 'id' : sortColumn;

    const dataResult = await db.query<EventReviewRow>(
      `SELECT
        er.id,
        er.event_id,
        er.user_id,
        er.rating,
        er.review_text,
        er.status,
        er.is_testimonial_approved,
        er.created_at,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name
      ${baseQuery}
      ORDER BY er.${safeSort} ${sortDirection}
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const reviews = dataResult.rows.map(r => ({
      id: bigIntToNumber(r.id),
      listing_id: bigIntToNumber(r.event_id),
      listing_name: null,
      user_id: bigIntToNumber(r.user_id),
      user_name: r.user_name || null,
      rating: bigIntToNumber(r.rating),
      comment: r.review_text || '',
      status: r.status,
      highlighted_as_testimonial: Boolean(r.is_testimonial_approved),
      created_at: r.created_at,
      entity_type: 'event'
    }));

    return createSuccessResponse({
      reviews,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }, context.requestId);
  }

  if (entityType === 'offer') {
    // -----------------------------------------------------------------------
    // OFFER REVIEWS TABLE QUERY
    // offer_reviews has no status column — all are implicitly approved
    // Uses 'comment' not 'review_text'
    // -----------------------------------------------------------------------
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('(orv.comment LIKE ? OR COALESCE(u.display_name, CONCAT(u.first_name, \' \', u.last_name)) LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like);
    }
    if (ratingStr) {
      const rating = parseInt(ratingStr);
      if (!isNaN(rating)) {
        conditions.push('orv.rating = ?');
        params.push(rating);
      }
    }
    if (idStr) {
      const id = parseInt(idStr);
      if (!isNaN(id)) {
        conditions.push('orv.id = ?');
        params.push(id);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      FROM offer_reviews orv
      LEFT JOIN users u ON orv.user_id = u.id
      LEFT JOIN offers o ON orv.offer_id = o.id
      ${whereClause}
    `;

    const countResult = await db.query<CountRow>(
      `SELECT COUNT(*) as total ${baseQuery}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const safeSort = sortColumn === 'listing_id' ? 'id' : (sortColumn === 'status' ? 'created_at' : sortColumn);

    const dataResult = await db.query<{
      id: bigint | number | null;
      offer_id: bigint | number | null;
      user_id: bigint | number | null;
      rating: bigint | number | null;
      comment: string | null;
      created_at: string;
      user_name: string | null;
      offer_title: string | null;
    }>(
      `SELECT
        orv.id,
        orv.offer_id,
        orv.user_id,
        orv.rating,
        orv.comment,
        orv.created_at,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name,
        o.title as offer_title
      ${baseQuery}
      ORDER BY orv.${safeSort} ${sortDirection}
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const reviews = dataResult.rows.map(r => ({
      id: bigIntToNumber(r.id),
      listing_id: bigIntToNumber(r.offer_id),
      listing_name: r.offer_title || null,
      user_id: bigIntToNumber(r.user_id),
      user_name: r.user_name || null,
      rating: bigIntToNumber(r.rating),
      comment: r.comment || '',
      status: 'approved',
      highlighted_as_testimonial: false,
      created_at: r.created_at,
      entity_type: 'offer'
    }));

    return createSuccessResponse({
      reviews,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }, context.requestId);
  }

  if (entityType === 'content') {
    // -----------------------------------------------------------------------
    // CONTENT RATINGS TABLE QUERY (articles, guides, videos, podcasts)
    // Uses 'comment' not 'review_text', has content_type sub-field
    // -----------------------------------------------------------------------
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('(cr.comment LIKE ? OR cr.title LIKE ? OR COALESCE(u.display_name, CONCAT(u.first_name, \' \', u.last_name)) LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (status) {
      conditions.push('cr.status = ?');
      params.push(status);
    }
    if (ratingStr) {
      const rating = parseInt(ratingStr);
      if (!isNaN(rating)) {
        conditions.push('cr.rating = ?');
        params.push(rating);
      }
    }
    if (idStr) {
      const id = parseInt(idStr);
      if (!isNaN(id)) {
        conditions.push('cr.id = ?');
        params.push(id);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      FROM content_ratings cr
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN content_articles ca ON cr.content_type = 'article' AND cr.content_id = ca.id
      LEFT JOIN content_videos cv ON cr.content_type = 'video' AND cr.content_id = cv.id
      LEFT JOIN content_podcasts cp ON cr.content_type = 'podcast' AND cr.content_id = cp.id
      LEFT JOIN content_guides cg ON cr.content_type = 'guide' AND cr.content_id = cg.id
      ${whereClause}
    `;

    const countResult = await db.query<CountRow>(
      `SELECT COUNT(*) as total ${baseQuery}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const safeSort = sortColumn === 'listing_id' ? 'id' : (sortColumn === 'status' ? 'created_at' : sortColumn);

    const dataResult = await db.query<{
      id: bigint | number | null;
      content_type: string;
      content_id: bigint | number | null;
      user_id: bigint | number | null;
      rating: bigint | number | null;
      title: string | null;
      comment: string | null;
      status: string;
      created_at: string;
      user_name: string | null;
      entity_name: string | null;
    }>(
      `SELECT
        cr.id,
        cr.content_type,
        cr.content_id,
        cr.user_id,
        cr.rating,
        cr.title,
        cr.comment,
        cr.status,
        cr.created_at,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name,
        COALESCE(ca.title, cv.title, cp.title, cg.title) as entity_name
      ${baseQuery}
      ORDER BY cr.${safeSort} ${sortDirection}
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const reviews = dataResult.rows.map(r => ({
      id: bigIntToNumber(r.id),
      listing_id: bigIntToNumber(r.content_id),
      listing_name: r.entity_name || `${r.content_type} #${bigIntToNumber(r.content_id)}`,
      user_id: bigIntToNumber(r.user_id),
      user_name: r.user_name || null,
      rating: bigIntToNumber(r.rating),
      comment: r.comment || r.title || '',
      status: r.status || 'approved',
      highlighted_as_testimonial: false,
      created_at: r.created_at,
      entity_type: `content_${r.content_type}`
    }));

    return createSuccessResponse({
      reviews,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }, context.requestId);
  }

  // -------------------------------------------------------------------------
  // UNION ALL QUERY — 'all', 'creator', or default (no entity_type filter)
  // -------------------------------------------------------------------------
  const unionConditions: string[] = [];
  const unionParams: unknown[] = [];

  if (search) {
    unionConditions.push('(COALESCE(u.display_name, CONCAT(u.first_name, \' \', u.last_name)) LIKE ? OR base.review_text LIKE ?)');
    const like = `%${search}%`;
    unionParams.push(like, like);
  }
  if (status) {
    unionConditions.push('base.status = ?');
    unionParams.push(status);
  }
  if (ratingStr) {
    const rating = parseInt(ratingStr);
    if (!isNaN(rating)) {
      unionConditions.push('base.rating = ?');
      unionParams.push(rating);
    }
  }

  const unionWhere = unionConditions.length > 0 ? `WHERE ${unionConditions.join(' AND ')}` : '';

  // Determine which tables to include in UNION
  let unionQuery: string;
  if (entityType === 'creator') {
    // COLLATE utf8mb4_unicode_ci normalizes collation (creator tables use utf8mb4_general_ci)
    unionQuery = `
      SELECT amr.id, 'creator_am' as entity_type, amr.marketer_id as entity_id, amr.reviewer_user_id as user_id,
             amr.rating, amr.review_text COLLATE utf8mb4_unicode_ci as review_text, amr.status COLLATE utf8mb4_unicode_ci as status, 0 as is_featured, amr.created_at,
             NULL as entity_name
      FROM affiliate_marketer_reviews amr
      UNION ALL
      SELECT ipr.id, 'creator_ip' as entity_type, ipr.personality_id as entity_id, ipr.reviewer_user_id as user_id,
             ipr.rating, ipr.review_text COLLATE utf8mb4_unicode_ci as review_text, ipr.status COLLATE utf8mb4_unicode_ci as status, 0 as is_featured, ipr.created_at,
             NULL as entity_name
      FROM internet_personality_reviews ipr
      UNION ALL
      SELECT pr.id, 'creator_pod' as entity_type, pr.podcaster_id as entity_id, pr.reviewer_user_id as user_id,
             pr.rating, pr.review_text COLLATE utf8mb4_unicode_ci as review_text, pr.status COLLATE utf8mb4_unicode_ci as status, 0 as is_featured, pr.created_at,
             NULL as entity_name
      FROM podcaster_reviews pr
    `;
  } else {
    // 'all' — includes all 7+ review tables
    // COLLATE utf8mb4_unicode_ci normalizes collation across tables (creator tables use utf8mb4_general_ci)
    unionQuery = `
      SELECT r.id, 'listing' as entity_type, r.listing_id as entity_id, r.user_id,
             r.rating, r.review_text, r.status COLLATE utf8mb4_unicode_ci as status, r.is_featured, r.created_at,
             l.name COLLATE utf8mb4_unicode_ci as entity_name
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      UNION ALL
      SELECT er.id, 'event' as entity_type, er.event_id as entity_id, er.user_id,
             er.rating, er.review_text, er.status COLLATE utf8mb4_unicode_ci as status, CAST(er.is_testimonial_approved AS SIGNED) as is_featured, er.created_at,
             e.title COLLATE utf8mb4_unicode_ci as entity_name
      FROM event_reviews er
      LEFT JOIN events e ON er.event_id = e.id
      UNION ALL
      SELECT orv.id, 'offer' as entity_type, orv.offer_id as entity_id, orv.user_id,
             orv.rating, orv.comment as review_text, 'approved' COLLATE utf8mb4_unicode_ci as status, 0 as is_featured, orv.created_at,
             o.title COLLATE utf8mb4_unicode_ci as entity_name
      FROM offer_reviews orv
      LEFT JOIN offers o ON orv.offer_id = o.id
      UNION ALL
      SELECT cr.id, CONCAT('content_', cr.content_type) as entity_type, cr.content_id as entity_id, cr.user_id,
             cr.rating, COALESCE(cr.comment, cr.title) as review_text, COALESCE(cr.status, 'approved') COLLATE utf8mb4_unicode_ci as status, 0 as is_featured, cr.created_at,
             COALESCE(ca.title, cv.title, cp.title, cg.title) COLLATE utf8mb4_unicode_ci as entity_name
      FROM content_ratings cr
      LEFT JOIN content_articles ca ON cr.content_type = 'article' AND cr.content_id = ca.id
      LEFT JOIN content_videos cv ON cr.content_type = 'video' AND cr.content_id = cv.id
      LEFT JOIN content_podcasts cp ON cr.content_type = 'podcast' AND cr.content_id = cp.id
      LEFT JOIN content_guides cg ON cr.content_type = 'guide' AND cr.content_id = cg.id
      UNION ALL
      SELECT amr.id, 'creator_am' as entity_type, amr.marketer_id as entity_id, amr.reviewer_user_id as user_id,
             amr.rating, amr.review_text COLLATE utf8mb4_unicode_ci as review_text, amr.status COLLATE utf8mb4_unicode_ci as status, 0 as is_featured, amr.created_at,
             NULL as entity_name
      FROM affiliate_marketer_reviews amr
      UNION ALL
      SELECT ipr.id, 'creator_ip' as entity_type, ipr.personality_id as entity_id, ipr.reviewer_user_id as user_id,
             ipr.rating, ipr.review_text COLLATE utf8mb4_unicode_ci as review_text, ipr.status COLLATE utf8mb4_unicode_ci as status, 0 as is_featured, ipr.created_at,
             NULL as entity_name
      FROM internet_personality_reviews ipr
      UNION ALL
      SELECT pr.id, 'creator_pod' as entity_type, pr.podcaster_id as entity_id, pr.reviewer_user_id as user_id,
             pr.rating, pr.review_text COLLATE utf8mb4_unicode_ci as review_text, pr.status COLLATE utf8mb4_unicode_ci as status, 0 as is_featured, pr.created_at,
             NULL as entity_name
      FROM podcaster_reviews pr
    `;
  }

  const wrappedBase = `
    FROM (${unionQuery}) base
    LEFT JOIN users u ON base.user_id = u.id
    ${unionWhere}
  `;

  const countResult = await db.query<CountRow>(
    `SELECT COUNT(*) as total ${wrappedBase}`,
    unionParams
  );
  const total = bigIntToNumber(countResult.rows[0]?.total);

  // For UNION queries, only sort by columns available in all union branches
  const unionSafeSort = ['id', 'rating', 'status', 'created_at'].includes(sortColumn)
    ? `base.${sortColumn}`
    : 'base.created_at';

  const dataResult = await db.query<UnionReviewRow>(
    `SELECT
      base.id,
      base.entity_type,
      base.entity_id,
      base.user_id,
      base.rating,
      base.review_text,
      base.status,
      base.is_featured,
      base.created_at,
      COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name,
      base.entity_name
    ${wrappedBase}
    ORDER BY ${unionSafeSort} ${sortDirection}
    LIMIT ? OFFSET ?`,
    [...unionParams, pageSize, offset]
  );

  const reviews = dataResult.rows.map(r => ({
    id: bigIntToNumber(r.id),
    listing_id: bigIntToNumber(r.entity_id),
    listing_name: r.entity_name || null,
    user_id: bigIntToNumber(r.user_id),
    user_name: r.user_name || null,
    rating: bigIntToNumber(r.rating),
    comment: r.review_text || '',
    status: r.status,
    highlighted_as_testimonial: Boolean(r.is_featured),
    created_at: r.created_at,
    entity_type: r.entity_type
  }));

  return createSuccessResponse({
    reviews,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }, context.requestId);
}, { requireAuth: true, allowedMethods: ['GET'] });
