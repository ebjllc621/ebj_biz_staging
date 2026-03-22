/**
 * Click Tracking Redirect API
 * GET /api/newsletters/track/click?nid={newsletterId}&sid={subscriberId}&url={encodedUrl}
 *
 * Records click then 302 redirects to destination URL. No auth required.
 * Fire-and-forget: tracking errors never prevent redirect.
 *
 * @phase Tier 2 Content Types - Phase N8
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { createHash } from 'crypto';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function isValidUrl(url: string): boolean {
  // Must start with http:// or https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  // Reject javascript: protocol (even if encoded)
  if (url.toLowerCase().includes('javascript:')) return false;
  // Prevent redirect loops — reject URLs pointing to tracking endpoint
  if (url.includes('/api/newsletters/track/')) return false;
  return true;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nid = parseInt(url.searchParams.get('nid') || '');
  const sid = parseInt(url.searchParams.get('sid') || '');
  const destinationUrl = url.searchParams.get('url') || '';

  // Validate destination URL — if invalid, redirect to homepage
  if (!destinationUrl || !isValidUrl(destinationUrl)) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
    return NextResponse.redirect(baseUrl, { status: 302 });
  }

  // Fire-and-forget tracking
  try {
    if (!isNaN(nid)) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const ipHash = hashIp(ip);

      const db = getDatabaseService();

      // Insert analytics row
      await db.query(
        `INSERT INTO newsletter_analytics (newsletter_id, event_type, subscriber_id, link_url, source, ip_hash)
         VALUES (?, 'click', ?, ?, 'email', ?)`,
        [nid, isNaN(sid) ? null : sid, destinationUrl, ipHash]
      );

      // Increment denormalized counter
      const newsletterService = new NewsletterService(db);
      await newsletterService.incrementClickCount(nid);
    }
  } catch {
    // Fire-and-forget — never prevent redirect
  }

  return NextResponse.redirect(destinationUrl, { status: 302 });
}
