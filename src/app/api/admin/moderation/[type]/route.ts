/**
 * Admin Moderation API Routes (Dynamic Type)
 * GET /api/admin/moderation/[type] - Get items for moderation
 *
 * Supported types: listings, reviews, events, content
 * Each type uses proper table-specific queries with user JOINs
 * and appropriate status column mapping.
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.2
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

/**
 * Build the correct query per content type.
 * Each table has different column names for title, status, and user reference.
 */
function buildQueryForType(type: string): { query: string; countQuery: string } {
  switch (type) {
    case 'listings':
      return {
        query: `
          SELECT
            l.id,
            l.name AS title,
            REPLACE(REPLACE(l.description, '<p>', ''), '</p>', '') AS description,
            l.approved AS moderation_status,
            l.user_id,
            COALESCE(u.display_name, u.username) AS created_by_name,
            l.created_at
          FROM listings l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.approved IN ('pending', 'approved', 'rejected')
          ORDER BY
            CASE l.approved WHEN 'pending' THEN 0 ELSE 1 END,
            l.created_at DESC
          LIMIT 100
        `,
        countQuery: `
          SELECT
            SUM(CASE WHEN approved = 'pending' THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN approved = 'approved' THEN 1 ELSE 0 END) AS approved_count,
            SUM(CASE WHEN approved = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
          FROM listings
        `
      };

    case 'reviews':
      return {
        query: `
          SELECT * FROM (
            SELECT
              r.id,
              COALESCE(r.title, CONCAT('Review for listing #', r.listing_id)) AS title,
              r.review_text AS description,
              r.status AS moderation_status,
              r.user_id,
              COALESCE(u.display_name, u.username) AS created_by_name,
              r.rating,
              r.images,
              r.created_at,
              r.moderated_at,
              r.moderated_by,
              r.moderation_reason,
              'listing_review' AS content_type
            FROM reviews r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.status IN ('pending', 'approved', 'rejected', 'flagged')

            UNION ALL

            SELECT
              cr.id,
              COALESCE(cr.title, CONCAT(cr.content_type, ' #', cr.content_id, ' review')) AS title,
              cr.comment AS description,
              cr.status AS moderation_status,
              cr.user_id,
              COALESCE(u.display_name, u.username) AS created_by_name,
              cr.rating,
              cr.images,
              cr.created_at,
              NULL AS moderated_at,
              NULL AS moderated_by,
              NULL AS moderation_reason,
              CONCAT('content_review_', cr.content_type) AS content_type
            FROM content_ratings cr
            LEFT JOIN users u ON cr.user_id = u.id
            WHERE cr.comment IS NOT NULL AND cr.comment != ''
              AND cr.status IN ('pending', 'approved', 'rejected')
          ) AS combined
          ORDER BY
            CASE moderation_status WHEN 'pending' THEN 0 WHEN 'flagged' THEN 1 ELSE 2 END,
            created_at DESC
          LIMIT 100
        `,
        countQuery: `
          SELECT
            (
              (SELECT COUNT(*) FROM reviews WHERE status IN ('pending', 'flagged')) +
              (SELECT COUNT(*) FROM content_ratings WHERE comment IS NOT NULL AND comment != '' AND status = 'pending')
            ) AS pending_count,
            (
              (SELECT COUNT(*) FROM reviews WHERE status = 'approved') +
              (SELECT COUNT(*) FROM content_ratings WHERE comment IS NOT NULL AND comment != '' AND status = 'approved')
            ) AS approved_count,
            (
              (SELECT COUNT(*) FROM reviews WHERE status = 'rejected') +
              (SELECT COUNT(*) FROM content_ratings WHERE comment IS NOT NULL AND comment != '' AND status = 'rejected')
            ) AS rejected_count
        `
      };

    case 'events':
      return {
        query: `
          SELECT
            e.id,
            e.title,
            e.description,
            CASE e.status
              WHEN 'pending_moderation' THEN 'pending'
              WHEN 'published' THEN 'approved'
              WHEN 'cancelled' THEN 'rejected'
              ELSE e.status
            END AS moderation_status,
            e.listing_id AS user_id,
            l.name AS created_by_name,
            e.created_at
          FROM events e
          LEFT JOIN listings l ON e.listing_id = l.id
          WHERE e.status IN ('pending_moderation', 'published', 'cancelled')
          ORDER BY
            CASE e.status WHEN 'pending_moderation' THEN 0 ELSE 1 END,
            e.created_at DESC
          LIMIT 100
        `,
        countQuery: `
          SELECT
            SUM(CASE WHEN status = 'pending_moderation' THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS approved_count,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS rejected_count
          FROM events
        `
      };

    case 'content':
      return {
        query: `
          SELECT * FROM (
            SELECT
              a.id,
              a.title,
              REPLACE(REPLACE(a.excerpt, '<p>', ''), '</p>', '') AS description,
              CASE a.status
                WHEN 'published' THEN 'approved'
                WHEN 'archived' THEN 'rejected'
                ELSE a.status
              END AS moderation_status,
              a.listing_id AS user_id,
              COALESCE(l.name, 'Platform') AS created_by_name,
              a.created_at,
              'article' AS content_type
            FROM content_articles a
            LEFT JOIN listings l ON a.listing_id = l.id
            WHERE a.status IN ('pending', 'published', 'archived')

            UNION ALL

            SELECT
              v.id,
              v.title,
              v.description,
              CASE v.status
                WHEN 'published' THEN 'approved'
                WHEN 'archived' THEN 'rejected'
                ELSE v.status
              END AS moderation_status,
              v.listing_id AS user_id,
              COALESCE(l.name, 'Platform') AS created_by_name,
              v.created_at,
              'video' AS content_type
            FROM content_videos v
            LEFT JOIN listings l ON v.listing_id = l.id
            WHERE v.status IN ('pending', 'published', 'archived')

            UNION ALL

            SELECT
              p.id,
              p.title,
              p.description,
              CASE p.status
                WHEN 'published' THEN 'approved'
                WHEN 'archived' THEN 'rejected'
                ELSE p.status
              END AS moderation_status,
              p.listing_id AS user_id,
              COALESCE(l.name, 'Platform') AS created_by_name,
              p.created_at,
              'podcast' AS content_type
            FROM content_podcasts p
            LEFT JOIN listings l ON p.listing_id = l.id
            WHERE p.status IN ('pending', 'published', 'archived')
          ) AS combined
          ORDER BY
            CASE moderation_status WHEN 'pending' THEN 0 ELSE 1 END,
            created_at DESC
          LIMIT 100
        `,
        countQuery: `
          SELECT
            (
              (SELECT COUNT(*) FROM content_articles WHERE status = 'pending') +
              (SELECT COUNT(*) FROM content_videos WHERE status = 'pending') +
              (SELECT COUNT(*) FROM content_podcasts WHERE status = 'pending')
            ) AS pending_count,
            (
              (SELECT COUNT(*) FROM content_articles WHERE status = 'published') +
              (SELECT COUNT(*) FROM content_videos WHERE status = 'published') +
              (SELECT COUNT(*) FROM content_podcasts WHERE status = 'published')
            ) AS approved_count,
            (
              (SELECT COUNT(*) FROM content_articles WHERE status = 'archived') +
              (SELECT COUNT(*) FROM content_videos WHERE status = 'archived') +
              (SELECT COUNT(*) FROM content_podcasts WHERE status = 'archived')
            ) AS rejected_count
        `
      };

    default:
      throw BizError.badRequest('Invalid moderation type');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  return apiHandler(async (_context: ApiContext) => {
    const type = params.type;
    const validTypes = ['listings', 'reviews', 'events', 'content'];

    if (!validTypes.includes(type)) {
      throw BizError.badRequest(`Invalid moderation type: ${type}`);
    }

    const db = getDatabaseService();
    const { query, countQuery } = buildQueryForType(type);

    interface CountRow {
      pending_count: bigint | number;
      approved_count: bigint | number;
      rejected_count: bigint | number;
    }

    interface ModerationRow {
      id: number;
      title: string;
      description?: string;
      moderation_status: string;
      user_id: number;
      created_by_name?: string;
      created_at: string;
      content_type?: string;
      rating?: number;
      images?: string[] | string | null;
      moderated_at?: string;
      moderated_by?: number;
      moderation_reason?: string;
    }

    const [itemsResult, countsResult] = await Promise.all([
      db.query<ModerationRow>(query),
      db.query<CountRow>(countQuery)
    ]);

    const countRow = countsResult.rows?.[0];
    const counts = {
      pending: bigIntToNumber(countRow?.pending_count ?? 0),
      approved: bigIntToNumber(countRow?.approved_count ?? 0),
      rejected: bigIntToNumber(countRow?.rejected_count ?? 0),
    };

    const items = (itemsResult.rows ?? []).map((row) => {
      // MariaDB auto-parses JSON columns; handle string fallback
      let images = row.images;
      if (typeof images === 'string') {
        try { images = JSON.parse(images); } catch { images = null; }
      }
      return {
        ...row,
        // Normalize to frontend's expected field names
        status: row.moderation_status,
        created_by: row.user_id,
        created_by_name: row.created_by_name || null,
        images: images || null,
      };
    });

    return createSuccessResponse({ items, counts }, 200);
  })(request);
}
