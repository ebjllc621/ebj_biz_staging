/**
 * Admin Test Email Notification Endpoint
 *
 * POST /api/admin/notifications/test/email
 * Sends test emails through various email systems to verify delivery.
 *
 * Supports testType parameter:
 * - 'basic' (default) - Direct EmailService.send() test
 * - 'health-alert' - HealthAlertService.sendTestAlert()
 * - 'notification' - NotificationService email channel
 * - 'verification' - Verification email template
 * - 'password-reset' - Password reset email template
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Uses admin_email from health_alert_config as recipient for ALL tests
 * - Falls back to users table email if config not found
 * - Rate limited to 5 per minute
 *
 * @phase Phase 5 - Admin Actions & Management (Enhanced)
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { NextResponse } from 'next/server';
import { apiHandler, ApiContext, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { AuthServiceRegistry } from '@core/registry/AuthServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { ErrorService } from '@core/services/ErrorService';
import { getHealthAlertService } from '@core/services/ServiceRegistry';
import type { TestNotificationResult } from '@core/types/notification-admin';

// ============================================================================
// Types
// ============================================================================

type EmailTestType = 'basic' | 'health-alert' | 'notification' | 'verification' | 'password-reset';

const VALID_TEST_TYPES: EmailTestType[] = ['basic', 'health-alert', 'notification', 'verification', 'password-reset'];

interface EmailTestRequestBody {
  testType?: EmailTestType;
  /** For health-alert type: alert type to simulate */
  alertType?: 'unhealthy' | 'degraded' | 'recovered';
}

// ============================================================================
// Email Log Helper - logs test sends to notification_email_logs for dashboard tracking
// ============================================================================

async function logTestEmailSend(
  userId: number,
  testType: EmailTestType,
  recipientEmail: string,
  subject: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const db = getDatabaseService();
    await db.query(
      `INSERT INTO notification_email_logs
       (user_id, notification_id, email_type, event_type, recipient_email, subject, status, provider, error_message)
       VALUES (?, NULL, 'immediate', ?, ?, ?, ?, 'mailgun', ?)`,
      [
        userId,
        `test.${testType}`,
        recipientEmail,
        `[TEST] ${subject}`,
        success ? 'sent' : 'failed',
        errorMessage || null
      ]
    );
  } catch (error) {
    // Don't fail the test if logging fails
    ErrorService.capture('[TestEmail] Failed to log test send:', error);
  }
}

// ============================================================================
// Test Handlers
// ============================================================================

