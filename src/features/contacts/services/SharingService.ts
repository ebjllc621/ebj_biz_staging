/**
 * SharingService - Unified Sharing & Recommendations Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Service pattern: Wraps ReferralService for backward compatibility
 * - Build Map v2.1 ENHANCED patterns
 *
 * Phase 0: Foundation only - wraps existing ReferralService
 * Phase 1+: Implements recommendation functionality
 *
 * @tier SIMPLE
 * @phase Unified Sharing & Recommendations - Phase 0
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_0_BRAIN_PLAN.md
 * @reference src/features/contacts/services/ReferralService.ts - Service pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { RowDataPacket } from '@core/types/mariadb-compat';
import { ReferralService } from './ReferralService';
import { RewardService } from './RewardService';
import { NotificationService } from '@core/services/NotificationService';
import { logger as rootLogger, Logger, LogContext } from '@core/logging/Logger';
import type {
  Sharing,
  EntityType,
  CreatePlatformInviteInput,
  CreateRecommendationInput,
  SharingFilters,
  SharingStats,
  EntityPreview,
  ContentEntityType,
  ContentCreatorStats,
  ActivityLogItem,
  PointsLedger
} from '../types/sharing';
import type { Referral } from '../types/referral';
import { isEntityType, isRecommendationType } from '../config/entity-registry';

// ============================================================================
// SERVICE CONFIGURATION (TD-009: Dependency Injection)
// ============================================================================

/**
 * SharingService configuration with optional dependency injection
 * Follows AuthenticationService canonical pattern
 */
