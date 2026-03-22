/**
 * Admin Moderation Pending Counts API
 * GET /api/admin/moderation/counts - Get pending counts for all content types
 *
 * Returns a single object with pending counts for each tab so the UI
 * can display notification badges without fetching full item lists.
 *
 * @authority CLAUDE.md - API Standards
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

interface CountRow {
  cnt: bigint | number;
}

export async function GET(request: NextRequest) {
  return apiHandler(async (_context: ApiContext) => {
    const db = getDatabaseService();

    const [listings, reviews, events, articles, videos, podcasts, contentReviews, jobs, communityGigs] = await Promise.all([
      db.query<CountRow>(`SELECT COUNT(*) AS cnt FROM listings WHERE approved = 'pending'`),
      db.query<CountRow>(`SELECT COUNT(*) AS cnt FROM reviews WHERE status IN ('pending', 'flagged')`),
      db.query<CountRow>(`SELECT COUNT(*) AS cnt FROM events WHERE status = 'pending_moderation'`),
      db.query<CountRow>(`SELECT COUNT(*) AS cnt FROM content_articles WHERE status = 'pending'`),
      db.query<CountRow>(`SELECT COUNT(*) AS cnt FROM content_videos WHERE status = 'pending'`),
      db.query<CountRow>(`SELECT COUNT(*) AS cnt FROM content_podcasts WHERE status = 'pending'`),
      db.query<CountRow>(`SELECT COUNT(*) AS cnt FROM content_ratings WHERE comment IS NOT NULL AND comment != '' AND status = 'pending'`),
      db.query<CountRow>(`SELECT COUNT(*) AS cnt FROM job_postings WHERE status = 'pending_moderation' AND is_community_gig = 0`),
      db.query<CountRow>(`SELECT COUNT(*) AS cnt FROM job_postings WHERE status = 'pending_moderation' AND is_community_gig = 1`),
    ]);

    return createSuccessResponse({
      listings: bigIntToNumber(listings.rows[0]?.cnt ?? 0),
      reviews: bigIntToNumber(reviews.rows[0]?.cnt ?? 0) + bigIntToNumber(contentReviews.rows[0]?.cnt ?? 0),
      events: bigIntToNumber(events.rows[0]?.cnt ?? 0),
      content:
        bigIntToNumber(articles.rows[0]?.cnt ?? 0) +
        bigIntToNumber(videos.rows[0]?.cnt ?? 0) +
        bigIntToNumber(podcasts.rows[0]?.cnt ?? 0),
      jobs: bigIntToNumber(jobs.rows[0]?.cnt ?? 0) + bigIntToNumber(communityGigs.rows[0]?.cnt ?? 0),
    }, 200);
  })(request);
}