async function testBasicEmail(
  email: string,
  displayName: string
): Promise<TestNotificationResult> {
  const emailService = await AuthServiceRegistry.getEmailService();
  const now = new Date().toLocaleString();

  const sendResult = await emailService.send({
    to: email,
    subject: '[TEST] Basic Email Delivery - Bizconekt',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background:#dbeafe;padding:10px;text-align:center;font-weight:bold;color:#1e40af;border-radius:6px 6px 0 0;">TEST - Basic Email Delivery</div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 6px 6px;">
          <p>Hello ${displayName},</p>
          <p>This is a basic email delivery test from the Bizconekt Notification Manager. If you received this, your email service is configured and delivering correctly.</p>
          <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0c4a6e;"><strong>Test Type:</strong> Basic Email Delivery</p>
            <p style="margin: 4px 0 0; color: #0c4a6e;"><strong>Sent at:</strong> ${now}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This is an automated test message. No action is required.</p>
        </div>
      </div>`,
    text: `Hello ${displayName},\n\nBasic email delivery test from Bizconekt Notification Manager.\nSent at: ${now}\n\nThis is an automated test. No action required.`
  });

  return {
    success: sendResult.success,
    message: sendResult.success
      ? `Basic test email sent to ${email}`
      : `Failed: ${sendResult.error || 'Unknown error'}`,
    channel: 'email',
    sentAt: new Date().toISOString(),
    details: { emailRecipient: email },
    error: sendResult.success ? undefined : (sendResult.error || 'SEND_FAILED')
  };
}

async function testHealthAlertEmail(
  alertType: 'unhealthy' | 'degraded' | 'recovered' = 'unhealthy'
): Promise<TestNotificationResult> {
  const healthAlertService = getHealthAlertService();

  const alertLevel = alertType === 'unhealthy' ? 'critical' as const : 'warning' as const;

  const result = await healthAlertService.sendTestAlert({
    serviceName: 'email-system-test',
    alertType,
    alertLevel,
    errorMessage: `Test ${alertType} alert triggered from Notification Manager`,
    errorComponent: 'Email System Test'
  });

  return {
    success: result.success,
    message: result.success
      ? `Health alert test email sent to ${result.recipientEmail}`
      : `Failed: ${result.error || 'Unknown error'}`,
    channel: 'email',
    sentAt: new Date().toISOString(),
    details: { emailRecipient: result.recipientEmail },
    error: result.success ? undefined : (result.error || 'SEND_FAILED')
  };
}

async function testNotificationEmail(
  userId: number,
  email: string,
  displayName: string
): Promise<TestNotificationResult> {
  const emailService = await AuthServiceRegistry.getEmailService();
  const now = new Date().toLocaleString();

  // Send through the notification-style email path
  const sendResult = await emailService.send({
    to: email,
    subject: '[TEST] Notification Email Channel - Bizconekt',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background:#dcfce7;padding:10px;text-align:center;font-weight:bold;color:#166534;border-radius:6px 6px 0 0;">TEST - Notification Email Channel</div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 6px 6px;">
          <p>Hello ${displayName},</p>
          <p>This tests the notification system's email delivery channel. This is the path used for user notifications like messages, reviews, and connection requests.</p>
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; color: #166534;"><strong>Test Type:</strong> Notification Email Channel</p>
            <p style="margin: 4px 0 0; color: #166534;"><strong>User ID:</strong> ${userId}</p>
            <p style="margin: 4px 0 0; color: #166534;"><strong>Sent at:</strong> ${now}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This is an automated test message. No action is required.</p>
        </div>
      </div>`,
    text: `Hello ${displayName},\n\nNotification email channel test from Bizconekt.\nUser ID: ${userId}\nSent at: ${now}\n\nThis is an automated test. No action required.`
  });

  return {
    success: sendResult.success,
    message: sendResult.success
      ? `Notification channel test sent to ${email}`
      : `Failed: ${sendResult.error || 'Unknown error'}`,
    channel: 'email',
    sentAt: new Date().toISOString(),
    details: { emailRecipient: email },
    error: sendResult.success ? undefined : (sendResult.error || 'SEND_FAILED')
  };
}

async function testVerificationEmail(
  email: string,
  displayName: string
): Promise<TestNotificationResult> {
  const emailService = await AuthServiceRegistry.getEmailService();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

  const sendResult = await emailService.sendVerificationEmail(
    email,
    `${baseUrl}/verify?token=TEST-TOKEN-DO-NOT-CLICK`,
    displayName
  );

  return {
    success: sendResult.success,
    message: sendResult.success
      ? `Verification template test sent to ${email}`
      : `Failed: ${sendResult.error || 'Unknown error'}`,
    channel: 'email',
    sentAt: new Date().toISOString(),
    details: { emailRecipient: email },
    error: sendResult.success ? undefined : (sendResult.error || 'SEND_FAILED')
  };
}

