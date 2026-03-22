/**
 * Open Tracking Pixel API
 * GET /api/newsletters/track/open?nid={newsletterId}&sid={subscriberId}
 *
 * Returns 1x1 transparent GIF. No auth required.
 * Fire-and-forget: tracking errors never fail the response.
 *
 * @phase Tier 2 Content Types - Phase N8
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { createHash } from 'crypto';

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export async function GET(request: NextRequest) {
  // Always return the pixel, regardless of tracking success
  const gifResponse = () =>
    new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  try {
    const url = new URL(request.url);
    const nid = parseInt(url.searchParams.get('nid') || '');
    const sid = parseInt(url.searchParams.get('sid') || '');

    if (isNaN(nid)) return gifResponse();

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = hashIp(ip);
    const userAgent = request.headers.get('user-agent') || null;

    const db = getDatabaseService();

    // Server-side deduplication: same subscriber + newsletter within 1 hour = skip
    if (!isNaN(sid) && sid > 0) {
      const dedup = await db.query<{ id: number }>(
        `SELECT id FROM newsletter_analytics
         WHERE newsletter_id = ? AND subscriber_id = ? AND event_type = 'open'
           AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
         LIMIT 1`,
        [nid, sid]
      );
      if (dedup.rows.length > 0) return gifResponse();
    }

    // Insert analytics row
    await db.query(
      `INSERT INTO newsletter_analytics (newsletter_id, event_type, subscriber_id, source, user_agent, ip_hash)
       VALUES (?, 'open', ?, 'email', ?, ?)`,
      [nid, isNaN(sid) ? null : sid, userAgent, ipHash]
    );

    // Increment denormalized counter
    const newsletterService = new NewsletterService(db);
    await newsletterService.incrementOpenCount(nid);
  } catch {
    // Fire-and-forget — never fail the pixel response
  }

  return gifResponse();
}
