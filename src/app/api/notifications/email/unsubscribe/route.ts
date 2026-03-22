/**
 * Email Unsubscribe API Route
 *
 * GET - Verify unsubscribe token and show confirmation
 * POST - Process unsubscribe action
 *
 * @authority docs/notificationService/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailNotificationService, getNotificationPreferencesService } from '@core/services/ServiceRegistry';
import { UserNotificationPreferences } from '@core/services/notification/types';
import { ErrorService } from '@core/services/ErrorService';

/**
 * GET - Verify token and return unsubscribe page data
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing token' },
      { status: 400 }
    );
  }

  const emailService = getEmailNotificationService();
  const result = await emailService.verifyUnsubscribeToken(token);

  if (!result.valid) {
    return NextResponse.json(
      { success: false, error: result.reason },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      userId: result.userId,
      category: result.category,
      message: result.category
        ? `Unsubscribe from ${result.category} emails`
        : 'Unsubscribe from all notification emails'
    }
  });
}

/**
 * POST - Process unsubscribe action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing token' },
        { status: 400 }
      );
    }

    const emailService = getEmailNotificationService();
    const result = await emailService.verifyUnsubscribeToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.reason },
        { status: 400 }
      );
    }

    // Update user preferences to disable email for the category (or all)
    const preferencesService = getNotificationPreferencesService();

    if (result.category) {
      // Disable email for specific category
      const categoryUpdate: Partial<UserNotificationPreferences['categories']> = {};
      categoryUpdate[result.category] = { email: 'never' } as any;
      await preferencesService.updatePreferences(result.userId!, {
        categories: categoryUpdate as any
      });
    } else {
      // Disable email for all categories
      await preferencesService.updatePreferences(result.userId!, {
        categories: {
          messages: { email: 'never' } as any,
          bizwire: { email: 'never' } as any,
          connections: { email: 'never' } as any,
          reviews: { email: 'never' } as any,
          events: { email: 'never' } as any,
          subscriptions: { email: 'never' } as any,
          system: { email: 'never' } as any,
          recommendations: { email: 'never' } as any,
          referrals: { email: 'never' } as any,
          offers: { email: 'never' } as any,
          jobs: { email: 'never' } as any,
          content: { email: 'never' } as any
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: result.category
        ? `Successfully unsubscribed from ${result.category} emails`
        : 'Successfully unsubscribed from all notification emails'
    });

  } catch (error) {
    ErrorService.capture('[Unsubscribe] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe' },
      { status: 500 }
    );
  }
}
