/**
 * Scheduled Post Management Route
 * PUT /api/social/scheduled/[id]  — Reschedule
 * DELETE /api/social/scheduled/[id] — Cancel
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 7
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getSocialMediaService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';

/**
 * Extract post ID from the request URL path
 * e.g. /api/social/scheduled/42 → 42
 */
function extractPostId(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split('/');
  const raw = segments[segments.length - 1] ?? '';
  return parseInt(raw, 10);
}

export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const postId = extractPostId(context.request);
  if (isNaN(postId)) {
    throw BizError.badRequest('Invalid post ID');
  }

  const socialService = getSocialMediaService();
  const post = await socialService.getPostById(postId);
  if (!post) {
    throw BizError.notFound('Scheduled post not found');
  }
  if (post.status !== 'scheduled') {
    throw BizError.badRequest('Only scheduled posts can be rescheduled');
  }

  // Ownership verification
  const db = getDatabaseService();
  const ownerCheck = await db.query<{ id: number }>(
    'SELECT id FROM listing_users WHERE listing_id = ? AND user_id = ? AND role IN (?, ?)',
    [post.listing_id, user.id, 'owner', 'manager']
  );
  if (ownerCheck.rows.length === 0) {
    throw BizError.forbidden('You do not have permission to modify this scheduled post');
  }

  const body = await context.request.json() as Record<string, unknown>;
  const { scheduled_at, post_text } = body;

  if (!scheduled_at || typeof scheduled_at !== 'string') {
    throw BizError.badRequest('scheduled_at is required');
  }

  const scheduledDate = new Date(scheduled_at);
  if (isNaN(scheduledDate.getTime())) {
    throw BizError.badRequest('scheduled_at must be a valid ISO date string');
  }

  const minTime = new Date(Date.now() + 5 * 60 * 1000);
  if (scheduledDate < minTime) {
    throw BizError.badRequest('scheduled_at must be at least 5 minutes in the future');
  }

  // Update scheduled_at and optionally post_text
  const setClauses: string[] = ['scheduled_at = ?'];
  const params: unknown[] = [scheduledDate];

  if (post_text !== undefined && typeof post_text === 'string') {
    setClauses.push('post_text = ?');
    params.push(post_text);
  }

  params.push(postId);
  await db.query(
    `UPDATE social_media_posts SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );

  const updated = await socialService.getPostById(postId);
  return createSuccessResponse({ post: updated }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PUT'],
}));

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const postId = extractPostId(context.request);
  if (isNaN(postId)) {
    throw BizError.badRequest('Invalid post ID');
  }

  const socialService = getSocialMediaService();
  const post = await socialService.getPostById(postId);
  if (!post) {
    throw BizError.notFound('Scheduled post not found');
  }

  // Ownership verification
  const db = getDatabaseService();
  const ownerCheck = await db.query<{ id: number }>(
    'SELECT id FROM listing_users WHERE listing_id = ? AND user_id = ? AND role IN (?, ?)',
    [post.listing_id, user.id, 'owner', 'manager']
  );
  if (ownerCheck.rows.length === 0) {
    throw BizError.forbidden('You do not have permission to cancel this scheduled post');
  }

  await socialService.cancelScheduledPost(postId, post.listing_id);

  return createSuccessResponse({ cancelled: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));

// Method guards
const ALLOWED_METHODS = ['PUT', 'DELETE'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
