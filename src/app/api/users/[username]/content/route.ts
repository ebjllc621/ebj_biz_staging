// src/app/api/users/[username]/content/route.ts

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';

interface ContentRow {
  id: number;
  title: string;
  slug: string;
  thumbnail: string | null;
  view_count: number;
  is_featured: number;
  published_at: Date | null;
}

interface ArticleRow extends ContentRow {
  excerpt: string | null;
  reading_time: number;
}

interface VideoRow extends ContentRow {
  video_type: string;
  duration: number | null;
}

interface PodcastRow extends ContentRow {
  episode_number: number | null;
  season_number: number | null;
  audio_duration: number | null;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Extract username from URL (Next.js 14 App Router pattern)
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const usernameIndex = pathParts.findIndex(part => part === 'users') + 1;
  const username = pathParts[usernameIndex];

  if (!username) {
    return createSuccessResponse({ items: [], total: 0, hasMore: false }, context.requestId);
  }

  const db = getDatabaseService();

  // Step 1: Get user by username
  const userResult = await db.query<{ id: number }>(
    'SELECT id FROM users WHERE username = ? AND status = ?',
    [username, 'active']
  );

  if (userResult.rows.length === 0) {
    return createSuccessResponse({ items: [], total: 0, hasMore: false }, context.requestId);
  }

  const userId = userResult.rows[0]?.id;
  if (!userId) {
    return createSuccessResponse({ items: [], total: 0, hasMore: false }, context.requestId);
  }

  // Step 2: Get user's listing IDs
  const listingResult = await db.query<{ id: number }>(
    `SELECT DISTINCT l.id
     FROM listings l
     LEFT JOIN listing_users lu ON l.id = lu.listing_id AND lu.user_id = ?
     WHERE (l.user_id = ? OR lu.user_id = ?)
       AND l.status = 'active'`,
    [userId, userId, userId]
  );

  const listingIds = listingResult.rows.map(r => r.id);

  if (listingIds.length === 0) {
    return createSuccessResponse({ items: [], total: 0, hasMore: false }, context.requestId);
  }

  const placeholders = listingIds.map(() => '?').join(',');

  // Step 3: Get articles
  const articlesResult = await db.query<ArticleRow>(
    `SELECT
      id, title, slug, featured_image as thumbnail, excerpt,
      reading_time, view_count, is_featured, published_at
     FROM content_articles
     WHERE listing_id IN (${placeholders})
       AND status = 'published'
     ORDER BY published_at DESC
     LIMIT 10`,
    listingIds
  );

  // Step 4: Get videos
  const videosResult = await db.query<VideoRow>(
    `SELECT
      id, title, slug, thumbnail,
      video_type, duration, view_count, is_featured, published_at
     FROM content_videos
     WHERE listing_id IN (${placeholders})
       AND status = 'published'
     ORDER BY published_at DESC
     LIMIT 10`,
    listingIds
  );

  // Step 5: Get podcasts
  const podcastsResult = await db.query<PodcastRow>(
    `SELECT
      id, title, slug, thumbnail,
      episode_number, season_number, duration as audio_duration,
      view_count, is_featured, published_at
     FROM content_podcasts
     WHERE listing_id IN (${placeholders})
       AND status = 'published'
     ORDER BY published_at DESC
     LIMIT 10`,
    listingIds
  );

  // Step 6: Combine and sort by published_at
  const items = [
    ...articlesResult.rows.map(row => ({
      id: row.id,
      type: 'article' as const,
      title: row.title,
      slug: row.slug,
      thumbnail: row.thumbnail,
      excerpt: row.excerpt,
      reading_time: row.reading_time,
      view_count: row.view_count,
      is_featured: Boolean(row.is_featured),
      published_at: row.published_at?.toISOString() || null
    })),
    ...videosResult.rows.map(row => ({
      id: row.id,
      type: 'video' as const,
      title: row.title,
      slug: row.slug,
      thumbnail: row.thumbnail,
      video_type: row.video_type,
      duration: row.duration,
      view_count: row.view_count,
      is_featured: Boolean(row.is_featured),
      published_at: row.published_at?.toISOString() || null
    })),
    ...podcastsResult.rows.map(row => ({
      id: row.id,
      type: 'podcast' as const,
      title: row.title,
      slug: row.slug,
      thumbnail: row.thumbnail,
      episode_number: row.episode_number,
      season_number: row.season_number,
      audio_duration: row.audio_duration,
      view_count: row.view_count,
      is_featured: Boolean(row.is_featured),
      published_at: row.published_at?.toISOString() || null
    }))
  ].sort((a, b) => {
    if (!a.published_at && !b.published_at) return 0;
    if (!a.published_at) return 1;
    if (!b.published_at) return -1;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  }).slice(0, 20);

  return createSuccessResponse({
    items,
    total: items.length,
    hasMore: items.length === 20
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});
