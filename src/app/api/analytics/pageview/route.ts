/**
 * Analytics Page View Tracking API
 *
 * POST /api/analytics/pageview
 * Records a page view to the analytics_page_views table
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @tier SIMPLE
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/DatabaseService';
import { hashIPAddress, extractRawIP } from '@core/utils/pii';

interface PageViewPayload {
  url: string;
  title?: string;
  referrer?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PageViewPayload;

    if (!body.url) {
      return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 });
    }

    // Get IP context (hashed for privacy)
    const rawIP = extractRawIP(request);
    const hashedIP = hashIPAddress(rawIP);

    // Get user agent
    const userAgent = request.headers.get('user-agent') || null;

    // Generate session ID from cookies or create anonymous one
    const sessionCookie = request.cookies.get('bk_session')?.value;
    const sessionId = sessionCookie
      ? `auth_${sessionCookie.substring(0, 16)}`
      : `anon_${hashedIP.substring(0, 12)}`;

    // Get user ID if authenticated (from session)
    let userId: number | null = null;
    if (sessionCookie) {
      try {
        const db = getDatabaseService();
        const crypto = await import('crypto');
        const sessionHash = crypto.createHash('sha256').update(sessionCookie).digest();

        const sessionResult = await db.query<{ user_id: number }>(
          'SELECT user_id FROM user_sessions WHERE session_token_hash = ? AND expires_at > NOW() AND revoked_at IS NULL LIMIT 1',
          [sessionHash]
        );

        if (sessionResult.rows?.[0]?.user_id) {
          userId = sessionResult.rows[0].user_id;
        }
      } catch {
        // Session lookup failed, continue as anonymous
      }
    }

    // Insert page view
    const db = getDatabaseService();
    await db.query(
      `INSERT INTO analytics_page_views (
        url, title, user_id, session_id, referrer, user_agent, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.url,
        body.title || null,
        userId,
        sessionId,
        body.referrer || null,
        userAgent,
        hashedIP
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    // Fire-and-forget - don't expose errors, just log
    console.error('[Analytics] Page view tracking error:', error);
    return NextResponse.json({ success: true }); // Return success to not block client
  }
}
