/**
 * Testimonials API Routes - GET /api/listings/[id]/testimonials
 *
 * @authority Phase 4 Brain Plan - Testimonials API
 * @governance Public access (returns visible testimonials only)
 * @pattern Exact replication of /api/listings/[id]/team pattern
 * @phase Phase 8C - Added event testimonials (supplementary)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/listings/[id]/testimonials
 * Get all testimonials for a listing (includes supplementary event testimonials)
 *
 * @public No authentication required (returns visible testimonials only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Extract listing ID from URL
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const listingIdStr = segments[segments.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required', {});
  }

  const listingId = parseInt(listingIdStr);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: listingIdStr });
  }

  const db = getDatabaseService();

  // Get visible listing testimonials
  const result = await db.query(
    `SELECT
      id, listing_id, author_name, author_title, author_photo_url,
      testimonial, rating, date, is_featured, is_visible, display_order,
      created_at, updated_at
    FROM listing_testimonials
    WHERE listing_id = ? AND is_visible = TRUE
    ORDER BY is_featured DESC, display_order ASC, created_at DESC`,
    [listingId]
  );

  // Also fetch approved event testimonials for this listing's events
  let eventTestimonials: Array<Record<string, unknown>> = [];
  try {
    const eventService = getEventService();
    const rawEventTestimonials = await eventService.getTestimonials(listingId, 5);
    eventTestimonials = rawEventTestimonials.map(et => ({
      id: `event-${et.id}`,
      author_name: et.user_name || 'Event Attendee',
      author_title: null,
      author_photo_url: et.user_avatar || null,
      testimonial: et.review_text || '',
      rating: et.rating,
      date: et.created_at,
      is_featured: false,
      source: 'event_review',
      event_id: et.event_id,
    }));
  } catch {
    // Silently fail — event testimonials are supplementary
  }

  const allTestimonials = [...result.rows, ...eventTestimonials];

  return createSuccessResponse({ testimonials: allTestimonials }, context.requestId);
}, {
  allowedMethods: ['GET']
});
