/**
 * ClaimNotificationService - Claim-Specific Email Dispatch
 *
 * Coordinates claim email dispatch using ClaimEmailTemplateRenderer and EmailService.
 *
 * @authority Phase 5 Brain Plan - Email Notifications
 * @tier ADVANCED
 * @phase Claim Listing Phase 5
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { AuthServiceRegistry } from '@core/registry/AuthServiceRegistry';
import { ClaimEmailTemplateRenderer } from './ClaimEmailTemplateRenderer';
import { ErrorService } from '@core/services/ErrorService';
import type {
  ClaimInitiatedTemplateData,
  VerificationPendingTemplateData,
  UnderReviewTemplateData,
  ClaimApprovedTemplateData,
  ClaimRejectedTemplateData,
  AdminClaimAlertData
} from './ClaimEmailTemplateRenderer';

// ============================================================================
// Types
// ============================================================================

export interface ClaimEmailResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// ClaimNotificationService
// ============================================================================

export class ClaimNotificationService {
  private db: DatabaseService;
  private templateRenderer: ClaimEmailTemplateRenderer;

  constructor(db: DatabaseService) {
    this.db = db;
    this.templateRenderer = new ClaimEmailTemplateRenderer();
  }

  // ==========================================================================
  // User Notifications
  // ==========================================================================

  /**
   * Send claim initiated email to user
   */
  async sendClaimInitiated(
    userId: number,
    listingName: string,
    claimType: string
  ): Promise<ClaimEmailResult> {
    try {
      const user = await this.getUserInfo(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: ClaimInitiatedTemplateData = {
        userName: user.display_name || user.first_name || 'there',
        listingName,
        claimType,
        statusUrl: `${baseUrl}/dashboard/listings`,
        unsubscribeUrl: `${baseUrl}/notifications/unsubscribe`,
        preferencesUrl: `${baseUrl}/settings/notifications`
      };

      const { subject, html, text } = this.templateRenderer.renderClaimInitiatedEmail(templateData);

      const emailService = await AuthServiceRegistry.getEmailService();
      const result = await emailService.send({
        to: user.email,
        subject,
        html,
        text
      });

      return { success: result.success, error: result.error };

    } catch (error) {
      ErrorService.capture('[ClaimNotificationService] sendClaimInitiated failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  /**
   * Send verification pending email to user
   */
  async sendVerificationPending(
    userId: number,
    listingId: number,
    listingName: string,
    verificationMethod: string
  ): Promise<ClaimEmailResult> {
    try {
      const user = await this.getUserInfo(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: VerificationPendingTemplateData = {
        userName: user.display_name || user.first_name || 'there',
        listingName,
        verificationMethod,
        codeExpiresMinutes: 15,
        verifyUrl: `${baseUrl}/listings?claimId=${listingId}`,
        unsubscribeUrl: `${baseUrl}/notifications/unsubscribe`,
        preferencesUrl: `${baseUrl}/settings/notifications`
      };

      const { subject, html, text } = this.templateRenderer.renderVerificationPendingEmail(templateData);

      const emailService = await AuthServiceRegistry.getEmailService();
      const result = await emailService.send({
        to: user.email,
        subject,
        html,
        text
      });

      return { success: result.success, error: result.error };

    } catch (error) {
      ErrorService.capture('[ClaimNotificationService] sendVerificationPending failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  /**
   * Send under review email to user
   */
  async sendUnderReview(
    userId: number,
    listingName: string
  ): Promise<ClaimEmailResult> {
    try {
      const user = await this.getUserInfo(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: UnderReviewTemplateData = {
        userName: user.display_name || user.first_name || 'there',
        listingName,
        estimatedDays: 2,
        statusUrl: `${baseUrl}/dashboard/listings`,
        unsubscribeUrl: `${baseUrl}/notifications/unsubscribe`,
        preferencesUrl: `${baseUrl}/settings/notifications`
      };

      const { subject, html, text } = this.templateRenderer.renderUnderReviewEmail(templateData);

      const emailService = await AuthServiceRegistry.getEmailService();
      const result = await emailService.send({
        to: user.email,
        subject,
        html,
        text
      });

      return { success: result.success, error: result.error };

    } catch (error) {
      ErrorService.capture('[ClaimNotificationService] sendUnderReview failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  /**
   * Send claim approved email to user (RICH TEMPLATE)
   */
  async sendClaimApproved(
    userId: number,
    listingId: number,
    listingName: string,
    tier: 'essentials' | 'plus' | 'preferred' | 'premium' = 'essentials',
    completenessPercent?: number
  ): Promise<ClaimEmailResult> {
    try {
      const user = await this.getUserInfo(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: ClaimApprovedTemplateData = {
        userName: user.display_name || user.first_name || 'there',
        listingName,
        tier,
        manageListingUrl: `${baseUrl}/listings/manage?highlight=${listingId}`,
        upgradeUrl: `${baseUrl}/pricing`,
        completenessPercent,
        unsubscribeUrl: `${baseUrl}/notifications/unsubscribe`,
        preferencesUrl: `${baseUrl}/settings/notifications`
      };

      const { subject, html, text } = this.templateRenderer.renderClaimApprovedEmail(templateData);

      const emailService = await AuthServiceRegistry.getEmailService();
      const result = await emailService.send({
        to: user.email,
        subject,
        html,
        text
      });

      return { success: result.success, error: result.error };

    } catch (error) {
      ErrorService.capture('[ClaimNotificationService] sendClaimApproved failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  /**
   * Send claim rejected email to user
   */
  async sendClaimRejected(
    userId: number,
    listingId: number,
    listingName: string,
    rejectionReason: string
  ): Promise<ClaimEmailResult> {
    try {
      const user = await this.getUserInfo(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: ClaimRejectedTemplateData = {
        userName: user.display_name || user.first_name || 'there',
        listingName,
        rejectionReason,
        appealUrl: `${baseUrl}/listings/${listingId}`,
        supportEmail: 'support@bizconekt.com',
        unsubscribeUrl: `${baseUrl}/notifications/unsubscribe`,
        preferencesUrl: `${baseUrl}/settings/notifications`
      };

      const { subject, html, text } = this.templateRenderer.renderClaimRejectedEmail(templateData);

      const emailService = await AuthServiceRegistry.getEmailService();
      const result = await emailService.send({
        to: user.email,
        subject,
        html,
        text
      });

      return { success: result.success, error: result.error };

    } catch (error) {
      ErrorService.capture('[ClaimNotificationService] sendClaimRejected failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  // ==========================================================================
  // Admin Notifications
  // ==========================================================================

  /**
   * Send new claim alert to admin users
   */
  async sendAdminNewClaimAlert(
    claimId: number,
    listingName: string,
    claimantName: string,
    claimantEmail: string,
    claimType: string,
    verificationScore: number | null
  ): Promise<ClaimEmailResult> {
    try {
      // Get admin users
      const admins = await this.getAdminUsers();
      if (admins.length === 0) {
        return { success: false, error: 'No admin users found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      const templateData: AdminClaimAlertData = {
        claimId,
        listingName,
        claimantName,
        claimantEmail,
        claimType,
        verificationScore,
        reviewUrl: `${baseUrl}/admin/claims`
      };

      const { subject, html, text } = this.templateRenderer.renderAdminClaimAlertEmail(templateData);

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
      ErrorService.capture('[ClaimNotificationService] sendAdminNewClaimAlert failed:', error);
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

export default ClaimNotificationService;