export interface SharingServiceConfig {
  /** Database service (required) */
  db: DatabaseService;
  /** Optional RewardService (created internally if not provided) */
  rewardService?: RewardService;
  /** Optional NotificationService (created internally if not provided) */
  notificationService?: NotificationService;
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class InvalidEntityTypeError extends BizError {
  constructor(entityType: string) {
    super({
      code: 'INVALID_ENTITY_TYPE',
      message: `Invalid entity type: ${entityType}`,
      context: { entityType },
      userMessage: 'The specified entity type is not valid'
    });
  }
}

export class EntityNotFoundError extends BizError {
  constructor(entityType: EntityType, entityId: string) {
    super({
      code: 'ENTITY_NOT_FOUND',
      message: `Entity not found: ${entityType} ${entityId}`,
      context: { entityType, entityId },
      userMessage: 'The requested entity was not found'
    });
  }
}

export class RecipientNotFoundError extends BizError {
  constructor(userId: number) {
    super({
      code: 'RECIPIENT_NOT_FOUND',
      message: `Recipient user not found: ${userId}`,
      context: { userId },
      userMessage: 'The recipient user was not found'
    });
  }
}

export class DuplicateRecommendationError extends BizError {
  constructor(entityType: EntityType, entityId: string, recipientUserId: number) {
    super({
      code: 'DUPLICATE_RECOMMENDATION',
      message: `Recommendation already exists for ${entityType} ${entityId} to user ${recipientUserId}`,
      context: { entityType, entityId, recipientUserId },
      userMessage: 'You have already recommended this to this user'
    });
  }
}

export class NotImplementedError extends BizError {
  constructor(feature: string, phase: number) {
    super({
      code: 'NOT_IMPLEMENTED',
      message: `Feature not yet implemented: ${feature} (Phase ${phase})`,
      context: { feature, phase },
      userMessage: `This feature will be available in Phase ${phase}`
    });
  }
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class SharingService {
  private db: DatabaseService;
  private referralService: ReferralService;
  private rewardService: RewardService;
  private notificationService: NotificationService;
  private readonly logger: Logger;

  /**
   * Create SharingService with optional dependency injection
   * @param config - Configuration with db and optional services
   */
  constructor(config: SharingServiceConfig | DatabaseService) {
    // Support both new config pattern and legacy db-only pattern for backward compatibility
    if ('db' in config) {
      this.db = config.db;
      this.rewardService = config.rewardService ?? new RewardService(config.db);
      this.notificationService = config.notificationService ?? new NotificationService(config.db);
    } else {
      // Legacy pattern: DatabaseService passed directly
      this.db = config;
      this.rewardService = new RewardService(config);
      this.notificationService = new NotificationService(config);
    }

    this.referralService = new ReferralService(this.db);
    // Create service-scoped logger
    this.logger = rootLogger.child({
      service: 'SharingService',
      metadata: { module: 'contacts' }
    });
  }

  // ==========================================================================
  // PLATFORM INVITES (Phase 0 - Delegates to ReferralService)
  // ==========================================================================

  /**
   * Create a platform invite (legacy referral)
   * Phase 0: Delegates to ReferralService.createReferral()
   */
  async createPlatformInvite(
    userId: number,
    input: CreatePlatformInviteInput
  ): Promise<Sharing> {
    const referral = await this.referralService.createReferral(userId, input);
    return this.convertToSharing(referral);
  }

  /**
   * Get all platform invites sent by user
   * Phase 0: Delegates to ReferralService.getByUserId()
   */
  async getPlatformInvites(userId: number): Promise<Sharing[]> {
    const referrals = await this.referralService.getByUserId(userId);
    return referrals.map(r => this.convertToSharing(r));
  }

  // ==========================================================================
  // RECOMMENDATIONS (Phase 1+ - NOT IMPLEMENTED)
  // ==========================================================================

  /**
   * Create a recommendation
   * Phase 1: Full implementation for user, listing, event
   */
  async createRecommendation(
    userId: number,
    input: CreateRecommendationInput
  ): Promise<Sharing> {
    // Validate entity type is enabled for recommendations
    const entityType = this.validateEntityType(input.entity_type);
    if (!['user', 'listing', 'event', 'job_posting', 'offer'].includes(entityType)) {
      throw new InvalidEntityTypeError(entityType);
    }

    // Validate entity exists and get preview
    const preview = await this.getEntityPreview(entityType, input.entity_id);

    // Validate recipient exists
    const recipientExists = await this.validateRecipient(input.recipient_user_id);
    if (!recipientExists) {
      throw new RecipientNotFoundError(input.recipient_user_id);
    }

    // Check for duplicate recommendation
    const existing = await this.findExistingRecommendation(
      userId,
      input.recipient_user_id,
      entityType,
      input.entity_id
    );
    if (existing) {
      throw new DuplicateRecommendationError(entityType, input.entity_id, input.recipient_user_id);
    }

    // Generate share code for tracking
    const shareCode = this.generateShareCode();
    const referralLink = preview.url;

    // Create recommendation record
    const query = `
      INSERT INTO user_referrals (
        referrer_user_id,
        contact_id,
        referred_email,
        referral_code,
        referral_message,
        referral_link,
        entity_type,
        entity_id,
        recipient_user_id,
        status,
        reward_status
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'sent', 'pending')
    `;

    const result = await this.db.query<RowDataPacket>(query, [
      userId,
      input.contact_id || null,
      shareCode,
      input.message || null,
      referralLink,
      entityType,
      input.entity_id,
      input.recipient_user_id
    ]);

    // Get created recommendation ID
    const createdId = Number(result.insertId);

    // Award points to sender (Phase 5: Now actually awards points)
    const { SHARING_POINTS } = await import('../types/sharing');
    const points = entityType === 'user' ? SHARING_POINTS.recommend_user :
                   (entityType === 'listing' || entityType === 'event') ? SHARING_POINTS.recommend_listing :
                   SHARING_POINTS.share_content;

    await this.awardPointsToSender(
      userId,
      points,
      'recommendation_sent',
      {
        recommendationId: createdId,
        recipientUserId: input.recipient_user_id,
        entityType,
        entityId: input.entity_id
      }
    );

    // Update sender's recommendation streak (Phase 7)
    try {
      await this.rewardService.updateStreak(userId);
    } catch (streakError) {
      // Log but don't fail recommendation creation
      this.logger.error('Failed to update recommendation streak', streakError instanceof Error ? streakError : new Error(String(streakError)), {
        operation: 'createRecommendation',
        senderUserId: userId
      });
    }

    // Send notification to recipient
    try {
      const notificationService = new NotificationService(this.db);

      // Get sender info
      const senderResult = await this.db.query<RowDataPacket>(
        'SELECT display_name, username FROM users WHERE id = ?',
        [userId]
      );
      const sender = senderResult.rows?.[0];
      const senderName = sender?.display_name || sender?.username || 'Someone';

      await notificationService.dispatchRecommendationNotification(
        input.recipient_user_id,
        senderName,
        input.entity_type as 'user' | 'listing' | 'event' | 'job_posting',
        preview.title,
        {
          recommendation_id: createdId,
          sender_user_id: userId,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          entity_url: preview.url
        }
      );
    } catch (error) {
      // Log but don't fail recommendation creation
      this.logger.error('Failed to send recommendation notification', error instanceof Error ? error : new Error(String(error)), {
        operation: 'createRecommendation',
        senderUserId: userId,
        recipientUserId: input.recipient_user_id,
        entityType: input.entity_type,
        entityId: input.entity_id
      });
    }

    // Log social activity for both sender and receiver (dashboard Recent Activity)
    try {
      // Get sender info for activity description
      const senderInfoResult = await this.db.query<RowDataPacket>(
        'SELECT display_name, username, first_name, last_name FROM users WHERE id = ?',
        [userId]
      );
      const senderInfo = senderInfoResult.rows?.[0];
      const senderName = senderInfo?.display_name ||
        (senderInfo?.first_name ? `${senderInfo.first_name} ${senderInfo.last_name || ''}`.trim() : null) ||
        senderInfo?.username || 'Someone';

      // Get recipient info
      const recipientInfoResult = await this.db.query<RowDataPacket>(
        'SELECT display_name, username, first_name, last_name FROM users WHERE id = ?',
        [input.recipient_user_id]
      );
      const recipientInfo = recipientInfoResult.rows?.[0];
      const recipientName = recipientInfo?.display_name ||
        (recipientInfo?.first_name ? `${recipientInfo.first_name} ${recipientInfo.last_name || ''}`.trim() : null) ||
        recipientInfo?.username || 'Someone';

      // Activity for sender (visible ONLY in sender's activity feed)
      // Set target_user_id = NULL so receiver doesn't see "Recommendation sent"
      await this.db.query(
        `INSERT INTO social_activity (
          creator_user_id, target_user_id, activity_type, title, description, visibility, metadata, created_at
        ) VALUES (?, NULL, 'recommendation_sent', ?, ?, 'private', ?, NOW())`,
        [
          userId,
          'Recommendation sent',
          `Recommended ${preview.title} to ${recipientName}`,
          JSON.stringify({
            recommendation_id: createdId,
            entity_type: entityType,
            entity_id: input.entity_id,
            entity_title: preview.title,
            recipient_user_id: input.recipient_user_id
          })
        ]
      );

      // Activity for receiver (visible ONLY in receiver's activity feed)
      // Set creator_user_id = receiver so sender doesn't see "New recommendation"
      await this.db.query(
        `INSERT INTO social_activity (
          creator_user_id, target_user_id, activity_type, title, description, visibility, metadata, created_at
        ) VALUES (?, NULL, 'recommendation_received', ?, ?, 'private', ?, NOW())`,
        [
          input.recipient_user_id,
          'New recommendation',
          `${senderName} recommended ${preview.title} to you`,
          JSON.stringify({
            recommendation_id: createdId,
            entity_type: entityType,
            entity_id: input.entity_id,
            entity_title: preview.title,
            sender_user_id: userId
          })
        ]
      );
    } catch (activityError) {
      // Log but don't fail recommendation creation
      this.logger.error('Failed to log social activity for recommendation', activityError instanceof Error ? activityError : new Error(String(activityError)), {
        operation: 'createRecommendation',
        senderUserId: userId,
        recipientUserId: input.recipient_user_id
      });
    }

    return await this.getById(createdId);
  }

  /**
   * Get recommendations received by user
   * Phase 1: Full implementation
   * Phase 3: Enhanced with entity preview
   */
  async getReceivedRecommendations(
    userId: number,
    filters?: Omit<SharingFilters, 'status'> & { status?: 'all' | 'unread' | 'saved' | 'helpful' | 'thanked' }
  ): Promise<import('../types/sharing').SharingWithPreview[]> {
    let query = `
      SELECT
        ur.*,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.avatar_url AS sender_avatar_url
      FROM user_referrals ur
      LEFT JOIN users u ON ur.referrer_user_id = u.id
      WHERE ur.recipient_user_id = ?
        AND ur.entity_type != 'platform_invite'
    `;
    const params: (string | number | null | undefined)[] = [userId];

    // Apply status filter (Phase 3 + Phase 4)
    if (filters?.status === 'unread') {
      query += ' AND ur.viewed_at IS NULL';
    } else if (filters?.status === 'saved') {
      query += ' AND ur.is_saved = TRUE';
    } else if (filters?.status === 'helpful') {
      // Phase 4: Filter for helpful recommendations (rated as helpful by recipient)
      query += ' AND ur.is_helpful = TRUE';
    } else if (filters?.status === 'thanked') {
      // Phase 4: Filter for thanked recommendations
      query += ' AND ur.thanked_at IS NOT NULL';
    }

    // Apply entity_type filter
    if (filters?.entity_type) {
      query += ' AND ur.entity_type = ?';
      params.push(filters.entity_type);
    }

    // Apply date filters
    if (filters?.from_date) {
      query += ' AND ur.created_at >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND ur.created_at <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY ur.created_at DESC';

    const result = await this.db.query<RowDataPacket>(query, params);
    const rows = result.rows || [];

    // Enrich with entity previews (Phase 3)
    return Promise.all(
      rows.map(async (row) => {
        const sharing = this.mapRowToSharing(row);
        let entityPreview = null;

        try {
          if (sharing.entity_type && sharing.entity_id) {
            entityPreview = await this.getEntityPreview(
              sharing.entity_type,
              sharing.entity_id
            );
          }
        } catch {
          // Entity may have been deleted
        }

        return {
          ...sharing,
          entity_preview: entityPreview,
          sender: {
            username: row.sender_username,
            display_name: row.sender_display_name,
            avatar_url: row.sender_avatar_url
          },
          viewed_at: row.viewed_at ? new Date(row.viewed_at) : null,
          is_saved: row.is_saved || false,
          // Phase 4: Feedback fields
          is_helpful: row.is_helpful ?? null,
          thanked_at: row.thanked_at ? new Date(row.thanked_at) : null
        };
      })
    );
  }

  /**
   * Get recommendations sent by user
   * Phase 3: Returns sent recommendations with recipient info and entity previews
   * Required for "Sent" tab in recommendations inbox
   */
  async getSentRecommendations(
    userId: number,
    filters?: SharingFilters
  ): Promise<import('../types/sharing').SharingWithPreview[]> {
    let query = `
      SELECT
        ur.*,
        u.username AS recipient_username,
        u.display_name AS recipient_display_name,
        u.avatar_url AS recipient_avatar_url
      FROM user_referrals ur
      LEFT JOIN users u ON ur.recipient_user_id = u.id
      WHERE ur.referrer_user_id = ?
        AND ur.entity_type != 'platform_invite'
    `;
    const params: (string | number | null | undefined)[] = [userId];

    // Apply entity_type filter
    if (filters?.entity_type) {
      query += ' AND ur.entity_type = ?';
      params.push(filters.entity_type);
    }

    // Apply date filters
    if (filters?.from_date) {
      query += ' AND ur.created_at >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND ur.created_at <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY ur.created_at DESC';

    const result = await this.db.query<RowDataPacket>(query, params);
    const rows = result.rows || [];

    // Enrich with entity previews
    return Promise.all(
      rows.map(async (row) => {
        const sharing = this.mapRowToSharing(row);
        let entityPreview = null;

        try {
          if (sharing.entity_type && sharing.entity_id) {
            entityPreview = await this.getEntityPreview(
              sharing.entity_type,
              sharing.entity_id
            );
          }
        } catch {
          // Entity may have been deleted
        }

        // For sent recommendations, "sender" is actually the recipient (who receives it)
        // This keeps the UI consistent - sender field always shows the "other person"
        return {
          ...sharing,
          entity_preview: entityPreview,
          sender: {
            username: row.recipient_username || 'unknown',
            display_name: row.recipient_display_name,
            avatar_url: row.recipient_avatar_url
          },
          viewed_at: row.viewed_at ? new Date(row.viewed_at) : null,
          is_saved: false, // Sent items can't be saved by sender
          // Phase 4: Feedback fields
          is_helpful: row.is_helpful ?? null,
          thanked_at: row.thanked_at ? new Date(row.thanked_at) : null
        };
      })
    );
  }

  /**
   * Mark recommendation as viewed by recipient
   * Phase 3: Tracks when recipient first views recommendation
   */
  async markAsViewed(
    userId: number,
    recommendationId: number
  ): Promise<void> {
    // Only mark if recipient and not already viewed
    const query = `
      UPDATE user_referrals
      SET viewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND recipient_user_id = ?
        AND viewed_at IS NULL
    `;
    await this.db.query(query, [recommendationId, userId]);
  }

  /**
   * Toggle saved status for recommendation
   * Phase 3: Allows recipients to bookmark recommendations
   */
  async toggleSaved(
    userId: number,
    recommendationId: number
  ): Promise<{ is_saved: boolean }> {
    // First get current state
    const getQuery = `
      SELECT is_saved FROM user_referrals
      WHERE id = ? AND recipient_user_id = ?
    `;
    const result = await this.db.query<RowDataPacket>(getQuery, [recommendationId, userId]);
    const current = result.rows?.[0];

    if (!current) {
      throw new BizError({
        code: 'RECOMMENDATION_NOT_FOUND',
        message: 'Recommendation not found or access denied'
      });
    }

    const newState = !current.is_saved;

    // Update state
    const updateQuery = `
      UPDATE user_referrals
      SET is_saved = ?
      WHERE id = ? AND recipient_user_id = ?
    `;
    await this.db.query(updateQuery, [newState, recommendationId, userId]);

    return { is_saved: newState };
  }

  /**
   * Get inbox counts for tab badges
   * Phase 3: Returns counts for All/Received/Sent/Saved tabs
   */
  async getInboxCounts(userId: number): Promise<import('../types/sharing').InboxCounts> {
    const receivedQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN viewed_at IS NULL THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN is_saved = TRUE THEN 1 ELSE 0 END) as saved,
        SUM(CASE WHEN is_helpful = TRUE THEN 1 ELSE 0 END) as helpful,
        SUM(CASE WHEN thanked_at IS NOT NULL THEN 1 ELSE 0 END) as thankyous
      FROM user_referrals
      WHERE recipient_user_id = ?
        AND entity_type != 'platform_invite'
    `;

    const sentQuery = `
      SELECT COUNT(*) as total
      FROM user_referrals
      WHERE referrer_user_id = ?
        AND entity_type != 'platform_invite'
    `;

    const [receivedResult, sentResult] = await Promise.all([
      this.db.query<RowDataPacket>(receivedQuery, [userId]),
      this.db.query<RowDataPacket>(sentQuery, [userId])
    ]);

    const received = receivedResult.rows?.[0];
    const sent = sentResult.rows?.[0];

    return {
      all: bigIntToNumber(received?.total || 0) + bigIntToNumber(sent?.total || 0),
      received: bigIntToNumber(received?.total || 0),
      unread: bigIntToNumber(received?.unread || 0),
      sent: bigIntToNumber(sent?.total || 0),
      saved: bigIntToNumber(received?.saved || 0),
      // Phase 4: Feedback counts
      helpful: bigIntToNumber(received?.helpful || 0),
      thankyous: bigIntToNumber(received?.thankyous || 0)
    };
  }

  /**
   * Get entity preview for recommendation display
   * Phase 1: Full implementation for user, listing, event
   */
  async getEntityPreview(
    entityType: EntityType,
    entityId: string
  ): Promise<EntityPreview> {
    const validatedType = this.validateEntityType(entityType);

    switch (validatedType) {
      case 'user': {
        const query = `
          SELECT id, username, display_name, avatar_url
          FROM users
          WHERE id = ?
        `;
        const result = await this.db.query<RowDataPacket>(query, [parseInt(entityId)]);
        const user = result.rows?.[0];

        if (!user) {
          throw new EntityNotFoundError(entityType, entityId);
        }

        return {
          type: 'user',
          id: entityId,
          title: user.display_name || user.username,
          description: `@${user.username}`,
          image_url: user.avatar_url || null,
          url: `/profile/${user.username}`
        };
      }

      case 'listing': {
        const query = `
          SELECT id, name, slug, description, logo_url
          FROM listings
          WHERE id = ? AND status = 'active'
        `;
        const result = await this.db.query<RowDataPacket>(query, [parseInt(entityId)]);
        const listing = result.rows?.[0];

        if (!listing) {
          throw new EntityNotFoundError(entityType, entityId);
        }

        return {
          type: 'listing',
          id: entityId,
          title: listing.name,
          description: listing.description || null,
          image_url: listing.logo_url || null,
          url: `/listings/${listing.slug}`
        };
      }

      case 'event': {
        const query = `
          SELECT id, title, slug, description, banner_image, start_date
          FROM events
          WHERE id = ? AND status IN ('draft', 'published')
        `;
        const result = await this.db.query<RowDataPacket>(query, [parseInt(entityId)]);
        const event = result.rows?.[0];

        if (!event) {
          throw new EntityNotFoundError(entityType, entityId);
        }

        return {
          type: 'event',
          id: entityId,
          title: event.title,
          description: event.description || null,
          image_url: event.banner_image || null,
          url: `/events/${event.slug}`,
          metadata: {
            start_date: event.start_date
          }
        };
      }

      // Phase 8: Article preview
      case 'article': {
        const { ContentService } = await import('@core/services/ContentService');
        const contentService = new ContentService(this.db);
        const article = await contentService.getArticleBySlug(entityId);

        if (!article) {
          throw new EntityNotFoundError(entityType, entityId);
        }

        return {
          type: 'article',
          id: entityId,
          title: article.title,
          description: article.excerpt || null,
          image_url: article.featured_image || null,
          url: `/articles/${article.slug}`,
          metadata: {
            reading_time: article.reading_time,
            published_at: article.published_at
          }
        };
      }

      // Phase 8: Newsletter preview
      case 'newsletter': {
        // Newsletter implementation - check if table exists
        const newsletter = await this.getNewsletterPreview(entityId);
        if (!newsletter) {
          throw new EntityNotFoundError(entityType, entityId);
        }

        return {
          type: 'newsletter',
          id: entityId,
          title: newsletter.title,
          description: newsletter.description || null,
          image_url: newsletter.cover_image || null,
          url: `/newsletters/${entityId}`,
          metadata: {
            author: newsletter.author_name,
            issue_date: newsletter.issue_date
          }
        };
      }

      // Phase 8: Podcast preview
      case 'podcast': {
        const { ContentService } = await import('@core/services/ContentService');
        const contentService = new ContentService(this.db);
        const podcast = await contentService.getPodcastBySlug(entityId);

        if (!podcast) {
          throw new EntityNotFoundError(entityType, entityId);
        }

        return {
          type: 'podcast',
          id: entityId,
          title: podcast.title,
          description: podcast.description || null,
          image_url: podcast.thumbnail || null,
          url: `/podcasts/${podcast.slug}`,
          metadata: {
            episode_number: podcast.episode_number,
            season_number: podcast.season_number,
            duration: podcast.duration
          }
        };
      }

      // Phase 8: Video preview
      case 'video': {
        const { ContentService } = await import('@core/services/ContentService');
        const contentService = new ContentService(this.db);
        const video = await contentService.getVideoBySlug(entityId);

        if (!video) {
          throw new EntityNotFoundError(entityType, entityId);
        }

        return {
          type: 'video',
          id: entityId,
          title: video.title,
          description: video.description || null,
          image_url: video.thumbnail || null,
          url: `/videos/${video.slug}`,
          metadata: {
            duration: video.duration
          }
        };
      }

      // Phase 4: Job posting preview
      case 'job_posting': {
        const { getJobService } = await import('@core/services/ServiceRegistry');
        const jobService = getJobService();

        // entityId may be numeric ID or slug - prefer slug-based lookup for listing info
        const numericId = parseInt(entityId);
        let job = await jobService.getBySlug(entityId);

        // Fallback: if not found by slug, try by ID then get listing info
        if (!job && !isNaN(numericId)) {
          const basicJob = await jobService.getById(numericId);
          if (basicJob) {
            // Try to get by slug to get listing info
            job = await jobService.getBySlug(basicJob.slug);
          }
        }

        if (!job) {
          throw new EntityNotFoundError(entityType, entityId);
        }

        // Build location string
        const location = job.work_location_type === 'remote'
          ? 'Remote'
          : [job.city, job.state].filter(Boolean).join(', ') || 'Location TBD';

        return {
          type: 'job_posting',
          id: entityId,
          title: job.title,
          description: job.description || null,
          image_url: job.listing_logo || null,
          url: `/jobs/${job.slug}`,
          metadata: {
            company: job.listing_name,
            employment_type: job.employment_type,
            location
          }
        };
      }

      // Offer preview
      case 'offer': {
        const { getOfferService } = await import('@core/services/ServiceRegistry');
        const offerService = getOfferService();

        // entityId may be numeric ID or slug - try slug first, fallback to ID
        const numericId = parseInt(entityId);
        let offer = await offerService.getOfferWithListing(entityId);

        // Fallback: if not found by slug, try by ID then get by slug
        if (!offer && !isNaN(numericId)) {
          const basicOffer = await offerService.getById(numericId);
          if (basicOffer) {
            offer = await offerService.getOfferWithListing(basicOffer.slug);
          }
        }

        if (!offer) {
          throw new EntityNotFoundError(entityType, entityId);
        }

        // Build savings text
        let savingsText = '';
        if (offer.discount_percentage) {
          savingsText = `${offer.discount_percentage}% OFF`;
        } else if (offer.original_price && offer.sale_price) {
          const savings = Number(offer.original_price) - Number(offer.sale_price);
          savingsText = `Save $${savings.toFixed(2)}`;
        }

        const locationText = [offer.city, offer.state].filter(Boolean).join(', ') || '';

        return {
          type: 'offer',
          id: entityId,
          title: offer.title,
          description: offer.description || null,
          image_url: offer.image || offer.listing_logo || null,
          url: `/offers/${offer.slug}`,
          metadata: {
            business: offer.listing_name,
            savings: savingsText,
            location: locationText
          }
        };
      }

      default:
        throw new InvalidEntityTypeError(entityType);
    }
  }

  /**
   * Get newsletter preview (helper)
   * Phase 8: Newsletter support
   */
  private async getNewsletterPreview(newsletterId: string): Promise<{
    title: string;
    description: string | null;
    cover_image: string | null;
    author_name: string | null;
    issue_date: Date | null;
  } | null> {
    // Check if newsletters table exists
    const query = `
      SELECT
        n.title,
        n.description,
        n.cover_image,
        u.first_name AS author_first_name,
        u.last_name AS author_last_name,
        n.issue_date
      FROM newsletters n
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.id = ? OR n.slug = ?
      LIMIT 1
    `;

    try {
      const result = await this.db.query<RowDataPacket>(query, [newsletterId, newsletterId]);
      if (!result.rows || result.rows.length === 0) return null;

      const row = result.rows[0];
      if (!row) return null;

      return {
        title: row.title,
        description: row.description,
        cover_image: row.cover_image,
        author_name: row.author_first_name
          ? `${row.author_first_name} ${row.author_last_name || ''}`.trim()
          : null,
        issue_date: row.issue_date
      };
    } catch (error) {
      // TD-003: Consistent error handling - throw EntityNotFoundError
      this.logger.error('Newsletter lookup failed', error instanceof Error ? error : new Error(String(error)), {
        operation: 'getNewsletterPreview',
        newsletterId
      });
      throw new EntityNotFoundError('newsletter', newsletterId);
    }
  }

  // ==========================================================================
  // UNIFIED QUERIES (Phase 0 - Basic Implementation)
  // ==========================================================================

  /**
   * Get all sharing activities by user (sent)
   * Phase 0: Returns platform invites only
   * Phase 1+: Returns platform invites + recommendations
   */
  async getAllByUserId(
    userId: number,
    filters?: SharingFilters
  ): Promise<Sharing[]> {
    let query = `
      SELECT * FROM user_referrals
      WHERE referrer_user_id = ?
    `;
    const params: (string | number | null | undefined)[] = [userId];

    // Apply entity_type filter
    if (filters?.entity_type) {
      query += ' AND entity_type = ?';
      params.push(filters.entity_type);
    }

    // Apply status filter
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    // Apply reward_status filter
    if (filters?.reward_status) {
      query += ' AND reward_status = ?';
      params.push(filters.reward_status);
    }

    // Apply date filters
    if (filters?.from_date) {
      query += ' AND created_at >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND created_at <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query<RowDataPacket>(query, params);
    const rows = result.rows || [];

    return rows.map(row => this.mapRowToSharing(row));
  }

  /**
   * Get sharing activity by ID
   * Phase 1: Direct query to get all fields including entity_type for recommendations
   */
  async getById(sharingId: number): Promise<Sharing> {
    const query = `SELECT * FROM user_referrals WHERE id = ?`;
    const result = await this.db.query<RowDataPacket>(query, [sharingId]);
    const rows = result.rows || [];

    if (rows.length === 0 || !rows[0]) {
      throw new BizError({
        code: 'SHARING_NOT_FOUND',
        message: `Sharing activity not found: ${sharingId}`,
        userMessage: 'The requested sharing activity was not found'
      });
    }

    return this.mapRowToSharing(rows[0]);
  }

  // ==========================================================================
  // STATISTICS (Phase 0 - Partial Implementation)
  // ==========================================================================

  /**
   * Get unified sharing statistics
   * Phase 0: Returns referral stats + placeholder recommendation stats
   * Phase 1+: Returns actual recommendation stats
   */
  async getStats(userId: number): Promise<SharingStats> {
    const referralStats = await this.referralService.getStats(userId);

    // Phase 0: No recommendations yet
    return {
      ...referralStats,
      total_recommendations_sent: 0,
      total_recommendations_received: 0,
      recommendation_acceptance_rate: 0,
      recommendation_points_earned: 0
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Convert Referral to Sharing interface
   */
  private convertToSharing(referral: Referral): Sharing {
    return {
      ...referral,
      entity_type: 'platform_invite',
      entity_id: null,
      recipient_user_id: null
    };
  }

  /**
   * Map database row to Sharing interface
   */
  private mapRowToSharing(row: RowDataPacket): Sharing {
    return {
      id: row.id,
      referrer_user_id: row.referrer_user_id,
      contact_id: row.contact_id,
      referred_email: row.referred_email,
      referred_phone: row.referred_phone,
      referred_name: row.referred_name,
      referral_code: row.referral_code,
      referral_message: row.referral_message,
      referral_link: row.referral_link,
      status: row.status,
      reward_status: row.reward_status,
      reward_points: row.reward_points,
      sent_at: row.sent_at ? new Date(row.sent_at) : null,
      viewed_at: row.viewed_at ? new Date(row.viewed_at) : null,
      registered_at: row.registered_at ? new Date(row.registered_at) : null,
      registered_user_id: row.registered_user_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      entity_type: row.entity_type || 'platform_invite',
      entity_id: row.entity_id || null,
      recipient_user_id: row.recipient_user_id || null
    };
  }

  /**
   * Validate entity type
   */
  private validateEntityType(entityType: string): EntityType {
    if (!isEntityType(entityType)) {
      throw new InvalidEntityTypeError(entityType);
    }
    return entityType;
  }

  /**
   * Check if entity type requires entity_id
   */
  private requiresEntityId(entityType: EntityType): boolean {
    return isRecommendationType(entityType);
  }

  /**
   * Validate that recipient user exists
   */
  private async validateRecipient(userId: number): Promise<boolean> {
    const query = `
      SELECT id FROM users WHERE id = ? AND is_active = 1
    `;
    const result = await this.db.query<RowDataPacket>(query, [userId]);
    return (result.rows?.length || 0) > 0;
  }

  /**
   * Find existing recommendation
   */
  private async findExistingRecommendation(
    senderUserId: number,
    recipientUserId: number,
    entityType: EntityType,
    entityId: string
  ): Promise<Sharing | null> {
    const query = `
      SELECT * FROM user_referrals
      WHERE referrer_user_id = ?
        AND recipient_user_id = ?
        AND entity_type = ?
        AND entity_id = ?
    `;
    const result = await this.db.query<RowDataPacket>(query, [
      senderUserId,
      recipientUserId,
      entityType,
      entityId
    ]);

    const row = result.rows?.[0];
    return row ? this.mapRowToSharing(row) : null;
  }

  /**
   * Generate unique share code for recommendations
   * @returns 8-character alphanumeric code (excludes ambiguous characters)
   */
  private generateShareCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * @deprecated Use generateShareCode() instead
   * @alias generateShareCode
   */
  private generateReferralCode(): string {
    return this.generateShareCode();
  }

  /**
   * Award points for recommendation
   * Phase 1: Basic point awarding (future: integrate with gamification service)
   */
  private async awardRecommendationPoints(
    userId: number,
    entityType: EntityType
  ): Promise<void> {
    // Phase 1: Log points but don't integrate with gamification yet
    // Future: Call gamification service to actually award points

    // Determine points based on entity type
    let points = 0;
    switch (entityType) {
      case 'user':
        points = 10;
        break;
      case 'listing':
      case 'event':
        points = 5;
        break;
      default:
        points = 3;
    }

    // Points are awarded through awardPointsToSender() method (line 1200+)
    // This helper only calculates the point value
  }

  // ==========================================================================
  // PHASE 4: FEEDBACK LOOP
  // ==========================================================================

  /**
   * Mark recommendation as helpful or not helpful
   * Phase 4: Enables recipient feedback on recommendations
   * @returns Updated helpful status and points awarded to sender
   */
  async markHelpful(
    userId: number,
    recommendationId: number,
    isHelpful: boolean
  ): Promise<{ is_helpful: boolean; points_awarded: number }> {
    // Verify recipient owns this recommendation
    const rec = await this.getRecipientRecommendation(userId, recommendationId);
    if (!rec) {
      throw new BizError({
        code: 'RECOMMENDATION_NOT_FOUND',
        message: 'Recommendation not found or access denied'
      });
    }

    // Check if already rated
    if (rec.is_helpful !== null) {
      throw new BizError({
        code: 'ALREADY_RATED',
        message: 'You have already rated this recommendation'
      });
    }

    // Update the recommendation
    const query = `
      UPDATE user_referrals
      SET is_helpful = ?, helpful_at = CURRENT_TIMESTAMP
      WHERE id = ? AND recipient_user_id = ?
    `;
    await this.db.query(query, [isHelpful, recommendationId, userId]);

    // Track engagement
    await this.trackEngagement(
      recommendationId,
      userId,
      isHelpful ? 'helpful_yes' : 'helpful_no'
    );

    // Award points to sender if helpful
    let pointsAwarded = 0;
    if (isHelpful) {
      const { SHARING_POINTS } = await import('../types/sharing');
      pointsAwarded = SHARING_POINTS.recommendation_helpful;
      await this.awardPointsToSender(
        rec.referrer_user_id,
        pointsAwarded,
        'recommendation_helpful',
        {
          recommendationId,
          recipientUserId: userId,
          entityType: rec.entity_type,
          entityId: rec.entity_id || undefined
        }
      );

      // Send notification to sender
      await this.notifySenderOfFeedback(rec.referrer_user_id, userId, 'helpful');
    }

    return { is_helpful: isHelpful, points_awarded: pointsAwarded };
  }

  /**
   * Send thank you message to recommendation sender
   * Phase 4: Social recognition feature
   */
  async sendThankYou(
    userId: number,
    recommendationId: number,
    message: string
  ): Promise<{ success: boolean; points_awarded: number }> {
    // Verify recipient owns this recommendation
    const rec = await this.getRecipientRecommendation(userId, recommendationId);
    if (!rec) {
      throw new BizError({
        code: 'RECOMMENDATION_NOT_FOUND',
        message: 'Recommendation not found or access denied'
      });
    }

    // Check if already thanked
    if (rec.thanked_at) {
      throw new BizError({
        code: 'ALREADY_THANKED',
        message: 'You have already thanked for this recommendation'
      });
    }

    // Sanitize and limit message length
    const sanitizedMessage = message.trim().slice(0, 500);

    // Update the recommendation
    const query = `
      UPDATE user_referrals
      SET thank_message = ?, thanked_at = CURRENT_TIMESTAMP
      WHERE id = ? AND recipient_user_id = ?
    `;
    await this.db.query(query, [sanitizedMessage, recommendationId, userId]);

    // Track engagement
    await this.trackEngagement(recommendationId, userId, 'thanked', {
      message_length: sanitizedMessage.length
    });

    // Award bonus points to sender
    const { SHARING_POINTS } = await import('../types/sharing');
    const pointsAwarded = SHARING_POINTS.thank_received;
    await this.awardPointsToSender(
      rec.referrer_user_id,
      pointsAwarded,
      'recommendation_thanked',
      {
        recommendationId,
        recipientUserId: userId,
        entityType: rec.entity_type,
        entityId: rec.entity_id || undefined
      }
    );

    // Send thank-you notification to sender
    await this.notifySenderOfThankYou(rec.referrer_user_id, userId, sanitizedMessage, rec);

    return { success: true, points_awarded: pointsAwarded };
  }

  /**
   * Get sender's recommendation impact statistics
   * Phase 4: Shows sender how their recommendations are performing
   */
  async getImpactStats(userId: number): Promise<import('../types/sharing').SenderImpactStats> {
    const query = `
      SELECT
        COUNT(*) as total_sent,
        SUM(CASE WHEN viewed_at IS NOT NULL THEN 1 ELSE 0 END) as total_viewed,
        SUM(CASE WHEN is_helpful = TRUE THEN 1 ELSE 0 END) as total_helpful,
        SUM(CASE WHEN is_helpful = FALSE THEN 1 ELSE 0 END) as total_not_helpful,
        SUM(CASE WHEN thanked_at IS NOT NULL THEN 1 ELSE 0 END) as total_thanked
      FROM user_referrals
      WHERE referrer_user_id = ?
        AND entity_type != 'platform_invite'
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const row = result.rows?.[0] || {};

    const totalSent = bigIntToNumber(row.total_sent) || 0;
    const totalViewed = bigIntToNumber(row.total_viewed) || 0;
    const totalHelpful = bigIntToNumber(row.total_helpful) || 0;
    const totalNotHelpful = bigIntToNumber(row.total_not_helpful) || 0;
    const totalThanked = bigIntToNumber(row.total_thanked) || 0;

    const totalRated = totalHelpful + totalNotHelpful;

    return {
      total_sent: totalSent,
      total_viewed: totalViewed,
      total_helpful: totalHelpful,
      total_not_helpful: totalNotHelpful,
      total_thanked: totalThanked,
      view_rate: totalSent > 0 ? Math.round((totalViewed / totalSent) * 100) : 0,
      helpful_rate: totalRated > 0 ? Math.round((totalHelpful / totalRated) * 100) : 0,
      thank_rate: totalSent > 0 ? Math.round((totalThanked / totalSent) * 100) : 0
    };
  }

  /**
   * Get recent feedback received on sent recommendations
   * Phase 4: Shows sender recent helpful ratings and thank yous
   */
  async getReceivedFeedback(
    userId: number,
    limit: number = 10
  ): Promise<import('../types/sharing').FeedbackItem[]> {
    const query = `
      SELECT
        ur.id,
        ur.is_helpful,
        ur.thank_message,
        ur.helpful_at,
        ur.thanked_at,
        ur.entity_type,
        ur.entity_id,
        u.display_name as recipient_name,
        u.avatar_url as recipient_avatar
      FROM user_referrals ur
      LEFT JOIN users u ON ur.recipient_user_id = u.id
      WHERE ur.referrer_user_id = ?
        AND ur.entity_type != 'platform_invite'
        AND (ur.helpful_at IS NOT NULL OR ur.thanked_at IS NOT NULL)
      ORDER BY GREATEST(COALESCE(ur.helpful_at, '1970-01-01'), COALESCE(ur.thanked_at, '1970-01-01')) DESC
      LIMIT ?
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId, limit]);
    const rows = result.rows || [];

    // Enrich with entity titles
    const feedback: import('../types/sharing').FeedbackItem[] = [];
    for (const row of rows) {
      let entityTitle = 'Unknown';
      try {
        const preview = await this.getEntityPreview(row.entity_type, row.entity_id);
        entityTitle = preview.title;
      } catch {
        // Entity may be deleted
      }

      // Add helpful feedback if exists
      if (row.helpful_at && row.is_helpful === true) {
        feedback.push({
          id: row.id,
          type: 'helpful',
          recipient_name: row.recipient_name || 'Someone',
          recipient_avatar: row.recipient_avatar,
          entity_title: entityTitle,
          created_at: new Date(row.helpful_at)
        });
      }

      // Add thank you feedback if exists
      if (row.thanked_at) {
        feedback.push({
          id: row.id,
          type: 'thanked',
          recipient_name: row.recipient_name || 'Someone',
          recipient_avatar: row.recipient_avatar,
          entity_title: entityTitle,
          message: row.thank_message,
          created_at: new Date(row.thanked_at)
        });
      }
    }

    // Sort by created_at descending
    return feedback
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }

  // ==========================================================================
  // ACTIVITY LOG (Recommendation Activity Tracking)
  // ==========================================================================

  /**
   * Get unified activity log combining sent/received recommendations and points events
   * Returns chronological feed of all recommendation activity for a user
   */
  async getActivityLog(
    userId: number,
    options: {
      page?: number;
      per_page?: number;
      filter?: 'all' | 'sent' | 'received' | 'points';
      entity_type?: string;
      start_date?: Date;
      end_date?: Date;
    } = {}
  ): Promise<{
    items: ActivityLogItem[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const page = options.page || 1;
    const perPage = options.per_page || 20;
    const offset = (page - 1) * perPage;

    // Build UNION query for combined activity feed
    const unionParts: string[] = [];
    const countParts: string[] = [];
    const params: (string | number | Date)[] = [];
    const countParams: (string | number | Date)[] = [];

    // Sent recommendations
    if (options.filter === 'all' || options.filter === 'sent' || !options.filter) {
      let sentQuery = `
        SELECT
          ur.id,
          'sent' COLLATE utf8mb4_unicode_ci as activity_type,
          ur.entity_type,
          ur.entity_id,
          ur.referral_message as message,
          ur.created_at,
          COALESCE(uw.points_earned, 0) as points_earned,
          u.display_name as other_user_name,
          u.avatar_url as other_user_avatar,
          ur.is_helpful,
          ur.thanked_at,
          ur.viewed_at
        FROM user_referrals ur
        LEFT JOIN users u ON ur.recipient_user_id = u.id
        LEFT JOIN user_rewards uw ON uw.referral_id = ur.id AND uw.reward_type = 'recommendation_sent'
        WHERE ur.referrer_user_id = ?
          AND ur.entity_type != 'platform_invite'
      `;
      params.push(userId);
      countParams.push(userId);

      let sentCountQuery = `
        SELECT COUNT(*) as cnt FROM user_referrals ur
        WHERE ur.referrer_user_id = ? AND ur.entity_type != 'platform_invite'
      `;

      if (options.entity_type) {
        sentQuery += ' AND ur.entity_type = ?';
        sentCountQuery += ' AND ur.entity_type = ?';
        params.push(options.entity_type);
        countParams.push(options.entity_type);
      }

      if (options.start_date) {
        sentQuery += ' AND ur.created_at >= ?';
        sentCountQuery += ' AND ur.created_at >= ?';
        params.push(options.start_date);
        countParams.push(options.start_date);
      }
      if (options.end_date) {
        sentQuery += ' AND ur.created_at <= ?';
        sentCountQuery += ' AND ur.created_at <= ?';
        params.push(options.end_date);
        countParams.push(options.end_date);
      }

      unionParts.push(sentQuery);
      countParts.push(sentCountQuery);
    }

    // Received recommendations
    if (options.filter === 'all' || options.filter === 'received' || !options.filter) {
      let recvQuery = `
        SELECT
          ur.id,
          'received' COLLATE utf8mb4_unicode_ci as activity_type,
          ur.entity_type,
          ur.entity_id,
          ur.referral_message as message,
          ur.created_at,
          0 as points_earned,
          u.display_name as other_user_name,
          u.avatar_url as other_user_avatar,
          ur.is_helpful,
          ur.thanked_at,
          ur.viewed_at
        FROM user_referrals ur
        LEFT JOIN users u ON ur.referrer_user_id = u.id
        WHERE ur.recipient_user_id = ?
          AND ur.entity_type != 'platform_invite'
      `;
      params.push(userId);
      countParams.push(userId);

      let recvCountQuery = `
        SELECT COUNT(*) as cnt FROM user_referrals ur
        WHERE ur.recipient_user_id = ? AND ur.entity_type != 'platform_invite'
      `;

      if (options.entity_type) {
        recvQuery += ' AND ur.entity_type = ?';
        recvCountQuery += ' AND ur.entity_type = ?';
        params.push(options.entity_type);
        countParams.push(options.entity_type);
      }

      if (options.start_date) {
        recvQuery += ' AND ur.created_at >= ?';
        recvCountQuery += ' AND ur.created_at >= ?';
        params.push(options.start_date);
        countParams.push(options.start_date);
      }
      if (options.end_date) {
        recvQuery += ' AND ur.created_at <= ?';
        recvCountQuery += ' AND ur.created_at <= ?';
        params.push(options.end_date);
        countParams.push(options.end_date);
      }

      unionParts.push(recvQuery);
      countParts.push(recvCountQuery);
    }

    // Points/reward events
    if (options.filter === 'all' || options.filter === 'points' || !options.filter) {
      let pointsQuery = `
        SELECT
          uw.id,
          'points' COLLATE utf8mb4_unicode_ci as activity_type,
          uw.reward_type as entity_type,
          CAST(uw.referral_id AS CHAR) COLLATE utf8mb4_unicode_ci as entity_id,
          uw.description as message,
          uw.created_at,
          uw.points_earned,
          CAST(NULL AS CHAR) COLLATE utf8mb4_unicode_ci as other_user_name,
          CAST(NULL AS CHAR) COLLATE utf8mb4_unicode_ci as other_user_avatar,
          NULL as is_helpful,
          NULL as thanked_at,
          NULL as viewed_at
        FROM user_rewards uw
        WHERE uw.user_id = ?
      `;
      params.push(userId);
      countParams.push(userId);

      let pointsCountQuery = `
        SELECT COUNT(*) as cnt FROM user_rewards uw
        WHERE uw.user_id = ?
      `;

      if (options.start_date) {
        pointsQuery += ' AND uw.created_at >= ?';
        pointsCountQuery += ' AND uw.created_at >= ?';
        params.push(options.start_date);
        countParams.push(options.start_date);
      }
      if (options.end_date) {
        pointsQuery += ' AND uw.created_at <= ?';
        pointsCountQuery += ' AND uw.created_at <= ?';
        params.push(options.end_date);
        countParams.push(options.end_date);
      }

      unionParts.push(pointsQuery);
      countParts.push(pointsCountQuery);
    }

    if (unionParts.length === 0) {
      return { items: [], total: 0, page, per_page: perPage, total_pages: 0 };
    }

    // Get total count
    const countQuery = countParts.map(q => `(${q})`).join(' UNION ALL ');
    const countResult = await this.db.query<RowDataPacket>(
      `SELECT SUM(cnt) as total FROM (${countQuery}) as counts`,
      countParams
    );
    const total = bigIntToNumber(countResult.rows?.[0]?.total) || 0;

    // Get paginated items
    const fullQuery = `
      ${unionParts.join(' UNION ALL ')}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(perPage, offset);

    const result = await this.db.query<RowDataPacket>(fullQuery, params);
    const rows = result.rows || [];

    // Enrich with entity previews
    const items: ActivityLogItem[] = await Promise.all(
      rows.map(async (row) => {
        let entityTitle: string | null = null;
        let entityImage: string | null = null;

        if (row.activity_type !== 'points' && row.entity_type && row.entity_id) {
          try {
            const preview = await this.getEntityPreview(row.entity_type, row.entity_id);
            entityTitle = preview.title;
            entityImage = preview.image_url;
          } catch {
            // Entity may have been deleted
          }
        }

        return {
          id: row.id,
          activity_type: row.activity_type as 'sent' | 'received' | 'points',
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          entity_title: entityTitle,
          entity_image: entityImage,
          message: row.message,
          created_at: new Date(row.created_at),
          points_earned: row.points_earned || 0,
          other_user_name: row.other_user_name || null,
          other_user_avatar: row.other_user_avatar || null,
          is_helpful: row.is_helpful ?? null,
          thanked_at: row.thanked_at ? new Date(row.thanked_at) : null,
          viewed_at: row.viewed_at ? new Date(row.viewed_at) : null
        };
      })
    );

    return {
      items,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage)
    };
  }

  /**
   * Get points breakdown/ledger for recommendation activity
   * Returns categorized points summary
   */
  async getPointsLedger(userId: number): Promise<PointsLedger> {
    // Points earned per entity type (JOIN user_rewards via referral_id for actual points)
    const entityPointsQuery = `
      SELECT
        ur.entity_type,
        COUNT(DISTINCT ur.id) as count,
        COALESCE(SUM(uw.points_earned), 0) as points
      FROM user_referrals ur
      LEFT JOIN user_rewards uw ON uw.referral_id = ur.id AND uw.reward_type = 'recommendation_sent'
      WHERE ur.referrer_user_id = ?
        AND ur.entity_type != 'platform_invite'
      GROUP BY ur.entity_type
    `;

    // All reward points grouped by reward_type
    const allRewardsQuery = `
      SELECT
        reward_type,
        COUNT(*) as count,
        COALESCE(SUM(points_earned), 0) as points
      FROM user_rewards
      WHERE user_id = ?
      GROUP BY reward_type
    `;

    // Badge details for achievements display
    const badgesQuery = `
      SELECT badge_id, description, created_at
      FROM user_rewards
      WHERE user_id = ? AND reward_type = 'badge_earned' AND badge_id IS NOT NULL
      ORDER BY created_at DESC
    `;

    const [entityResult, rewardsResult, badgesResult] = await Promise.all([
      this.db.query<RowDataPacket>(entityPointsQuery, [userId]),
      this.db.query<RowDataPacket>(allRewardsQuery, [userId]),
      this.db.query<RowDataPacket>(badgesQuery, [userId])
    ]);

    const entityRows = entityResult.rows || [];
    const rewardsRows = rewardsResult.rows || [];
    const badgeRows = badgesResult.rows || [];

    const byEntityType: Record<string, { count: number; points: number }> = {};
    for (const row of entityRows) {
      byEntityType[row.entity_type] = {
        count: bigIntToNumber(row.count) || 0,
        points: bigIntToNumber(row.points) || 0
      };
    }

    // Parse all reward types from user_rewards
    const rewardsByType: Record<string, { count: number; points: number }> = {};
    for (const row of rewardsRows) {
      rewardsByType[row.reward_type] = {
        count: bigIntToNumber(row.count) || 0,
        points: bigIntToNumber(row.points) || 0
      };
    }

    const zeroPts = { count: 0, points: 0 };

    // Total = sum of all user_rewards points (single source of truth)
    const totalPoints = Object.values(rewardsByType).reduce((sum, r) => sum + r.points, 0);

    return {
      total_points: totalPoints,
      by_entity_type: byEntityType,
      bonus_points: {
        helpful: rewardsByType['recommendation_helpful'] || zeroPts,
        thank_you: rewardsByType['recommendation_thanked'] || zeroPts
      },
      referral_points: {
        referral_sent: rewardsByType['referral_sent'] || zeroPts,
        referral_registered: rewardsByType['referral_registered'] || zeroPts,
        referral_connected: rewardsByType['referral_connected'] || zeroPts
      },
      badge_points: rewardsByType['badge_earned'] || zeroPts,
      milestone_points: rewardsByType['milestone_reached'] || zeroPts,
      badges_earned: badgeRows.map(b => ({
        badge_id: b.badge_id,
        description: b.description || b.badge_id,
        earned_at: new Date(b.created_at)
      }))
    };
  }

  // ==========================================================================
  // HELPER METHODS (Phase 4)
  // ==========================================================================

  /**
   * Get recommendation where user is recipient
   */
  private async getRecipientRecommendation(
    userId: number,
    recommendationId: number
  ): Promise<{ referrer_user_id: number; is_helpful: boolean | null; thanked_at: Date | null; entity_type: string; entity_id: string | null } | null> {
    const query = `
      SELECT referrer_user_id, is_helpful, thanked_at, entity_type, entity_id
      FROM user_referrals
      WHERE id = ? AND recipient_user_id = ?
    `;
    const result = await this.db.query<RowDataPacket>(query, [recommendationId, userId]);
    const row = result.rows?.[0];
    return row ? {
      referrer_user_id: row.referrer_user_id,
      is_helpful: row.is_helpful,
      thanked_at: row.thanked_at ? new Date(row.thanked_at) : null,
      entity_type: row.entity_type,
      entity_id: row.entity_id
    } : null;
  }

  /**
   * Track engagement event
   */
  private async trackEngagement(
    recommendationId: number,
    userId: number,
    engagementType: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const query = `
      INSERT INTO recommendation_engagement (
        recommendation_id, user_id, engagement_type, metadata, created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await this.db.query(query, [
      recommendationId,
      userId,
      engagementType,
      metadata ? JSON.stringify(metadata) : null
    ]);
  }

  /**
   * Award points to recommendation sender (Phase 5: Now fully integrated)
   */
  private async awardPointsToSender(
    senderUserId: number,
    points: number,
    reason: 'recommendation_sent' | 'recommendation_helpful' | 'recommendation_thanked',
    options: {
      recommendationId?: number;
      recipientUserId?: number;
      entityType?: string;
      entityId?: string;
    } = {}
  ): Promise<void> {
    try {
      await this.rewardService.recordRecommendationReward(senderUserId, reason, points, options);
    } catch (error) {
      // Log but don't fail the recommendation operation
      this.logger.error('Failed to award points to sender', error instanceof Error ? error : new Error(String(error)), {
        operation: 'awardPointsToSender',
        senderUserId,
        points,
        reason
      });
    }
  }

  /**
   * Send notification to sender about helpful rating
   */
  private async notifySenderOfFeedback(
    senderUserId: number,
    recipientUserId: number,
    feedbackType: 'helpful'
  ): Promise<void> {
    try {
      // Get recipient name
      const recipientResult = await this.db.query<RowDataPacket>(
        'SELECT display_name, username FROM users WHERE id = ?',
        [recipientUserId]
      );
      const recipient = recipientResult.rows?.[0];
      const recipientName = recipient?.display_name || recipient?.username || 'Someone';

      await this.notificationService.dispatch({
        type: 'recommendation.helpful_marked',
        recipientId: senderUserId,
        title: 'Helpful recommendation!',
        message: `${recipientName} found your recommendation helpful`,
        priority: 'normal',
        triggeredBy: recipientUserId,
        metadata: {
          recipient_user_id: recipientUserId,
          feedback_type: feedbackType
        }
      });
    } catch (error) {
      this.logger.error('Failed to send feedback notification', error instanceof Error ? error : new Error(String(error)), {
        operation: 'notifySenderOfFeedback',
        senderUserId,
        recipientUserId,
        feedbackType
      });
    }
  }

  /**
   * Send thank-you notification to sender
   */
  private async notifySenderOfThankYou(
    senderUserId: number,
    recipientUserId: number,
    message: string,
    recommendation: { entity_type: string; entity_id: string | null }
  ): Promise<void> {
    try {
      // Get recipient name
      const recipientResult = await this.db.query<RowDataPacket>(
        'SELECT display_name, username FROM users WHERE id = ?',
        [recipientUserId]
      );
      const recipient = recipientResult.rows?.[0];
      const recipientName = recipient?.display_name || recipient?.username || 'Someone';

      // Get entity title for context
      let entityTitle = '';
      try {
        if (recommendation.entity_type && recommendation.entity_id) {
          const preview = await this.getEntityPreview(
            recommendation.entity_type as EntityType,
            recommendation.entity_id
          );
          entityTitle = preview.title;
        }
      } catch {
        // Entity may be deleted
      }

      await this.notificationService.dispatch({
        type: 'recommendation.thanked',
        recipientId: senderUserId,
        title: 'Thank you received!',
        message: `${recipientName} thanked you for recommending ${entityTitle || 'something'}`,
        priority: 'normal',
        triggeredBy: recipientUserId,
        metadata: {
          recipient_user_id: recipientUserId,
          thank_message: message,
          entity_type: recommendation.entity_type,
          entity_id: recommendation.entity_id
        }
      });
    } catch (error) {
      this.logger.error('Failed to send thank-you notification', error instanceof Error ? error : new Error(String(error)), {
        operation: 'notifySenderOfThankYou',
        senderUserId,
        recipientUserId,
        entityType: recommendation.entity_type
      });
    }
  }

  // ==========================================================================
  // PHASE 8: CONTENT CREATOR ANALYTICS
  // ==========================================================================

  /**
   * Get content creator statistics
   * Phase 8: Creator analytics
   */
  async getCreatorContentStats(userId: number): Promise<ContentCreatorStats> {
    // Query for content recommendations by type
    const query = `
      SELECT
        ur.entity_type,
        COUNT(*) AS recommendation_count,
        SUM(CASE WHEN ur.viewed_at IS NOT NULL THEN 1 ELSE 0 END) AS view_count,
        SUM(CASE WHEN ur.is_helpful = TRUE THEN 1 ELSE 0 END) AS helpful_count,
        SUM(CASE WHEN ur.is_helpful IS NOT NULL THEN 1 ELSE 0 END) AS rated_count
      FROM user_referrals ur
      WHERE ur.entity_type IN ('article', 'newsletter', 'podcast', 'video')
        AND ur.referrer_user_id = ?
      GROUP BY ur.entity_type
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const rows = result.rows || [];

    // Initialize stats structure
    const stats: ContentCreatorStats = {
      total_content: 0,
      content_recommended: 0,
      total_recommendations: 0,
      recommendation_views: 0,
      helpful_rate: 0,
      by_type: {
        articles: { count: 0, recommendations: 0, views: 0, helpful_rate: 0 },
        newsletters: { count: 0, recommendations: 0, views: 0, helpful_rate: 0 },
        podcasts: { count: 0, recommendations: 0, views: 0, helpful_rate: 0 },
        videos: { count: 0, recommendations: 0, views: 0, helpful_rate: 0 }
      }
    };

    let totalHelpful = 0;
    let totalRated = 0;

    for (const row of rows) {
      const recCount = bigIntToNumber(row.recommendation_count);
      const viewCount = bigIntToNumber(row.view_count);
      const helpfulCount = bigIntToNumber(row.helpful_count);
      const ratedCount = bigIntToNumber(row.rated_count);

      stats.total_recommendations += recCount;
      stats.recommendation_views += viewCount;
      totalHelpful += helpfulCount;
      totalRated += ratedCount;

      const helpfulRate = ratedCount > 0 ? (helpfulCount / ratedCount) * 100 : 0;

      switch (row.entity_type) {
        case 'article':
          stats.by_type.articles = {
            count: 0, // Would need separate query for content count
            recommendations: recCount,
            views: viewCount,
            helpful_rate: Math.round(helpfulRate)
          };
          break;
        case 'newsletter':
          stats.by_type.newsletters = {
            count: 0,
            recommendations: recCount,
            views: viewCount,
            helpful_rate: Math.round(helpfulRate)
          };
          break;
        case 'podcast':
          stats.by_type.podcasts = {
            count: 0,
            recommendations: recCount,
            views: viewCount,
            helpful_rate: Math.round(helpfulRate)
          };
          break;
        case 'video':
          stats.by_type.videos = {
            count: 0,
            recommendations: recCount,
            views: viewCount,
            helpful_rate: Math.round(helpfulRate)
          };
          break;
      }
    }

    stats.helpful_rate = totalRated > 0
      ? Math.round((totalHelpful / totalRated) * 100)
      : 0;

    return stats;
  }

  /**
   * Get recommendations for a specific content item
   * Phase 8: Content recommendation tracking
   */
  async getContentRecommendations(
    entityType: ContentEntityType,
    entityId: string,
    pagination: { page: number; pageSize: number }
  ): Promise<{
    recommendations: Array<{
      id: number;
      sender_name: string;
      sender_avatar: string | null;
      recipient_name: string;
      message: string | null;
      created_at: Date;
      is_helpful: boolean | null;
    }>;
    total: number;
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const offset = (pagination.page - 1) * pagination.pageSize;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM user_referrals
      WHERE entity_type = ? AND entity_id = ?
    `;

    const query = `
      SELECT
        ur.id,
        sender.first_name AS sender_first_name,
        sender.last_name AS sender_last_name,
        sender.avatar_url AS sender_avatar,
        recipient.first_name AS recipient_first_name,
        recipient.last_name AS recipient_last_name,
        ur.referral_message AS message,
        ur.created_at,
        ur.is_helpful
      FROM user_referrals ur
      JOIN users sender ON ur.referrer_user_id = sender.id
      LEFT JOIN users recipient ON ur.recipient_user_id = recipient.id
      WHERE ur.entity_type = ? AND ur.entity_id = ?
      ORDER BY ur.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [countResult, dataResult] = await Promise.all([
      this.db.query<RowDataPacket>(countQuery, [entityType, entityId]),
      this.db.query<RowDataPacket>(query, [entityType, entityId, pagination.pageSize, offset])
    ]);

    const total = bigIntToNumber(countResult.rows?.[0]?.total || 0);
    const rows = dataResult.rows || [];

    return {
      recommendations: rows.map(row => ({
        id: row.id,
        sender_name: `${row.sender_first_name} ${row.sender_last_name || ''}`.trim(),
        sender_avatar: row.sender_avatar,
        recipient_name: row.recipient_first_name
          ? `${row.recipient_first_name} ${row.recipient_last_name || ''}`.trim()
          : 'External',
        message: row.message,
        created_at: row.created_at,
        is_helpful: row.is_helpful
      })),
      total,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(total / pagination.pageSize)
      }
    };
  }
}

// ============================================================================
// FACTORY FUNCTION (TD-009: Test Mocking Support)
// ============================================================================

/**
 * Create SharingService with custom dependencies for testing
 *
 * @example
 * ```typescript
 * // In test file
 * const mockRewardService = { recordRecommendationReward: vi.fn() } as unknown as RewardService;
 * const mockNotificationService = { dispatch: vi.fn() } as unknown as NotificationService;
 *
 * const service = createSharingService({
 *   db: mockDb,
 *   rewardService: mockRewardService,
 *   notificationService: mockNotificationService
 * });
 * ```
 */
export function createSharingService(config: SharingServiceConfig): SharingService {
  return new SharingService(config);
}
