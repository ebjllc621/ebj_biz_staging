/**
 * GET /api/listings/[id]/activity-feed
 *
 * Returns unified activity feed for a listing combining:
 * - Recent events (active)
 * - Recent job postings (active)
 * - Recent offers (active)
 * - Recent reviews (approved)
 *
 * @tier STANDARD
 * @auth Public (no auth required — shows public activity)
 * @phase Phase 5A - Cross-Feature Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5A_BRAIN_PLAN.md
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

interface ActivityFeedItem {
  id: string;
  type: 'event' | 'job' | 'offer' | 'review';
  title: string;
  description: string;
  created_at: string;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required');
  }

  const listingId = parseInt(listingIdStr, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(parseInt(limitParam || '10', 10), 50);

  const db = getDatabaseService();

  // Fetch recent activity from all entity types in parallel
  const [eventsResult, jobsResult, offersResult, reviewsResult] = await Promise.all([
    db.query<{ id: number; title: string; description: string | null; created_at: Date }>(
      `SELECT id, title, SUBSTRING(description, 1, 150) AS description, created_at
       FROM events
       WHERE listing_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT ?`,
      [listingId, limit]
    ),
    db.query<{ id: number; title: string; description: string | null; created_at: Date }>(
      `SELECT id, title, SUBSTRING(description, 1, 150) AS description, created_at
       FROM job_postings
       WHERE business_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT ?`,
      [listingId, limit]
    ),
    db.query<{ id: number; title: string; description: string | null; created_at: Date }>(
      `SELECT id, title, SUBSTRING(description, 1, 150) AS description, created_at
       FROM offers
       WHERE listing_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT ?`,
      [listingId, limit]
    ),
    db.query<{ id: number; rating: number; review_text: string | null; created_at: Date }>(
      `SELECT id, rating, SUBSTRING(review_text, 1, 150) AS review_text, created_at
       FROM reviews
       WHERE listing_id = ? AND status = 'approved'
       ORDER BY created_at DESC LIMIT ?`,
      [listingId, limit]
    ),
  ]);

  // Combine into unified activity items
  const items: ActivityFeedItem[] = [
    ...eventsResult.rows.map(e => ({
      id: `event-${e.id}`,
      type: 'event' as const,
      title: e.title,
      description: e.description || 'New event posted',
      created_at: new Date(e.created_at).toISOString(),
    })),
    ...jobsResult.rows.map(j => ({
      id: `job-${j.id}`,
      type: 'job' as const,
      title: j.title,
      description: j.description || 'New job posted',
      created_at: new Date(j.created_at).toISOString(),
    })),
    ...offersResult.rows.map(o => ({
      id: `offer-${o.id}`,
      type: 'offer' as const,
      title: o.title,
      description: o.description || 'New offer available',
      created_at: new Date(o.created_at).toISOString(),
    })),
    ...reviewsResult.rows.map(r => ({
      id: `review-${r.id}`,
      type: 'review' as const,
      title: `${r.rating}-star review`,
      description: r.review_text || 'New review posted',
      created_at: new Date(r.created_at).toISOString(),
    })),
  ];

  // Sort combined results by date descending and apply limit
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const limitedItems = items.slice(0, limit);

  return createSuccessResponse(
    {
      items: limitedItems,
      total: items.length,
    },
    context.requestId
  );
}, {
  allowedMethods: ['GET'],
  requireAuth: false
});
