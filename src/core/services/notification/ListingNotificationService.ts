/**
 * ListingNotificationService - User-Created Listing Email Dispatch
 *
 * Coordinates listing email dispatch using ListingEmailTemplateRenderer and EmailService.
 * Follows the exact pattern from ClaimNotificationService.
 *
 * @authority Phase 5 Brain Plan - Notification System
 * @tier ADVANCED
 * @phase Listing Approval System Phase 5
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { AuthServiceRegistry } from '@core/registry/AuthServiceRegistry';
import { ListingEmailTemplateRenderer } from './ListingEmailTemplateRenderer';
import { ErrorService } from '@core/services/ErrorService';
import type {
  ListingSubmittedTemplateData,
  ListingApprovedTemplateData,
  ListingRejectedTemplateData,
  AdminListingAlertData
} from './ListingEmailTemplateRenderer';

// ============================================================================
// Types
// ============================================================================

export interface ListingEmailResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// ListingNotificationService
// ============================================================================

export class ListingNotificationService {
  private db: DatabaseService;
  private templateRenderer: ListingEmailTemplateRenderer;

  constructor(db: DatabaseService) {
    this.db = db;
    this.templateRenderer = new ListingEmailTemplateRenderer();
  }

  // ==========================================================================
  // User Notifications
  // ==========================================================================

  /**
   * Send listing submitted email to user (confirmation)
   */
  async sendListingSubmitted(
    userId: number,
    listingId: number,
    listingName: string
  ): Promise<ListingEmailResult> {
    try {
      const user = await this.getUserInfo(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: ListingSubmittedTemplateData = {
        userName: user.display_name || user.first_name || 'there',
        listingName,
        estimatedDays: 2,
        statusUrl: `${baseUrl}/dashboard/listings`,
        unsubscribeUrl: `${baseUrl}/notifications/unsubscribe`,
        preferencesUrl: `${baseUrl}/settings/notifications`
      };

      const { subject, html, text } = this.templateRenderer.renderListingSubmittedEmail(templateData);

      const emailService = await AuthServiceRegistry.getEmailService();
      const result = await emailService.send({
        to: user.email,
        subject,
        html,
        text
      });

      return { success: result.success, error: result.error };

    } catch (error) {
      ErrorService.capture('[ListingNotificationService] sendListingSubmitted failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  /**
   * Send listing approved email to user (RICH TEMPLATE)
   * Congratulations + tier info + upgrade CTA
   */
  async sendListingApproved(
    userId: number,
    listingId: number,
    listingName: string,
    tier: 'essentials' | 'plus' | 'preferred' | 'premium' = 'essentials',
    completenessPercent?: number
  ): Promise<ListingEmailResult> {
    try {
      const user = await this.getUserInfo(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: ListingApprovedTemplateData = {
        userName: user.display_name || user.first_name || 'there',
        listingName,
        listingId,
        tier,
        manageListingUrl: `${baseUrl}/dashboard/listings/${listingId}`,
        upgradeUrl: `${baseUrl}/pricing`,
        completenessPercent,
        unsubscribeUrl: `${baseUrl}/notifications/unsubscribe`,
        preferencesUrl: `${baseUrl}/settings/notifications`
      };

      const { subject, html, text } = this.templateRenderer.renderListingApprovedEmail(templateData);

      const emailService = await AuthServiceRegistry.getEmailService();
      const result = await emailService.send({
        to: user.email,
        subject,
        html,
        text
      });

      return { success: result.success, error: result.error };

    } catch (error) {
      ErrorService.capture('[ListingNotificationService] sendListingApproved failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  /**
   * Send listing rejected email to user
   */
  async sendListingRejected(
    userId: number,
    listingId: number,
    listingName: string,
    rejectionReason: string
  ): Promise<ListingEmailResult> {
    try {
      const user = await this.getUserInfo(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: ListingRejectedTemplateData = {
        userName: user.display_name || user.first_name || 'there',
        listingName,
        listingId,
        rejectionReason,
        editUrl: `${baseUrl}/dashboard/listings/${listingId}`,
        supportEmail: 'support@bizconekt.com',
        unsubscribeUrl: `${baseUrl}/notifications/unsubscribe`,
        preferencesUrl: `${baseUrl}/settings/notifications`
      };

      const { subject, html, text } = this.templateRenderer.renderListingRejectedEmail(templateData);

      const emailService = await AuthServiceRegistry.getEmailService();
      const result = await emailService.send({
        to: user.email,
        subject,
        html,
        text
      });

      return { success: result.success, error: result.error };

    } catch (error) {
      ErrorService.capture('[ListingNotificationService] sendListingRejected failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  // ==========================================================================
  // Admin Notifications
  // ==========================================================================

  /**
   * Send new listing alert to admin users
   */
  async sendAdminNewListingAlert(
    listingId: number,
    listingName: string,
    ownerName: string,
    ownerEmail: string,
    category: string
  ): Promise<ListingEmailResult> {
    try {
      // Get admin users
      const admins = await this.getAdminUsers();
      if (admins.length === 0) {
        return { success: false, error: 'No admin users found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: AdminListingAlertData = {
        listingId,
        listingName,
        ownerName,
        ownerEmail,
        category,
        reviewUrl: `${baseUrl}/admin/listings?status=pending`
      };

      const { subject, html, text } = this.templateRenderer.renderAdminNewListingAlertEmail(templateData);

      const emailService = await AuthServiceRegistry.getEmailService();

      // Send to all admins (non-blocking)
      const results = await Promise.allSettled(
        admins.map(admin =>
          emailService.send({
            to: admin.email,
            subject,
            html,
            text
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

      return {
        success: successCount > 0,
        error: successCount === 0 ? 'Failed to send to any admin' : undefined
      };

    } catch (error) {
      ErrorService.capture('[ListingNotificationService] sendAdminNewListingAlert failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

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

  private async getAdminUsers(): Promise<{ id: number; email: string }[]> {
    const result = await this.db.query<{ id: number; email: string }>(
      `SELECT id, email FROM users WHERE role = 'admin'`
    );
    return result.rows || [];
  }
}

export default ListingNotificationService;
