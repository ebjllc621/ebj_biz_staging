/**
 * JobNotificationService - Job-Specific Notification Dispatch
 *
 * Coordinates job-related notifications with NotificationService.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: ErrorService.capture(), never throw (best-effort)
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_2_PLAN.md
 * @tier ADVANCED
 * @phase Jobs Phase 2 - Notification System
 * @reference src/core/services/notification/EventNotificationService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';
import { ErrorService } from '@core/services/ErrorService';
import { safeJsonParse, bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Types
// ============================================================================

export interface JobNotificationResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// JobNotificationService
// ============================================================================

export class JobNotificationService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService: NotificationService) {
    this.db = db;
    this.notificationService = notificationService;
  }

  // ==========================================================================
  // Application Notifications
  // ==========================================================================

  /**
   * Notify the job creator (employer) when a new application is received
   * @param jobId Job ID
   * @param applicantUserId User ID of the applicant
   */
  async notifyApplicationReceived(jobId: number, applicantUserId: number): Promise<void> {
    try {
      const jobResult = await this.db.query<{
        id: number;
        title: string;
        creator_user_id: number;
      }>(
        'SELECT id, title, creator_user_id FROM job_postings WHERE id = ?',
        [jobId]
      );

      if (jobResult.rows.length === 0 || !jobResult.rows[0]) {
        ErrorService.capture('[JobNotificationService] notifyApplicationReceived failed: job not found', { jobId });
        return;
      }

      const job = jobResult.rows[0];

      const userResult = await this.db.query<{
        display_name: string | null;
        first_name: string;
        last_name: string;
      }>(
        'SELECT display_name, first_name, last_name FROM users WHERE id = ?',
        [applicantUserId]
      );

      const applicantUser = userResult.rows[0];
      const applicantName = applicantUser
        ? (applicantUser.display_name || `${applicantUser.first_name} ${applicantUser.last_name}`.trim() || 'Someone')
        : 'Someone';

      await this.notificationService.dispatch({
        type: 'job.application_received',
        recipientId: job.creator_user_id,
        title: 'New Job Application',
        message: `${applicantName} applied for ${job.title}`,
        entityType: 'job',
        entityId: jobId,
        actionUrl: `/dashboard/jobs/${jobId}/applicants`,
        priority: 'normal',
        triggeredBy: applicantUserId,
        metadata: {
          job_id: jobId,
          applicant_user_id: applicantUserId,
          applicant_name: applicantName
        }
      });

    } catch (error) {
      ErrorService.capture('[JobNotificationService] notifyApplicationReceived failed:', error);
    }
  }

  /**
   * Notify applicant when their application status changes
   * @param applicationId Application ID
   * @param newStatus New status string
   */
  async notifyApplicationStatusChanged(applicationId: number, newStatus: string): Promise<void> {
    try {
      const applicationResult = await this.db.query<{
        id: number;
        user_id: number;
        job_id: number;
      }>(
        'SELECT id, user_id, job_id FROM job_applications WHERE id = ?',
        [applicationId]
      );

      if (applicationResult.rows.length === 0 || !applicationResult.rows[0]) {
        ErrorService.capture('[JobNotificationService] notifyApplicationStatusChanged failed: application not found', { applicationId });
        return;
      }

      const application = applicationResult.rows[0];

      const jobResult = await this.db.query<{
        id: number;
        title: string;
      }>(
        'SELECT id, title FROM job_postings WHERE id = ?',
        [application.job_id]
      );

      if (jobResult.rows.length === 0 || !jobResult.rows[0]) {
        ErrorService.capture('[JobNotificationService] notifyApplicationStatusChanged failed: job not found', { jobId: application.job_id });
        return;
      }

      const job = jobResult.rows[0];

      await this.notificationService.dispatch({
        type: 'job.application_status_changed',
        recipientId: application.user_id,
        title: 'Application Status Update',
        message: `Your application for ${job.title} has been updated to ${newStatus}`,
        entityType: 'job',
        entityId: application.job_id,
        actionUrl: `/dashboard/jobs/applied`,
        priority: 'normal',
        metadata: {
          application_id: applicationId,
          job_id: application.job_id,
          new_status: newStatus
        }
      });

    } catch (error) {
      ErrorService.capture('[JobNotificationService] notifyApplicationStatusChanged failed:', error);
    }
  }

  // ==========================================================================
  // Alert Match Notifications
  // ==========================================================================

  /**
   * Notify users with matching job alert subscriptions when a job is published
   * Only dispatches to realtime subscribers
   * @param jobId Job ID of the newly published job
   */
  async notifyAlertMatch(jobId: number): Promise<void> {
    try {
      const jobResult = await this.db.query<{
        id: number;
        title: string;
        slug: string | null;
        employment_type: string;
        compensation_min: number | null;
        compensation_max: number | null;
        business_id: number | null;
        description: string;
      }>(
        'SELECT id, title, slug, employment_type, compensation_min, compensation_max, business_id, description FROM job_postings WHERE id = ?',
        [jobId]
      );

      if (jobResult.rows.length === 0 || !jobResult.rows[0]) {
        ErrorService.capture('[JobNotificationService] notifyAlertMatch failed: job not found', { jobId });
        return;
      }

      const job = jobResult.rows[0];

      // Get business name if associated with a listing
      let businessName = 'A business';
      if (job.business_id) {
        const listingResult = await this.db.query<{ business_name: string }>(
          'SELECT business_name FROM listings WHERE id = ?',
          [job.business_id]
        );
        if (listingResult.rows[0]) {
          businessName = listingResult.rows[0].business_name;
        }
      }

      // Get all active alert subscriptions
      const alertsResult = await this.db.query<{
        id: number;
        user_id: number;
        alert_type: string;
        target_id: number | null;
        keyword_filter: string | null;
        employment_type_filter: unknown;
        compensation_min: number | null;
        compensation_max: number | null;
        notification_frequency: string;
      }>(
        'SELECT id, user_id, alert_type, target_id, keyword_filter, employment_type_filter, compensation_min, compensation_max, notification_frequency FROM job_alert_subscriptions WHERE is_active = 1',
        []
      );

      if (alertsResult.rows.length === 0) {
        return; // No active alerts, not an error
      }

      const actionUrl = `/jobs/${job.slug || job.id}`;
      const matchingAlertIds: number[] = [];
      const dispatchPromises: Promise<unknown>[] = [];

      for (const alert of alertsResult.rows) {
        // Only notify realtime subscribers
        if (alert.notification_frequency !== 'realtime') {
          continue;
        }

        // Check alert type matching
        let matches = false;

        if (alert.alert_type === 'all_jobs') {
          matches = true;
        } else if (alert.alert_type === 'business') {
          matches = alert.target_id === job.business_id;
        } else if (alert.alert_type === 'employment_type') {
          const employmentTypeFilter = safeJsonParse<string[]>(
            typeof alert.employment_type_filter === 'string'
              ? alert.employment_type_filter
              : JSON.stringify(alert.employment_type_filter),
            []
          );
          if (Array.isArray(employmentTypeFilter) && employmentTypeFilter.length > 0) {
            matches = employmentTypeFilter.includes(job.employment_type);
          }
        } else if (alert.alert_type === 'keyword') {
          if (alert.keyword_filter) {
            const keywords = alert.keyword_filter.toLowerCase().split(/\s+/).filter(Boolean);
            const searchText = `${job.title} ${job.description}`.toLowerCase();
            matches = keywords.some(kw => searchText.includes(kw));
          }
        }

        if (!matches) {
          continue;
        }

        // Apply compensation filter if set
        if (alert.compensation_min !== null && alert.compensation_min !== undefined) {
          if (job.compensation_max !== null && job.compensation_max !== undefined) {
            if (job.compensation_max < alert.compensation_min) {
              continue;
            }
          }
        }

        if (alert.compensation_max !== null && alert.compensation_max !== undefined) {
          if (job.compensation_min !== null && job.compensation_min !== undefined) {
            if (job.compensation_min > alert.compensation_max) {
              continue;
            }
          }
        }

        matchingAlertIds.push(alert.id);

        dispatchPromises.push(
          this.notificationService.dispatch({
            type: 'job.alert_match',
            recipientId: alert.user_id,
            title: 'New Job Match',
            message: `${job.title} at ${businessName} matches your job alert`,
            entityType: 'job',
            entityId: jobId,
            actionUrl,
            priority: 'normal',
            metadata: {
              job_id: jobId,
              alert_id: alert.id,
              business_name: businessName
            }
          })
        );
      }

      if (dispatchPromises.length > 0) {
        await Promise.allSettled(dispatchPromises);

        // Update last_sent_at for matched subscriptions
        if (matchingAlertIds.length > 0) {
          await this.db.query(
            `UPDATE job_alert_subscriptions SET last_sent_at = NOW() WHERE id IN (${matchingAlertIds.map(() => '?').join(', ')})`,
            matchingAlertIds
          );
        }
      }

    } catch (error) {
      ErrorService.capture('[JobNotificationService] notifyAlertMatch failed:', error);
    }
  }

  // ==========================================================================
  // Deadline Notifications
  // ==========================================================================

  /**
   * Notify job creator when application deadline is approaching (within 48 hours)
   * @param jobId Job ID
   */
  async notifyDeadlineApproaching(jobId: number): Promise<void> {
    try {
      const jobResult = await this.db.query<{
        id: number;
        title: string;
        creator_user_id: number;
        application_deadline: Date | null;
        application_count: number | bigint;
        status: string;
      }>(
        'SELECT id, title, creator_user_id, application_deadline, application_count, status FROM job_postings WHERE id = ?',
        [jobId]
      );

      if (jobResult.rows.length === 0 || !jobResult.rows[0]) {
        ErrorService.capture('[JobNotificationService] notifyDeadlineApproaching failed: job not found', { jobId });
        return;
      }

      const job = jobResult.rows[0];

      // Only notify for active jobs
      if (job.status !== 'active') {
        return;
      }

      // Only notify if deadline is within 48 hours
      if (!job.application_deadline) {
        return;
      }

      const now = new Date();
      const deadline = new Date(job.application_deadline);
      const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilDeadline < 0 || hoursUntilDeadline > 48) {
        return;
      }

      const applicationCount = bigIntToNumber(job.application_count);

      await this.notificationService.dispatch({
        type: 'job.deadline_approaching',
        recipientId: job.creator_user_id,
        title: 'Application Deadline Approaching',
        message: `Your posting "${job.title}" closes in less than 48 hours (${applicationCount} applications received)`,
        entityType: 'job',
        entityId: jobId,
        actionUrl: `/dashboard/jobs/${jobId}`,
        priority: 'low',
        metadata: {
          job_id: jobId,
          application_count: applicationCount,
          application_deadline: job.application_deadline
        }
      });

    } catch (error) {
      ErrorService.capture('[JobNotificationService] notifyDeadlineApproaching failed:', error);
    }
  }

  // ==========================================================================
  // Publication Notifications
  // ==========================================================================

  /**
   * Notify followers of a listing when a new job is published
   * @param jobId Job ID
   * @param listingId Listing ID that published the job
   */
  async notifyJobPublished(jobId: number, listingId: number): Promise<void> {
    try {
      const jobResult = await this.db.query<{
        id: number;
        title: string;
        slug: string | null;
      }>(
        'SELECT id, title, slug FROM job_postings WHERE id = ?',
        [jobId]
      );

      if (jobResult.rows.length === 0 || !jobResult.rows[0]) {
        ErrorService.capture('[JobNotificationService] notifyJobPublished failed: job not found', { jobId });
        return;
      }

      const job = jobResult.rows[0];

      const listingResult = await this.db.query<{ business_name: string }>(
        'SELECT business_name FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0 || !listingResult.rows[0]) {
        ErrorService.capture('[JobNotificationService] notifyJobPublished failed: listing not found', { listingId });
        return;
      }

      const listing = listingResult.rows[0];

      // Get listing followers from user_bookmarks
      const followersResult = await this.db.query<{ user_id: number }>(
        `SELECT user_id FROM user_bookmarks WHERE entity_type = 'listing' AND entity_id = ?`,
        [listingId]
      );

      if (followersResult.rows.length === 0) {
        return; // No followers, not an error
      }

      const actionUrl = `/jobs/${job.slug || job.id}`;

      const dispatchPromises = followersResult.rows.map(row =>
        this.notificationService.dispatch({
          type: 'job.published',
          recipientId: row.user_id,
          title: 'New Job Posted',
          message: `${listing.business_name} posted a new job: ${job.title}`,
          entityType: 'job',
          entityId: jobId,
          actionUrl,
          priority: 'low',
          metadata: {
            job_id: jobId,
            listing_id: listingId,
            business_name: listing.business_name
          }
        })
      );

      await Promise.allSettled(dispatchPromises);

    } catch (error) {
      ErrorService.capture('[JobNotificationService] notifyJobPublished failed:', error);
    }
  }
}

export default JobNotificationService;
