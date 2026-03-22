/**
 * Digest Email Scheduler API Route
 *
 * POST - Trigger digest email sends (called by cron job)
 *
 * @authority docs/notificationService/phases/PHASE_4_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailNotificationService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';

// Secret key for cron job authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST - Send pending digest emails
 *
 * Called by external cron job or Vercel Cron
 *
 * Body: { frequency: 'daily' | 'weekly' }
 * Header: Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const frequency = body.frequency as 'daily' | 'weekly';

    if (!frequency || !['daily', 'weekly'].includes(frequency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid frequency. Must be "daily" or "weekly"' },
        { status: 400 }
      );
    }

    const emailService = getEmailNotificationService();
    const result = await emailService.sendPendingDigests(frequency);

    return NextResponse.json({
      success: true,
      data: {
        frequency,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors.slice(0, 10) // Limit error details
      }
    });

  } catch (error) {
    ErrorService.capture('[DigestScheduler] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process digests' },
      { status: 500 }
    );
  }
}
