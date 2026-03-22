/**
 * ContentNotificationService - Content-Specific Notification Dispatch
 *
 * Coordinates content-related notifications with NotificationService.
 * Follows EventNotificationService pattern EXACTLY:
 * - Constructor takes DatabaseService + NotificationService
 * - All methods are best-effort (try/catch with ErrorService.capture, never throw)
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: ErrorService.capture(), never throw (best-effort)
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_3A_INTERACTION_INFRASTRUCTURE.md
 * @reference src/core/services/notification/EventNotificationService.ts
 * @tier STANDARD
 * @phase Content Phase 3A
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';
import { ErrorService } from '@core/services/ErrorService';
import type { ContentType } from '@core/services/ContentInteractionService';
import { ContentFollowService } from '@core/services/ContentFollowService';
import { InternalAnalyticsService } from '@core/services/InternalAnalyticsService';
import type { ContentFollower } from '@core/types/content-follow';
import { EmailNotificationService } from '@core/services/notification/EmailNotificationService';
import type { NotificationEventType } from '@core/services/notification/types';

// ============================================================================
// ContentNotificationService
// ============================================================================

export class ContentNotificationService {
  private db: DatabaseService;
  private notificationService: NotificationService;
  private contentFollowService: ContentFollowService | null;
  private analyticsService: InternalAnalyticsService | null;
  private emailNotificationService: EmailNotificationService | null;

  constructor(
    db: DatabaseService,
    notificationService: NotificationService,
    contentFollowService?: ContentFollowService | null,
    analyticsService?: InternalAnalyticsService | null,
    emailNotificationService?: EmailNotificationService | null
  ) {
    this.db = db;
    this.notificationService = notificationService;
    this.contentFollowService = contentFollowService ?? null;
    this.analyticsService = analyticsService ?? null;
    this.emailNotificationService = emailNotificationService ?? null;
  }

  // ==========================================================================
  // Comment Notifications
  // ==========================================================================

  /**
   * Notify the content owner when a comment is received on their content.
   * Best-effort — never throws.
   */
  async notifyCommentReceived(
    contentType: ContentType,
    contentId: number,
    commenterId: number
  ): Promise<void> {
    try {
      // Resolve content table
      const tableMap: Record<ContentType, string> = {
        article: 'content_articles',
        podcast: 'content_podcasts',
        video: 'content_videos',
        newsletter: 'content_newsletters',
        guide: 'content_guides',
      };
      const table = tableMap[contentType];

      // Get content details
      const contentResult = await this.db.query<{
        id: number;
        title: string;
        slug: string;
        listing_id: number | null;
      }>(
        `SELECT id, title, slug, listing_id FROM ${table} WHERE id = ? LIMIT 1`,
        [contentId]
      );

      if (contentResult.rows.length === 0 || !contentResult.rows[0]) {
        ErrorService.capture('[ContentNotificationService] notifyCommentReceived: content not found', { contentType, contentId });
        return;
      }

      const content = contentResult.rows[0];
      if (!content.listing_id) return;

      // Get listing owner
      const listingResult = await this.db.query<{ user_id: number }>(
        'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
        [content.listing_id]
      );

      if (listingResult.rows.length === 0 || !listingResult.rows[0]) return;

      const ownerId = listingResult.rows[0].user_id;

      // Do not notify the owner if they commented on their own content
      if (ownerId === commenterId) return;

      const contentPathMap: Record<ContentType, string> = {
        article: 'articles',
        podcast: 'podcasts',
        video: 'videos',
        newsletter: 'newsletters',
        guide: 'guides',
      };
      const contentPath = `/${contentPathMap[contentType]}/${content.slug}`;

      await this.notificationService.dispatch({
        type: 'content.comment_received',
        recipientId: ownerId,
        title: `New comment on your ${contentType}`,
        message: `Someone commented on "${content.title}"`,
        entityType: 'content',
        entityId: content.id,
        actionUrl: contentPath,
        priority: 'normal',
        metadata: {
          content_type: contentType,
          content_id: contentId,
          commenter_id: commenterId,
        },
      });

    } catch (error) {
      ErrorService.capture('[ContentNotificationService] notifyCommentReceived failed:', error);
    }
  }

  // ==========================================================================
  // Report Notifications
  // ==========================================================================

  /**
   * Notify admin users when a content item is reported.
   * Best-effort — never throws.
   */
  async notifyReportFiled(
    contentType: ContentType,
    contentId: number,
    reporterId: number
  ): Promise<void> {
    try {
      // Resolve content table
      const tableMap: Record<ContentType, string> = {
        article: 'content_articles',
        podcast: 'content_podcasts',
        video: 'content_videos',
        newsletter: 'content_newsletters',
        guide: 'content_guides',
      };
      const table = tableMap[contentType];

      // Get content details
      const contentResult = await this.db.query<{
        id: number;
        title: string;
        slug: string;
      }>(
        `SELECT id, title, slug FROM ${table} WHERE id = ? LIMIT 1`,
        [contentId]
      );

      if (contentResult.rows.length === 0 || !contentResult.rows[0]) {
        ErrorService.capture('[ContentNotificationService] notifyReportFiled: content not found', { contentType, contentId });
        return;
      }

      const content = contentResult.rows[0];

      // Get admin users to notify
      const adminsResult = await this.db.query<{ id: number }>(
        `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`,
        []
      );

      if (adminsResult.rows.length === 0) return;

      const dispatchPromises = adminsResult.rows.map(row =>
        this.notificationService.dispatch({
          type: 'content.report_filed',
          recipientId: row.id,
          title: `Content reported: ${content.title}`,
          message: `A user reported a ${contentType}: "${content.title}"`,
          entityType: 'content',
          entityId: content.id,
          actionUrl: `/admin/content`,
          priority: 'normal',
          metadata: {
            content_type: contentType,
            content_id: contentId,
            reporter_id: reporterId,
          },
        })
      );

      await Promise.allSettled(dispatchPromises);

    } catch (error) {
      ErrorService.capture('[ContentNotificationService] notifyReportFiled failed:', error);
    }
  }

  // ==========================================================================
  // Publication Notifications
  // ==========================================================================

  /**
   * Notify listing followers when content is published.
   * Fans out to all users who bookmarked (follow) the listing.
   * Follows FollowerBroadcastService pattern with Promise.allSettled.
   * Best-effort — never throws.
   */
  async notifyContentPublished(
    contentType: ContentType,
    contentId: number,
    listingId: number
  ): Promise<void> {
    try {
      // Resolve content table and notification type
      const tableMap: Record<ContentType, string> = {
        article: 'content_articles',
        podcast: 'content_podcasts',
        video: 'content_videos',
        newsletter: 'content_newsletters',
        guide: 'content_guides',
      };
      const table = tableMap[contentType];

      const notificationTypeMap = {
        article: 'content.article_published' as const,
        podcast: 'content.podcast_published' as const,
        video: 'content.video_published' as const,
        newsletter: 'content.newsletter_published' as const,
        guide: 'content.guide_published' as const,
      };

      // Get content details
      const contentResult = await this.db.query<{
        id: number;
        title: string;
        slug: string;
      }>(
        `SELECT id, title, slug FROM ${table} WHERE id = ? LIMIT 1`,
        [contentId]
      );

      if (contentResult.rows.length === 0 || !contentResult.rows[0]) {
        ErrorService.capture('[ContentNotificationService] notifyContentPublished: content not found', { contentType, contentId });
        return;
      }

      const content = contentResult.rows[0];

      // Get listing name
      const listingResult = await this.db.query<{ business_name: string }>(
        'SELECT business_name FROM listings WHERE id = ? LIMIT 1',
        [listingId]
      );

      if (listingResult.rows.length === 0 || !listingResult.rows[0]) {
        ErrorService.capture('[ContentNotificationService] notifyContentPublished: listing not found', { listingId });
        return;
      }

      const listing = listingResult.rows[0];

      // Get listing followers via user_bookmarks (entity_type='listing')
      const followersResult = await this.db.query<{ user_id: number }>(
        `SELECT user_id FROM user_bookmarks WHERE entity_type = 'listing' AND entity_id = ?`,
        [listingId]
      );

      if (followersResult.rows.length === 0) return;

      const pathMap: Record<ContentType, string> = {
        article: 'articles',
        podcast: 'podcasts',
        video: 'videos',
        newsletter: 'newsletters',
        guide: 'guides',
      };
      const actionUrl = `/${pathMap[contentType]}/${content.slug}`;
      const notificationType = notificationTypeMap[contentType];

      const dispatchPromises = followersResult.rows.map(row =>
        this.notificationService.dispatch({
          type: notificationType,
          recipientId: row.user_id,
          title: `New ${contentType} from ${listing.business_name}`,
          message: `${listing.business_name} published: "${content.title}"`,
          entityType: 'content',
          entityId: content.id,
          actionUrl,
          priority: 'normal',
          metadata: {
            content_type: contentType,
            content_id: contentId,
            listing_id: listingId,
          },
        })
      );

      await Promise.allSettled(dispatchPromises);

    } catch (error) {
      ErrorService.capture('[ContentNotificationService] notifyContentPublished failed:', error);
    }
  }

  // ==========================================================================
  // Content Update Notifications
  // ==========================================================================

  /**
   * Notify users with progress that content has been updated.
   * Currently supports guides only — targets users tracking progress.
   * Best-effort — never throws.
   */
  async notifyContentUpdated(
    contentType: 'guide',
    contentId: number,
    listingId: number
  ): Promise<void> {
    try {
      // Get guide title
      const contentResult = await this.db.query<{ title: string }>(
        'SELECT title FROM content_guides WHERE id = ? LIMIT 1',
        [contentId]
      );
      if (!contentResult.rows.length || !contentResult.rows[0]) {
        ErrorService.capture('[ContentNotificationService] notifyContentUpdated: content not found', { contentType, contentId });
        return;
      }

      // Get listing name
      const listingResult = await this.db.query<{ business_name: string }>(
        'SELECT business_name FROM listings WHERE id = ? LIMIT 1',
        [listingId]
      );
      if (!listingResult.rows.length || !listingResult.rows[0]) {
        ErrorService.capture('[ContentNotificationService] notifyContentUpdated: listing not found', { listingId });
        return;
      }

      // Get users with progress on this guide
      const usersResult = await this.db.query<{ user_id: number }>(
        'SELECT DISTINCT user_id FROM content_guide_progress WHERE guide_id = ?',
        [contentId]
      );

      if (!usersResult.rows.length) return;

      const title = contentResult.rows[0].title;
      const listingName = listingResult.rows[0].business_name;

      // Dispatch to each user with progress
      const dispatchPromises = usersResult.rows.map(row =>
        this.notificationService.dispatch({
          type: 'content.guide_updated',
          recipientId: row.user_id,
          title: `Guide Updated: ${title}`,
          message: `${listingName} has updated "${title}". Check out the new content!`,
          entityType: 'content',
          entityId: contentId,
          actionUrl: `/guides/${contentId}`,
          priority: 'normal',
          metadata: {
            content_type: contentType,
            content_id: contentId,
            listing_id: listingId,
          },
        })
      );

      await Promise.allSettled(dispatchPromises);
    } catch (error) {
      ErrorService.capture('[ContentNotificationService] notifyContentUpdated failed:', error);
    }
  }

  // ==========================================================================
  // Follow-Based Publication Notifications (Tier 4 Phase 6)
  // ==========================================================================

  /**
   * Notify content_follows subscribers when content is published.
   * Separates realtime (immediate dispatch) from daily/weekly (digest queue - Phase 7).
   * Tracks notification_sent analytics events.
   *
   * @param contentType Content type string (article, podcast, video, newsletter, guide)
   * @param contentId Content item ID
   * @param listingId Listing that published the content
   *
   * @pattern EventNotificationService.notifyEventPublished — follower query, dedup, fan-out
   */
  async notifyContentFollowersOnPublish(
    contentType: ContentType,
    contentId: number,
    listingId: number
  ): Promise<void> {
    try {
      if (!this.contentFollowService) {
        ErrorService.capture('[ContentNotificationService] notifyContentFollowersOnPublish: ContentFollowService not available');
        return;
      }

      // Resolve content table
      const tableMap: Record<ContentType, string> = {
        article: 'content_articles',
        podcast: 'content_podcasts',
        video: 'content_videos',
        newsletter: 'content_newsletters',
        guide: 'content_guides',
      };
      const table = tableMap[contentType];

      // Get content details
      const contentResult = await this.db.query<{
        id: number;
        title: string;
        slug: string;
      }>(
        `SELECT id, title, slug FROM ${table} WHERE id = ? LIMIT 1`,
        [contentId]
      );

      if (contentResult.rows.length === 0 || !contentResult.rows[0]) {
        ErrorService.capture('[ContentNotificationService] notifyContentFollowersOnPublish: content not found', { contentType, contentId });
        return;
      }

      const content = contentResult.rows[0];

      // Get listing name — CORRECT column is `name` (NOT `business_name`)
      const listingResult = await this.db.query<{ name: string }>(
        'SELECT name FROM listings WHERE id = ? LIMIT 1',
        [listingId]
      );

      if (listingResult.rows.length === 0 || !listingResult.rows[0]) {
        ErrorService.capture('[ContentNotificationService] notifyContentFollowersOnPublish: listing not found', { listingId });
        return;
      }

      const listingName = listingResult.rows[0].name;

      // Get followers via ContentFollowService (Phase 1)
      const followers: ContentFollower[] = await this.contentFollowService.getFollowersForContent(
        contentType,
        contentId,
        listingId
      );

      if (followers.length === 0) {
        return; // No followers, not an error
      }

      // Deduplicate by userId (a user may match multiple follow conditions)
      const seenUserIds = new Set<number>();
      const uniqueFollowers = followers.filter(f => {
        if (seenUserIds.has(f.userId)) {
          return false;
        }
        seenUserIds.add(f.userId);
        return true;
      });

      // Split by notification frequency
      const realtimeFollowers = uniqueFollowers.filter(f => f.notificationFrequency === 'realtime');
      const digestFollowers = uniqueFollowers.filter(f => f.notificationFrequency !== 'realtime');

      // Notification type per content type
      const notificationTypeMap: Record<ContentType, string> = {
        article: 'content.article_published',
        podcast: 'content.podcast_published',
        video: 'content.video_published',
        newsletter: 'content.newsletter_published',
        guide: 'content.guide_published',
      };

      const pathMap: Record<ContentType, string> = {
        article: 'articles',
        podcast: 'podcasts',
        video: 'videos',
        newsletter: 'newsletters',
        guide: 'guides',
      };

      const actionUrl = `/${pathMap[contentType]}/${content.slug}`;
      const notificationType = notificationTypeMap[contentType];

      // Dispatch to realtime followers immediately (Promise.allSettled — best-effort)
      if (realtimeFollowers.length > 0) {
        const dispatchPromises = realtimeFollowers.map(follower =>
          this.notificationService.dispatch({
            type: notificationType as NotificationEventType,
            recipientId: follower.userId,
            title: `New ${contentType} from ${listingName}`,
            message: `${listingName} published: "${content.title}"`,
            entityType: 'content',
            entityId: content.id,
            actionUrl,
            priority: 'normal',
            metadata: {
              content_type: contentType,
              content_id: contentId,
              listing_id: listingId,
              follow_type: follower.followType,
            },
          })
        );

        await Promise.allSettled(dispatchPromises);
      }

      // Daily/weekly followers — queue for digest via EmailNotificationService
      if (digestFollowers.length > 0) {
        if (this.emailNotificationService) {
          const queuePromises = digestFollowers.map(follower =>
            this.emailNotificationService!.queueForDigest(
              follower.userId,
              0, // notificationId — fan-out queue entry, not tied to single notification
              notificationType as NotificationEventType,
              `New ${contentType} from ${listingName}`,
              `${listingName} published: "${content.title}"`,
              actionUrl
            )
          );

          const queueResults = await Promise.allSettled(queuePromises);
          const queued = queueResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
          const queueFailed = queueResults.length - queued;

          // Track digest queueing analytics
          if (this.analyticsService) {
            await this.analyticsService.trackEvent({
              eventName: 'content_follow_digest_queued',
              eventData: {
                content_type: contentType,
                content_id: contentId,
                listing_id: listingId,
                digest_follower_count: digestFollowers.length,
                queued_successfully: queued,
                queue_failed: queueFailed,
                daily_count: digestFollowers.filter(f => f.notificationFrequency === 'daily').length,
                weekly_count: digestFollowers.filter(f => f.notificationFrequency === 'weekly').length,
              },
            });
          }
        } else {
          // EmailNotificationService not available — log analytics only (fallback)
          if (this.analyticsService) {
            await this.analyticsService.trackEvent({
              eventName: 'content_follow_digest_queued',
              eventData: {
                content_type: contentType,
                content_id: contentId,
                listing_id: listingId,
                digest_follower_count: digestFollowers.length,
                daily_count: digestFollowers.filter(f => f.notificationFrequency === 'daily').length,
                weekly_count: digestFollowers.filter(f => f.notificationFrequency === 'weekly').length,
                email_service_unavailable: true,
              },
            });
          }
        }
      }

      // Track batch analytics event
      if (this.analyticsService) {
        await this.analyticsService.trackEvent({
          eventName: 'content_follow_notification_batch',
          eventData: {
            content_type: contentType,
            content_id: contentId,
            listing_id: listingId,
            total_followers: uniqueFollowers.length,
            realtime_dispatched: realtimeFollowers.length,
            digest_queued: digestFollowers.length,
          },
        });
      }

    } catch (error) {
      ErrorService.capture('[ContentNotificationService] notifyContentFollowersOnPublish failed:', error);
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: ContentNotificationService | null = null;

export function getContentNotificationService(): ContentNotificationService {
  if (!instance) {
    const db = getDatabaseService();
    // Lazy import to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getNotificationService } = require('@core/services/NotificationService');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getEmailNotificationService } = require('@core/services/ServiceRegistry');
    const contentFollowService = new ContentFollowService(db);
    const analyticsService = new InternalAnalyticsService(db);
    instance = new ContentNotificationService(db, getNotificationService(), contentFollowService, analyticsService, getEmailNotificationService());
  }
  return instance;
}

export default ContentNotificationService;