async function testPasswordResetEmail(
  email: string,
  displayName: string
): Promise<TestNotificationResult> {
  const emailService = await AuthServiceRegistry.getEmailService();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

  const sendResult = await emailService.sendPasswordResetEmail(
    email,
    `${baseUrl}/reset-password?token=TEST-TOKEN-DO-NOT-CLICK`,
    displayName
  );

  return {
    success: sendResult.success,
    message: sendResult.success
      ? `Password reset template test sent to ${email}`
      : `Failed: ${sendResult.error || 'Unknown error'}`,
    channel: 'email',
    sentAt: new Date().toISOString(),
    details: { emailRecipient: email },
    error: sendResult.success ? undefined : (sendResult.error || 'SEND_FAILED')
  };
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/admin/notifications/test/email
 * Send test email notification to admin through specified email system
 */
async function testEmailHandler(context: ApiContext) {
  const db = getDatabaseService();
  const userId = context.userId;

  if (!userId) {
    throw new BizError({
      code: 'UNAUTHORIZED',
      message: 'User ID not found in context',
      userMessage: 'Authentication required'
    });
  }

  // Parse request body
  let body: EmailTestRequestBody = {};
  try {
    body = await context.request.json() as EmailTestRequestBody;
  } catch {
    // Default to basic if no body
  }

  const testType: EmailTestType = (body.testType && VALID_TEST_TYPES.includes(body.testType))
    ? body.testType
    : 'basic';

  try {
    // Get the configured admin email from health_alert_config (set via Config modal)
    // This ensures ALL test types send to the same configurable address
    const configResult = await db.query<{
      admin_email: string;
    }>(
      'SELECT admin_email FROM health_alert_config ORDER BY id DESC LIMIT 1'
    );

    // Fall back to user's own email if no config exists
    const userResult = await db.query<{
      email: string;
      first_name: string | null;
      display_name: string | null;
    }>(
      'SELECT email, first_name, display_name FROM users WHERE id = ?',
      [Number(userId)]
    );

    const user = userResult.rows[0];
    const configEmail = configResult.rows[0]?.admin_email;
    const recipientEmail = configEmail || user?.email;

    if (!recipientEmail) {
      return createErrorResponse(
        new BizError({
          code: 'USER_EMAIL_NOT_FOUND',
          message: 'Admin email not found',
          userMessage: 'No admin email configured. Please set one in Email Config.'
        }),
        context.requestId
      );
    }

    const displayName = user?.display_name || user?.first_name || 'Admin';

    // Route to appropriate test handler - ALL use the configured admin email
    let testResult: TestNotificationResult;

    switch (testType) {
      case 'health-alert':
        testResult = await testHealthAlertEmail(body.alertType);
        break;
      case 'notification':
        testResult = await testNotificationEmail(Number(userId), recipientEmail, displayName);
        break;
      case 'verification':
        testResult = await testVerificationEmail(recipientEmail, displayName);
        break;
      case 'password-reset':
        testResult = await testPasswordResetEmail(recipientEmail, displayName);
        break;
      case 'basic':
      default:
        testResult = await testBasicEmail(recipientEmail, displayName);
        break;
    }

    // Log to notification_email_logs so dashboard counters reflect test sends
    await logTestEmailSend(
      Number(userId),
      testType,
      testResult.details?.emailRecipient || recipientEmail,
      `Email System Test: ${testType}`,
      testResult.success,
      testResult.error
    );

    // Return NextResponse directly to avoid apiHandler double-wrapping
    // (testResult has 'success' field which confuses createSuccessResponse)
    return NextResponse.json({
      success: true,
      data: { ...testResult, testType }
    });

  } catch (error) {
    ErrorService.capture(`[TestEmail:${testType}] Error:`, error);
    return NextResponse.json({
      success: true,
      data: {
        success: false,
        message: `An error occurred while sending ${testType} test email.`,
        channel: 'email',
        sentAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        testType
      }
    });
  }
}

// ============================================================================
// Route Exports
// ============================================================================

// Auth-protected admin endpoint (matches sibling test/inapp and test/push patterns)
export const POST = apiHandler(testEmailHandler, {
  allowedMethods: ['POST'],
  requireAuth: true,
  rbac: {
    action: 'write',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 5,
    windowMs: 60000 // Max 5 test emails per minute
  }
});

// Method guards
const ALLOWED_METHODS = ['POST'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
