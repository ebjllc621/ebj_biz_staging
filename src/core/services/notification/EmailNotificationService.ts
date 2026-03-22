/**
 * EmailNotificationService - Email Channel for NotificationService
 *
 * Handles:
 * - Immediate email sending for critical notifications
 * - Digest email queueing and aggregation
 * - Unsubscribe token generation and verification
 * - Email send logging
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/notificationService/phases/PHASE_4_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/core/services/notification/PushDeviceService.ts - Service wrapper pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { AuthServiceRegistry } from '@core/registry/AuthServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { createHash, randomBytes } from 'crypto';
import {
  NotificationEventType,
  NotificationCategory,
  EVENT_TYPE_TO_CATEGORY
} from './types';
import {
  IEmailNotificationService,
  EmailSendResult,
  EmailQueueEntry,
  ImmediateEmailTemplateData,
  DigestEmailTemplateData,
  UnsubscribeTokenResult,
  UnsubscribeVerifyResult,
  CATEGORY_LABELS,
  EVENT_ACTION_TEXT,
  UNSUBSCRIBE_TOKEN_TTL_DAYS
} from './email-types';
import { EmailTemplateRenderer } from './EmailTemplateRenderer';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// Custom Errors
// ============================================================================

export class EmailNotificationError extends BizError {
  constructor(message: string, code: string = 'EMAIL_NOTIFICATION_ERROR') {
    super({ code, message, userMessage: 'Failed to send email notification' });
    this.name = 'EmailNotificationError';
  }
}

// ============================================================================
// EmailNotificationService Implementation
// ============================================================================

export class EmailNotificationService implements IEmailNotificationService {
  private db: DatabaseService;
  private templateRenderer: EmailTemplateRenderer;

  constructor(db: DatabaseService) {
    this.db = db;
    this.templateRenderer = new EmailTemplateRenderer();
  }

  // ==========================================================================
  // Immediate Email Sending
  // ==========================================================================

  /**
   * Send immediate notification email
   */
  async sendImmediateEmail(
    userId: number,
    notificationId: number,
    eventType: NotificationEventType,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<EmailSendResult> {
    try {
      // Get user info
      const user = await this.getUserInfo(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      // Generate unsubscribe token
      const category = EVENT_TYPE_TO_CATEGORY[eventType];
      const unsubscribeToken = await this.generateUnsubscribeToken(userId, category);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      // Prepare template data
      const templateData: ImmediateEmailTemplateData = {
        userName: user.display_name || user.first_name || 'there',
        title,
        message,
        actionUrl: actionUrl || `${baseUrl}/dashboard/notifications`,
        actionText: EVENT_ACTION_TEXT[eventType] || 'View Details',
        eventType,
        category,
        unsubscribeUrl: `${baseUrl}/notifications/unsubscribe?token=${unsubscribeToken.token}`,
        preferencesUrl: `${baseUrl}/settings/notifications`
      };

      // Render email
      const { subject, html, text } = this.templateRenderer.renderImmediateEmail(templateData);

      // Send via EmailService
      const emailService = await AuthServiceRegistry.getEmailService();
      const result = await emailService.send({
        to: user.email,
        subject,
        html,
        text
      });

      // Log the send
      await this.logEmailSend({
        userId,
        notificationId,
        emailType: 'immediate',
        eventType,
        recipientEmail: user.email,
        subject,
        status: result.success ? 'sent' : 'failed',
        provider: undefined,
        errorMessage: result.error
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      };

    } catch (error) {
      ErrorService.capture('[EmailNotificationService] sendImmediateEmail failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed'
      };
    }
  }

  // ==========================================================================
  // Digest Queue Management
  // ==========================================================================

  /**
   * Queue notification for digest email
   */
  async queueForDigest(
    userId: number,
    notificationId: number,
    eventType: NotificationEventType,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<EmailSendResult> {
    try {
      // Get user's digest preference
      const prefs = await this.getUserDigestPreferences(userId);
      const frequency = prefs.digestFrequency || 'daily';

      // Calculate scheduled date
      const scheduledFor = this.calculateDigestDate(frequency, prefs.digestTime);

      // Get category
      const category = EVENT_TYPE_TO_CATEGORY[eventType];

      // Insert into queue
      await this.db.query(
        `INSERT INTO notification_email_queue
         (user_id, notification_id, event_type, category, title, message, action_url, digest_frequency, scheduled_for)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, notificationId, eventType, category, title, message, actionUrl, frequency, scheduledFor]
      );

      return {
        success: true,
        queued: true,
        scheduledFor
      };

    } catch (error) {
      ErrorService.capture('[EmailNotificationService] queueForDigest failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Queue failed'
      };
    }
  }

  /**
   * Calculate the next digest send date
   */
  private calculateDigestDate(frequency: 'daily' | 'weekly', _digestTime?: string): Date {
    const now = new Date();
    const date = new Date(now);

    if (frequency === 'daily') {
      // Schedule for tomorrow
      date.setDate(date.getDate() + 1);
    } else {
      // Schedule for next week (same day)
      date.setDate(date.getDate() + 7);
    }

    // Reset to start of day
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Send pending digest emails
   * Called by scheduler
   */
  async sendPendingDigests(frequency: 'daily' | 'weekly'): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const stats = { sent: 0, failed: 0, errors: [] as string[] };

    try {
      // Get users with pending digests
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pendingUsers = await this.db.query<{ user_id: number }>(
        `SELECT DISTINCT user_id
         FROM notification_email_queue
         WHERE digest_frequency = ?
           AND scheduled_for <= ?
           AND processed_at IS NULL`,
        [frequency, today]
      );

      // Process each user
      for (const { user_id } of pendingUsers.rows) {
        try {
          const success = await this.sendUserDigest(user_id, frequency);
          if (success) {
            stats.sent++;
          } else {
            stats.failed++;
          }
        } catch (error) {
          stats.failed++;
          stats.errors.push(`User ${user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return stats;

    } catch (error) {
      ErrorService.capture('[EmailNotificationService] sendPendingDigests failed:', error);
      stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return stats;
    }
  }

  /**
   * Send digest email for a specific user
   */
  private async sendUserDigest(userId: number, frequency: 'daily' | 'weekly'): Promise<boolean> {
    // Get user info
    const user = await this.getUserInfo(userId);
    if (!user || !user.email) {
      return false;
    }

    // Get pending notifications
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingResult = await this.db.query<EmailQueueEntry>(
      `SELECT * FROM notification_email_queue
       WHERE user_id = ?
         AND digest_frequency = ?
         AND scheduled_for <= ?
         AND processed_at IS NULL
       ORDER BY category, created_at DESC`,
      [userId, frequency, today]
    );

    const pending = pendingResult.rows;
    if (pending.length === 0) {
      return true; // Nothing to send
    }

    // Group by category
    const categorized = this.groupNotificationsByCategory(pending);

    // Generate unsubscribe token
    const unsubscribeToken = await this.generateUnsubscribeToken(userId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

    // Prepare template data
    const templateData: DigestEmailTemplateData = {
      userName: user.display_name || user.first_name || 'there',
      frequency,
      periodDescription: this.getPeriodDescription(frequency),
      categories: categorized,
      totalCount: pending.length,
      unsubscribeUrl: `${baseUrl}/notifications/unsubscribe?token=${unsubscribeToken.token}`,
      preferencesUrl: `${baseUrl}/settings/notifications`
    };

    // Render email
    const { subject, html, text } = this.templateRenderer.renderDigestEmail(templateData);

    // Send via EmailService
    const emailService = await AuthServiceRegistry.getEmailService();
    const result = await emailService.send({
      to: user.email,
      subject,
      html,
      text
    });

    // Log the send
    await this.logEmailSend({
      userId,
      notificationId: null,
      emailType: 'digest',
      eventType: null,
      recipientEmail: user.email,
      subject,
      status: result.success ? 'sent' : 'failed',
      provider: undefined,
      errorMessage: result.error
    });

    // Mark queue items as processed
    if (result.success) {
      const ids = pending.map(p => p.id);
      await this.db.query(
        `UPDATE notification_email_queue SET processed_at = NOW() WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
    }

    return result.success;
  }

  /**
   * Group notifications by category for digest template
   */
  private groupNotificationsByCategory(notifications: EmailQueueEntry[]): DigestEmailTemplateData['categories'] {
    const grouped = new Map<NotificationCategory, EmailQueueEntry[]>();

    for (const notif of notifications) {
      const category = notif.category as NotificationCategory;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(notif);
    }

    return Array.from(grouped.entries()).map(([category, notifs]) => ({
      category,
      categoryLabel: CATEGORY_LABELS[category],
      notifications: notifs.map(n => ({
        title: n.title,
        message: n.message || '',
        actionUrl: n.action_url || '',
        timestamp: n.created_at
      }))
    }));
  }

  /**
   * Get period description for digest email
   */
  private getPeriodDescription(frequency: 'daily' | 'weekly'): string {
    const now = new Date();
    if (frequency === 'daily') {
      return now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
  }

  // ==========================================================================
  // Unsubscribe Token Management
  // ==========================================================================

  /**
   * Generate unsubscribe token for user
   */
  async generateUnsubscribeToken(
    userId: number,
    category?: NotificationCategory
  ): Promise<UnsubscribeTokenResult> {
    // Generate cryptographically secure token
    const tokenBytes = randomBytes(32);
    const token = tokenBytes.toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + UNSUBSCRIBE_TOKEN_TTL_DAYS);

    // Store in database
    await this.db.query(
      `INSERT INTO notification_unsubscribe_tokens
       (user_id, token_hash, category, expires_at)
       VALUES (?, ?, ?, ?)`,
      [userId, tokenHash, category || null, expiresAt]
    );

    return { token, expiresAt };
  }

  /**
   * Verify and consume unsubscribe token
   */
  async verifyUnsubscribeToken(token: string): Promise<UnsubscribeVerifyResult> {
    try {
      // Hash the token for lookup
      const tokenHash = createHash('sha256').update(token).digest('hex');

      // Look up token
      const result = await this.db.query<{
        id: number;
        user_id: number;
        category: string | null;
        expires_at: Date;
        consumed_at: Date | null;
      }>(
        `SELECT id, user_id, category, expires_at, consumed_at
         FROM notification_unsubscribe_tokens
         WHERE token_hash = ?`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        return { valid: false, reason: 'invalid' };
      }

      const tokenRecord = result.rows[0];
      if (!tokenRecord) {
        return { valid: false, reason: 'invalid' };
      }

      // Check if already consumed
      if (tokenRecord.consumed_at) {
        return { valid: false, reason: 'consumed' };
      }

      // Check if expired
      if (new Date() > new Date(tokenRecord.expires_at)) {
        return { valid: false, reason: 'expired' };
      }

      // Mark as consumed
      await this.db.query(
        'UPDATE notification_unsubscribe_tokens SET consumed_at = NOW() WHERE id = ?',
        [tokenRecord.id]
      );

      return {
        valid: true,
        userId: tokenRecord.user_id,
        category: tokenRecord.category as NotificationCategory | null
      };

    } catch (error) {
      ErrorService.capture('[EmailNotificationService] verifyUnsubscribeToken failed:', error);
      return { valid: false, reason: 'invalid' };
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get user info for email
   */
  private async getUserInfo(userId: number): Promise<{
    id: number;
    email: string;
    first_name: string | null;
    display_name: string | null;
  } | null> {
    const result = await this.db.query<{
      id: number;
      email: string;
      first_name: string | null;
      display_name: string | null;
    }>(
      'SELECT id, email, first_name, display_name FROM users WHERE id = ?',
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user's digest preferences
   */
  private async getUserDigestPreferences(userId: number): Promise<{
    digestEnabled: boolean;
    digestFrequency: 'daily' | 'weekly';
    digestTime: string;
  }> {
    const result = await this.db.query<{ user_preferences: string }>(
      'SELECT user_preferences FROM users WHERE id = ?',
      [userId]
    );

    const row = result.rows[0];
    if (result.rows.length === 0 || !row || !row.user_preferences) {
      return { digestEnabled: true, digestFrequency: 'daily', digestTime: '09:00' };
    }

    try {
      const prefs = JSON.parse(row.user_preferences);
      const notifPrefs = prefs.notificationPreferences || {};
      return {
        digestEnabled: notifPrefs.digestEnabled ?? true,
        digestFrequency: notifPrefs.digestFrequency ?? 'daily',
        digestTime: notifPrefs.digestTime ?? '09:00'
      };
    } catch {
      return { digestEnabled: true, digestFrequency: 'daily', digestTime: '09:00' };
    }
  }

  /**
   * Log email send for audit trail
   */
  private async logEmailSend(log: {
    userId: number;
    notificationId: number | null;
    emailType: 'immediate' | 'digest';
    eventType: string | null;
    recipientEmail: string;
    subject: string;
    status: 'sent' | 'failed' | 'bounced';
    provider?: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO notification_email_logs
         (user_id, notification_id, email_type, event_type, recipient_email, subject, status, provider, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          log.userId,
          log.notificationId,
          log.emailType,
          log.eventType,
          log.recipientEmail,
          log.subject,
          log.status,
          log.provider || null,
          log.errorMessage || null
        ]
      );
    } catch (error) {
      // Don't fail the email send if logging fails
      ErrorService.capture('[EmailNotificationService] Failed to log email send:', error);
    }
  }
}

export default EmailNotificationService;
