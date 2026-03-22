/**
 * POST /api/referrals/view
 * Record when a referral link is viewed
 *
 * @authority docs/components/contacts/README.md
 * @tier SIMPLE
 * @phase Referral System Connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/core/services/DatabaseService';
import { ReferralService } from '@/features/contacts/services/ReferralService';
import type { RowDataPacket } from '@core/types/mariadb-compat';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Missing referral code' },
        { status: 400 }
      );
    }

    const db = getDatabaseService();
    const referralService = new ReferralService(db);

    // Record the view
    const referral = await referralService.recordView(code);

    if (!referral) {
      return NextResponse.json(
        { success: false, error: 'Referral not found' },
        { status: 404 }
      );
    }

    // Get referrer info for display
    const referrerQuery = `
      SELECT id, display_name, username, avatar_url
      FROM users
      WHERE id = ?
    `;
    const referrerResult = await db.query<RowDataPacket>(referrerQuery, [referral.referrer_user_id]);
    const referrerRow = referrerResult.rows?.[0];

    const referrer = referrerRow ? {
      name: referrerRow.display_name || referrerRow.username || 'A Bizconekt member',
      avatar_url: referrerRow.avatar_url || null
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        code,
        viewed: true,
        referrer
      }
    });
  } catch (error) {
    console.error('[API /api/referrals/view] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
