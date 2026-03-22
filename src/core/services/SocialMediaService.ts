/**
 * SocialMediaService - Cross-Platform Social Media Posting
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier STANDARD (Phase 1 — no external API calls yet)
 * @phase Tier 5A Social Media Manager - Phase 1
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/json';
import type { SocialMediaConnectionRow, SocialMediaPostRow } from '@core/types/db-rows';
import type {
  SocialPlatform,
  SocialConnection,
  SocialPost,
  CreateConnectionInput,
  CreatePostInput,
  SocialPostFilters,
  PostToSocialInput,
  PostToSocialResult,
  PostStatusUpdate,
  SchedulePostInput,
  ScheduledPostProcessorResult,
  SocialAnalyticsData,
  SocialAnalyticsSummary,
  SocialPlatformAnalytics,
  SocialTimeSeriesPoint,
  SocialContentTypeAnalytics,
  SocialPostingCadence,
  MetricsSyncResult,
} from '@core/types/social-media';
import { getInternalAnalyticsService, getNotificationService } from '@core/services/ServiceRegistry';
import crypto from 'crypto';
import { ErrorService } from '@core/services/ErrorService';
import type {
  SocialPlatformConfig,
  SocialOAuthStateData,
  SocialOAuthTokens,
} from '@core/types/social-media';

// ============================================================================
// Platform Config Registry (Phase 2 — Facebook + Twitter/X)
// ============================================================================

const SOCIAL_PLATFORM_CONFIGS: Partial<Record<SocialPlatform, SocialPlatformConfig>> = {
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID || '',
    clientSecret: process.env.FACEBOOK_APP_SECRET || '',
    redirectUri: process.env.FACEBOOK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/social/callback/facebook`,
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
  },
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    redirectUri: process.env.TWITTER_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/social/callback/twitter`,
    scopes: ['tweet.write', 'tweet.read', 'users.read', 'offline.access'],
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
  },
  instagram: {
    clientId: process.env.INSTAGRAM_APP_ID || '',
    clientSecret: process.env.INSTAGRAM_APP_SECRET || '',
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/social/callback/instagram`,
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_comments', 'pages_show_list'],
    authUrl: 'https://www.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/social/callback/linkedin`,
    scopes: ['openid', 'profile', 'w_member_social'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  },
  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    redirectUri: process.env.TIKTOK_SM_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/social/callback/tiktok`,
    scopes: ['user.info.basic', 'video.publish', 'video.list'],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  },
  pinterest: {
    clientId: process.env.PINTEREST_APP_ID || '',
    clientSecret: process.env.PINTEREST_APP_SECRET || '',
    redirectUri: process.env.PINTEREST_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/social/callback/pinterest`,
    scopes: ['boards:read', 'pins:read', 'pins:write', 'user_accounts:read'],
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
  },
};

// ============================================================================
// Circuit Breaker (replicated from PlatformSyncService — ADVANCED tier)
// ============================================================================

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  isOpen: boolean;
}

class SocialCircuitBreaker {
  private state: CircuitBreakerState = { failures: 0, lastFailureTime: null, isOpen: false };

  constructor(private maxFailures: number = 5, private resetTimeoutMs: number = 60000) {}

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.isOpen && this.shouldReset()) this.reset();
    if (this.state.isOpen) throw new Error('Circuit breaker open — platform temporarily unavailable');
    try {
      const result = await fn();
      this.state.failures = 0;
      return result;
    } catch (error) {
      this.state.failures++;
      this.state.lastFailureTime = Date.now();
      if (this.state.failures >= this.maxFailures) this.state.isOpen = true;
      throw error;
    }
  }

  private shouldReset(): boolean {
    return !!this.state.lastFailureTime && Date.now() - this.state.lastFailureTime >= this.resetTimeoutMs;
  }

  private reset(): void {
    this.state = { failures: 0, lastFailureTime: null, isOpen: false };
  }
}

// ============================================================================
// OAuth State Store (in-memory with 5-minute TTL)
// ============================================================================

const socialOAuthStateStore = new Map<string, SocialOAuthStateData>();

// Cleanup expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of socialOAuthStateStore.entries()) {
    if (value.expiresAt < now) socialOAuthStateStore.delete(key);
  }
}, 5 * 60 * 1000);

// ============================================================================
// Custom Error Classes
// ============================================================================

export class SocialConnectionNotFoundError extends BizError {
  constructor(id: number) {
    super({
      code: 'SOCIAL_CONNECTION_NOT_FOUND',
      message: `Social media connection not found: ${id}`,
      context: { id },
      userMessage: 'The requested social media connection was not found'
    });
  }
}

export class DuplicateConnectionError extends BizError {
  constructor(listingId: number, platform: SocialPlatform) {
    super({
      code: 'DUPLICATE_SOCIAL_CONNECTION',
      message: `Connection already exists for listing ${listingId} on ${platform}`,
      context: { listingId, platform },
      userMessage: `A ${platform} connection already exists for this listing`
    });
  }
}

// ============================================================================
// SocialMediaService Implementation
// ============================================================================

export class SocialMediaService {
  private db: DatabaseService;
  private circuitBreakers: Partial<Record<SocialPlatform, SocialCircuitBreaker>>;

  constructor(db: DatabaseService) {
    this.db = db;
    this.circuitBreakers = {
      facebook: new SocialCircuitBreaker(5, 60000),
      twitter: new SocialCircuitBreaker(5, 60000),
      instagram: new SocialCircuitBreaker(5, 60000),
      linkedin: new SocialCircuitBreaker(5, 60000),
      tiktok: new SocialCircuitBreaker(5, 60000),
      pinterest: new SocialCircuitBreaker(5, 60000),
    };
  }

  // ==========================================================================
  // CONNECTION OPERATIONS
  // ==========================================================================

  /**
   * Get all active connections for a listing
   */
  async getConnections(listingId: number): Promise<SocialConnection[]> {
    const result: DbResult<SocialMediaConnectionRow> = await this.db.query<SocialMediaConnectionRow>(
      `SELECT id, listing_id, user_id, platform, platform_user_id, platform_username,
              platform_page_name, scopes, is_active, token_expires_at, connected_at, last_used_at,
              created_at, updated_at
       FROM social_media_connections
       WHERE listing_id = ? AND is_active = 1`,
      [listingId]
    );

    return result.rows.map(row => this.mapConnectionRow(row));
  }

  /**
   * Get a single connection by ID
   */
  async getConnectionById(id: number): Promise<SocialConnection | null> {
    const result: DbResult<SocialMediaConnectionRow> = await this.db.query<SocialMediaConnectionRow>(
      `SELECT id, listing_id, user_id, platform, platform_user_id, platform_username,
              platform_page_name, scopes, is_active, token_expires_at, connected_at, last_used_at,
              created_at, updated_at
       FROM social_media_connections
       WHERE id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapConnectionRow(row);
  }

  /**
   * Create a new social media connection
   */
  async createConnection(data: CreateConnectionInput): Promise<SocialConnection> {
    // Check for duplicate connection
    const existing: DbResult<SocialMediaConnectionRow> = await this.db.query<SocialMediaConnectionRow>(
      'SELECT id FROM social_media_connections WHERE listing_id = ? AND platform = ? AND is_active = 1',
      [data.listing_id, data.platform]
    );

    if (existing.rows.length > 0) {
      throw new DuplicateConnectionError(data.listing_id, data.platform);
    }

    const scopesJson = data.scopes ? JSON.stringify(data.scopes) : null;

    // Encrypt tokens if provided (Phase 2 — AES-256-GCM)
    let accessEncrypted: Buffer | null = null;
    let refreshEncrypted: Buffer | null = null;
    let tokenIv: Buffer | null = null;

    if (data.access_token) {
      const result = this.encryptToken(data.access_token);
      accessEncrypted = result.encrypted;
      tokenIv = result.iv;
    }
    if (data.refresh_token) {
      const result = this.encryptToken(data.refresh_token);
      refreshEncrypted = result.encrypted;
      if (!tokenIv) tokenIv = result.iv;
    }

    const insertResult: DbResult<SocialMediaConnectionRow> = await this.db.query<SocialMediaConnectionRow>(
      `INSERT INTO social_media_connections
       (listing_id, user_id, platform, platform_user_id, platform_username,
        platform_page_name, access_token_encrypted, refresh_token_encrypted, token_iv, token_expires_at,
        scopes, connected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.listing_id,
        data.user_id,
        data.platform,
        data.platform_user_id || null,
        data.platform_username || null,
        data.platform_page_name || null,
        accessEncrypted,
        refreshEncrypted,
        tokenIv,
        data.token_expires_at || null,
        scopesJson,
        data.connected_at || new Date()
      ]
    );

    const insertId = insertResult.insertId;
    if (!insertId) {
      throw new BizError({
        code: 'SOCIAL_CONNECTION_CREATE_FAILED',
        message: 'Failed to create social media connection',
        context: { listing_id: data.listing_id, platform: data.platform },
        userMessage: 'Failed to create social media connection'
      });
    }

    const created = await this.getConnectionById(insertId);
    if (!created) {
      throw new BizError({
        code: 'SOCIAL_CONNECTION_CREATE_FAILED',
        message: 'Failed to retrieve created connection',
        context: { insertId },
        userMessage: 'Failed to create social media connection'
      });
    }

    return created;
  }

  /**
   * Update an existing connection
   */
  async updateConnection(id: number, data: Partial<CreateConnectionInput>): Promise<SocialConnection> {
    const existing = await this.getConnectionById(id);
    if (!existing) {
      throw new SocialConnectionNotFoundError(id);
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (data.platform_user_id !== undefined) {
      setClauses.push('platform_user_id = ?');
      params.push(data.platform_user_id);
    }
    if (data.platform_username !== undefined) {
      setClauses.push('platform_username = ?');
      params.push(data.platform_username);
    }
    if (data.platform_page_name !== undefined) {
      setClauses.push('platform_page_name = ?');
      params.push(data.platform_page_name);
    }
    if (data.access_token !== undefined) {
      if (data.access_token) {
        const result = this.encryptToken(data.access_token);
        setClauses.push('access_token_encrypted = ?');
        params.push(result.encrypted);
        setClauses.push('token_iv = ?');
        params.push(result.iv);
      } else {
        setClauses.push('access_token_encrypted = ?');
        params.push(null);
      }
    }
    if (data.refresh_token !== undefined) {
      if (data.refresh_token) {
        const result = this.encryptToken(data.refresh_token);
        setClauses.push('refresh_token_encrypted = ?');
        params.push(result.encrypted);
      } else {
        setClauses.push('refresh_token_encrypted = ?');
        params.push(null);
      }
    }
    if (data.token_expires_at !== undefined) {
      setClauses.push('token_expires_at = ?');
      params.push(data.token_expires_at);
    }
    if (data.scopes !== undefined) {
      setClauses.push('scopes = ?');
      params.push(data.scopes ? JSON.stringify(data.scopes) : null);
    }

    if (setClauses.length === 0) {
      return existing;
    }

    params.push(id);
    await this.db.query(
      `UPDATE social_media_connections SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getConnectionById(id);
    if (!updated) {
      throw new SocialConnectionNotFoundError(id);
    }

    return updated;
  }

  /**
   * Soft delete a connection (set is_active = 0)
   */
  async deleteConnection(id: number): Promise<void> {
    const existing = await this.getConnectionById(id);
    if (!existing) {
      throw new SocialConnectionNotFoundError(id);
    }

    await this.db.query(
      'UPDATE social_media_connections SET is_active = 0 WHERE id = ?',
      [id]
    );
  }

  // ==========================================================================
  // POST OPERATIONS
  // ==========================================================================

  /**
   * Get posts for a listing with optional filters and pagination
   */
  async getPosts(
    listingId: number,
    filters?: SocialPostFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: SocialPost[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['listing_id = ?'];
    const params: unknown[] = [listingId];

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters?.platform) {
      conditions.push('platform = ?');
      params.push(filters.platform);
    }
    if (filters?.contentType) {
      conditions.push('content_type = ?');
      params.push(filters.contentType);
    }
    if (filters?.dateFrom) {
      conditions.push('created_at >= ?');
      params.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      conditions.push('created_at <= ?');
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as total FROM social_media_posts WHERE ${whereClause}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Get paginated rows
    const dataParams = [...params, limit, offset];
    const result: DbResult<SocialMediaPostRow> = await this.db.query<SocialMediaPostRow>(
      `SELECT * FROM social_media_posts WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      dataParams
    );

    return {
      data: result.rows.map(row => this.mapPostRow(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single post by ID
   */
  async getPostById(id: number): Promise<SocialPost | null> {
    const result: DbResult<SocialMediaPostRow> = await this.db.query<SocialMediaPostRow>(
      'SELECT * FROM social_media_posts WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapPostRow(row);
  }

  /**
   * Create a new social media post
   */
  async createPost(data: CreatePostInput): Promise<SocialPost> {
    const insertResult: DbResult<SocialMediaPostRow> = await this.db.query<SocialMediaPostRow>(
      `INSERT INTO social_media_posts
       (connection_id, listing_id, content_type, content_id, platform,
        post_text, post_image_url, post_link, status, scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.connection_id,
        data.listing_id,
        data.content_type || null,
        data.content_id,
        data.platform,
        data.post_text || null,
        data.post_image_url || null,
        data.post_link || null,
        data.status || 'pending',
        data.scheduled_at || null
      ]
    );

    const insertId = insertResult.insertId;
    if (!insertId) {
      throw new BizError({
        code: 'SOCIAL_POST_CREATE_FAILED',
        message: 'Failed to create social media post',
        context: { connection_id: data.connection_id, platform: data.platform },
        userMessage: 'Failed to create social media post'
      });
    }

    const created = await this.getPostById(insertId);
    if (!created) {
      throw new BizError({
        code: 'SOCIAL_POST_CREATE_FAILED',
        message: 'Failed to retrieve created post',
        context: { insertId },
        userMessage: 'Failed to create social media post'
      });
    }

    return created;
  }

  // ==========================================================================
  // POSTING OPERATIONS (Phase 3)
  // ==========================================================================

  /**
   * Post content to a connected social platform
   * Follows EmailService multi-provider dispatch pattern with retry logic
   * @phase Tier 5A Phase 3
   */
  async postToSocial(input: PostToSocialInput): Promise<PostToSocialResult> {
    // 1. Validate connection exists and is active
    const connection = await this.getConnectionById(input.connection_id);
    if (!connection || !connection.is_active) {
      throw new BizError({
        code: 'SOCIAL_CONNECTION_INVALID',
        message: `Connection ${input.connection_id} not found or inactive`,
        context: { connectionId: input.connection_id },
        userMessage: 'The social media connection is not available'
      });
    }

    // 2. Get valid access token (auto-refreshes if expired)
    const accessToken = await this.getValidAccessToken(input.connection_id);

    // 3. Create post record with status='pending'
    const post = await this.createPost({
      connection_id: input.connection_id,
      listing_id: input.listing_id,
      content_type: input.content_type,
      content_id: input.content_id,
      platform: input.platform,
      post_text: input.post_text,
      post_image_url: input.post_image_url,
      post_link: input.post_link,
      status: 'pending',
    });

    // Fire-and-forget: track post creation
    const analyticsService = getInternalAnalyticsService();
    analyticsService.trackEvent({
      eventName: 'social_post_created',
      eventData: { platform: input.platform, contentType: input.content_type, contentId: input.content_id, listingId: input.listing_id },
      userId: connection.user_id,
    }).catch(() => {}); // fire-and-forget

    // 4. Dispatch to platform-specific method with retry (2 attempts, 2s delay)
    const maxAttempts = 2;
    const retryDelayMs = 2000;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let platformResult: { platformPostId: string; platformPostUrl: string };

        switch (input.platform) {
          case 'facebook':
            platformResult = await this.postToFacebook(accessToken, connection, input);
            break;
          case 'twitter':
            platformResult = await this.postToTwitter(accessToken, input);
            break;
          case 'instagram':
            platformResult = await this.postToInstagram(accessToken, connection, input);
            break;
          case 'linkedin':
            platformResult = await this.postToLinkedIn(accessToken, connection, input);
            break;
          case 'tiktok':
            platformResult = await this.postToTikTok(accessToken, connection, input);
            break;
          case 'pinterest':
            platformResult = await this.postToPinterest(accessToken, connection, input);
            break;
          default:
            throw new BizError({
              code: 'UNSUPPORTED_PLATFORM',
              message: `Platform ${input.platform} posting is not yet supported`,
              context: { platform: input.platform },
              userMessage: `Posting to ${input.platform} is not yet supported`
            });
        }

        // 5. On success: update post row
        const postedAt = new Date();
        await this.updatePostStatus(post.id, {
          status: 'posted',
          platform_post_id: platformResult.platformPostId,
          platform_post_url: platformResult.platformPostUrl,
          posted_at: postedAt,
        });

        // Fire-and-forget: track success
        analyticsService.trackEvent({
          eventName: 'social_post_success',
          eventData: { platform: input.platform, contentType: input.content_type, contentId: input.content_id, listingId: input.listing_id, platformPostId: platformResult.platformPostId },
          userId: connection.user_id,
        }).catch(() => {}); // fire-and-forget

        // Fire-and-forget: notify success
        const notificationService = getNotificationService();
        notificationService.dispatch({
          type: 'social.post_published',
          recipientId: connection.user_id,
          title: 'Post Published',
          message: `Your post was successfully published to ${input.platform}`,
          entityType: 'listing',
          entityId: input.listing_id,
          priority: 'low',
          metadata: { platform: input.platform, platformPostUrl: platformResult.platformPostUrl },
        }).catch(() => {}); // fire-and-forget

        return {
          success: true,
          post_id: post.id,
          platform_post_id: platformResult.platformPostId,
          platform_post_url: platformResult.platformPostUrl,
          posted_at: postedAt,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Non-retryable errors: 400, 401, 403 — fail immediately
        const errorMsg = lastError.message || '';
        if (errorMsg.includes('(400)') || errorMsg.includes('(401)') || errorMsg.includes('(403)')) {
          break;
        }

        // Retryable: wait before next attempt (if not last attempt)
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    // 6. On failure: update post row
    const errorMessage = lastError?.message || 'Unknown error';
    await this.updatePostStatus(post.id, {
      status: 'failed',
      error_message: errorMessage,
    });

    // Fire-and-forget: track failure
    analyticsService.trackEvent({
      eventName: 'social_post_failed',
      eventData: { platform: input.platform, contentType: input.content_type, contentId: input.content_id, listingId: input.listing_id, error: errorMessage },
      userId: connection.user_id,
    }).catch(() => {}); // fire-and-forget

    // Fire-and-forget: notify failure
    const notificationService = getNotificationService();
    notificationService.dispatch({
      type: 'social.post_failed',
      recipientId: connection.user_id,
      title: 'Post Failed',
      message: `Failed to publish your post to ${input.platform}: ${errorMessage}`,
      entityType: 'listing',
      entityId: input.listing_id,
      priority: 'normal',
      metadata: { platform: input.platform, error: errorMessage },
    }).catch(() => {}); // fire-and-forget

    return {
      success: false,
      post_id: post.id,
      error: errorMessage,
    };
  }

  /**
   * Post to Facebook via Graph API v19.0
   * Uses /{page-id}/feed for text+link, /{page-id}/photos for image posts
   * @phase Tier 5A Phase 3
   */
  private async postToFacebook(
    accessToken: string,
    connection: SocialConnection,
    input: PostToSocialInput
  ): Promise<{ platformPostId: string; platformPostUrl: string }> {
    const breaker = this.circuitBreakers.facebook;
    if (!breaker) throw new Error('Facebook circuit breaker not initialized');

    const pageId = connection.platform_user_id;
    if (!pageId) {
      throw new BizError({
        code: 'FACEBOOK_NO_PAGE_ID',
        message: 'Facebook connection missing page ID',
        context: { connectionId: connection.id },
        userMessage: 'Facebook page ID not found — please reconnect'
      });
    }

    return breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        let url: string;
        let body: string;

        if (input.post_image_url) {
          // Image post: use /{page-id}/photos endpoint
          url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
          const params = new URLSearchParams();
          params.set('url', input.post_image_url);
          if (input.post_text) params.set('message', input.post_text);
          params.set('access_token', accessToken);
          body = params.toString();
        } else {
          // Text+link post: use /{page-id}/feed endpoint
          url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
          const params = new URLSearchParams();
          if (input.post_text) params.set('message', input.post_text);
          if (input.post_link) params.set('link', input.post_link);
          params.set('access_token', accessToken);
          body = params.toString();
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Facebook post failed (${response.status}): ${errText}`);
        }

        const data = await response.json() as { id: string; post_id?: string };
        const platformPostId = data.post_id || data.id;
        const platformPostUrl = `https://www.facebook.com/${platformPostId}`;

        return { platformPostId, platformPostUrl };

      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  /**
   * Post to Twitter/X via API v2
   * Appends image URL to text if provided (media upload is Phase 5)
   * @phase Tier 5A Phase 3
   */
  private async postToTwitter(
    accessToken: string,
    input: PostToSocialInput
  ): Promise<{ platformPostId: string; platformPostUrl: string }> {
    const breaker = this.circuitBreakers.twitter;
    if (!breaker) throw new Error('Twitter circuit breaker not initialized');

    return breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        // Build tweet text: post_text + link (+ image URL if provided, since media upload is Phase 5)
        let tweetText = input.post_text || '';
        if (input.post_link) {
          tweetText = tweetText ? `${tweetText} ${input.post_link}` : input.post_link;
        }
        if (input.post_image_url) {
          tweetText = tweetText ? `${tweetText} ${input.post_image_url}` : input.post_image_url;
        }

        const response = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: tweetText }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Twitter post failed (${response.status}): ${errText}`);
        }

        const data = await response.json() as { data: { id: string; text: string } };
        const platformPostId = data.data.id;
        // Note: We don't have the username easily here, so use x.com/i/status pattern
        const platformPostUrl = `https://twitter.com/i/status/${platformPostId}`;

        return { platformPostId, platformPostUrl };

      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  /**
   * Schedule a social media post for future publishing
   * @phase Tier 5A Phase 7
   */
  async schedulePost(input: SchedulePostInput): Promise<SocialPost> {
    // Validate scheduled_at is at least 5 minutes in the future
    const minTime = new Date(Date.now() + 5 * 60 * 1000);
    if (input.scheduled_at < minTime) {
      throw new BizError({
        code: 'SCHEDULE_TOO_SOON',
        message: 'Scheduled time must be at least 5 minutes in the future',
        context: { scheduled_at: input.scheduled_at.toISOString() },
        userMessage: 'Please schedule at least 5 minutes from now'
      });
    }

    // Validate connection exists and is active
    const connection = await this.getConnectionById(input.connection_id);
    if (!connection || !connection.is_active) {
      throw new BizError({
        code: 'SOCIAL_CONNECTION_INVALID',
        message: `Connection ${input.connection_id} not found or inactive`,
        context: { connectionId: input.connection_id },
        userMessage: 'The social media connection is not available'
      });
    }

    // Create post with scheduled status
    const post = await this.createPost({
      connection_id: input.connection_id,
      listing_id: input.listing_id,
      content_type: input.content_type,
      content_id: input.content_id,
      platform: input.platform,
      post_text: input.post_text,
      post_image_url: input.post_image_url,
      post_link: input.post_link,
      status: 'scheduled',
      scheduled_at: input.scheduled_at,
    });

    // Fire-and-forget analytics
    const analyticsService = getInternalAnalyticsService();
    analyticsService.trackEvent({
      eventName: 'social_post_scheduled',
      eventData: {
        platform: input.platform,
        contentType: input.content_type,
        contentId: input.content_id,
        listingId: input.listing_id,
        scheduledAt: input.scheduled_at.toISOString(),
      },
      userId: connection.user_id,
    }).catch(() => {});

    return post;
  }

  /**
   * Get upcoming scheduled posts for a listing
   * @phase Tier 5A Phase 7
   */
  async getScheduledPosts(listingId: number): Promise<SocialPost[]> {
    const result: DbResult<SocialMediaPostRow> = await this.db.query<SocialMediaPostRow>(
      `SELECT * FROM social_media_posts
       WHERE listing_id = ? AND status = 'scheduled' AND scheduled_at > NOW()
       ORDER BY scheduled_at ASC`,
      [listingId]
    );
    return result.rows.map(row => this.mapPostRow(row));
  }

  /**
   * Cancel a scheduled post
   * @phase Tier 5A Phase 7
   */
  async cancelScheduledPost(postId: number, listingId: number): Promise<void> {
    const post = await this.getPostById(postId);
    if (!post || post.listing_id !== listingId || post.status !== 'scheduled') {
      throw new BizError({
        code: 'SCHEDULED_POST_NOT_FOUND',
        message: `Scheduled post ${postId} not found or not cancellable`,
        context: { postId, listingId },
        userMessage: 'Scheduled post not found or already processed'
      });
    }

    await this.updatePostStatus(postId, { status: 'deleted' });

    // Fire-and-forget analytics
    const analyticsService = getInternalAnalyticsService();
    analyticsService.trackEvent({
      eventName: 'social_post_cancelled',
      eventData: { platform: post.platform, postId, listingId },
      userId: post.connection_id, // Will be resolved by analytics service
    }).catch(() => {});
  }

  /**
   * Process due scheduled posts (called by cron endpoint)
   * @phase Tier 5A Phase 7
   */
  async processScheduledPosts(): Promise<ScheduledPostProcessorResult> {
    const result: ScheduledPostProcessorResult = {
      processed: 0,
      posted: 0,
      failed: 0,
      skipped: 0,
      by_post: [],
      timestamp: new Date().toISOString(),
    };

    // Get due scheduled posts (LIMIT 50 prevents runaway processing)
    const duePostsResult: DbResult<SocialMediaPostRow> = await this.db.query<SocialMediaPostRow>(
      `SELECT * FROM social_media_posts
       WHERE status = 'scheduled' AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC
       LIMIT 50`,
      []
    );

    const duePosts = duePostsResult.rows.map(row => this.mapPostRow(row));

    for (const post of duePosts) {
      result.processed++;

      try {
        // Check connection is still active
        const connection = await this.getConnectionById(post.connection_id);
        if (!connection || !connection.is_active) {
          await this.updatePostStatus(post.id, {
            status: 'failed',
            error_message: 'Connection inactive or not found',
          });
          result.skipped++;
          result.by_post.push({
            post_id: post.id,
            platform: post.platform,
            status: 'skipped',
            error: 'Connection inactive',
          });
          continue;
        }

        // Post using existing postToSocial() — handles retry, analytics, notifications
        await this.postToSocial({
          connection_id: post.connection_id,
          listing_id: post.listing_id,
          content_type: post.content_type || 'content',
          content_id: post.content_id,
          platform: post.platform,
          post_text: post.post_text || '',
          post_image_url: post.post_image_url || undefined,
          post_link: post.post_link || undefined,
        });

        // postToSocial creates a NEW post record — update the scheduled post to 'posted'
        await this.updatePostStatus(post.id, {
          status: 'posted',
          posted_at: new Date(),
        });

        result.posted++;
        result.by_post.push({
          post_id: post.id,
          platform: post.platform,
          status: 'posted',
        });

        // Fire-and-forget: notify scheduled post published
        const notificationService = getNotificationService();
        notificationService.dispatch({
          type: 'social.scheduled_post_published',
          recipientId: connection.user_id,
          title: 'Scheduled Post Published',
          message: `Your scheduled post was published to ${post.platform}`,
          entityType: 'listing',
          entityId: post.listing_id,
          priority: 'low',
          metadata: { platform: post.platform, postId: post.id },
        }).catch(() => {});

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        ErrorService.capture(`[ScheduledPostProcessor] Failed for post ${post.id}:`, err);

        await this.updatePostStatus(post.id, {
          status: 'failed',
          error_message: errorMessage,
        });

        result.failed++;
        result.by_post.push({
          post_id: post.id,
          platform: post.platform,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    return result;
  }

  /**
   * Update post status and metadata after posting attempt
   * @phase Tier 5A Phase 3
   */
  async updatePostStatus(postId: number, updates: PostStatusUpdate): Promise<void> {
    const setClauses: string[] = ['status = ?'];
    const params: unknown[] = [updates.status];

    if (updates.platform_post_id !== undefined) {
      setClauses.push('platform_post_id = ?');
      params.push(updates.platform_post_id);
    }
    if (updates.platform_post_url !== undefined) {
      setClauses.push('platform_post_url = ?');
      params.push(updates.platform_post_url);
    }
    if (updates.posted_at !== undefined) {
      setClauses.push('posted_at = ?');
      params.push(updates.posted_at);
    }
    if (updates.error_message !== undefined) {
      setClauses.push('error_message = ?');
      params.push(updates.error_message);
    }

    params.push(postId);
    await this.db.query(
      `UPDATE social_media_posts SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
  }

  // ==========================================================================
  // TOKEN ENCRYPTION (AES-256-GCM — replicated from PlatformSyncService)
  // ==========================================================================

  private getEncryptionKey(): Buffer {
    const key = process.env.PLATFORM_TOKEN_ENCRYPTION_KEY;
    if (!key) throw new Error('PLATFORM_TOKEN_ENCRYPTION_KEY not set');
    return Buffer.from(key, 'hex');
  }

  private encryptToken(token: string): { encrypted: Buffer; iv: Buffer } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
    const encryptedData = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const encrypted = Buffer.concat([encryptedData, authTag]);
    return { encrypted, iv };
  }

  private decryptToken(encrypted: Buffer, iv: Buffer): string {
    const authTag = encrypted.subarray(-16);
    const encryptedData = encrypted.subarray(0, -16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encryptedData).toString('utf8') + decipher.final('utf8');
  }

  // ==========================================================================
  // OAUTH FLOW
  // ==========================================================================

  /**
   * Get supported platforms that have OAuth configured
   */
  getSupportedPlatforms(): SocialPlatform[] {
    return (Object.entries(SOCIAL_PLATFORM_CONFIGS) as [SocialPlatform, SocialPlatformConfig][])
      .filter(([, config]) => !!config.clientId)
      .map(([platform]) => platform);
  }

  /**
   * Generate OAuth authorization URL with cryptographic state parameter
   * @reference PlatformSyncService.getAuthorizationUrl()
   */
  getAuthorizationUrl(platform: SocialPlatform, listingId: number, userId: number): string {
    const config = SOCIAL_PLATFORM_CONFIGS[platform];
    if (!config || !config.clientId) {
      throw BizError.badRequest(`Platform ${platform} is not configured for social posting`);
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const stateData: SocialOAuthStateData = {
      userId,
      listingId,
      platform,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    socialOAuthStateStore.set(nonce, stateData);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: nonce,
    });

    // Twitter/X OAuth 2.0 requires PKCE
    if (platform === 'twitter') {
      params.set('code_challenge', 'challenge');
      params.set('code_challenge_method', 'plain');
    }

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Validate and consume OAuth state parameter (anti-CSRF)
   * @reference PlatformSyncService.validateAndConsumeState()
   */
  validateAndConsumeState(state: string): SocialOAuthStateData {
    const data = socialOAuthStateStore.get(state);
    if (!data) {
      throw BizError.badRequest('Invalid or expired OAuth state');
    }
    if (data.expiresAt < Date.now()) {
      socialOAuthStateStore.delete(state);
      throw BizError.badRequest('OAuth state has expired — please try connecting again');
    }
    socialOAuthStateStore.delete(state);
    return data;
  }

  /**
   * Exchange authorization code for tokens
   * @reference PlatformSyncService.exchangeCodeForTokens()
   */
  async exchangeCodeForTokens(
    platform: SocialPlatform,
    code: string
  ): Promise<SocialOAuthTokens> {
    const config = SOCIAL_PLATFORM_CONFIGS[platform];
    if (!config) throw BizError.badRequest(`Platform ${platform} not configured`);

    const breaker = this.circuitBreakers[platform];
    if (!breaker) throw BizError.badRequest(`No circuit breaker for ${platform}`);

    return breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const body = new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          code,
          grant_type: 'authorization_code',
        });

        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
        };
        if (platform === 'twitter') {
          const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }

        const response = await fetch(config.tokenUrl, {
          method: 'POST',
          headers,
          body: body.toString(),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Token exchange failed (${response.status}): ${errText}`);
        }

        const data = await response.json() as Record<string, unknown>;

        let accessToken = (data.access_token as string) || '';
        const refreshToken = (data.refresh_token as string) || null;
        const expiresIn = data.expires_in as number | undefined;
        let expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
        const scope = (data.scope as string) || null;

        let platformUserId: string | undefined;
        let platformUsername: string | undefined;
        let platformPageName: string | undefined;

        if (platform === 'facebook' && accessToken) {
          try {
            const pageInfo = await this.fetchFacebookPageInfo(accessToken);
            platformUserId = pageInfo.pageId;
            platformUsername = pageInfo.pageName;
            platformPageName = pageInfo.pageName;
          } catch (err) {
            ErrorService.capture('Failed to fetch Facebook page info:', err);
          }
        }

        if (platform === 'twitter' && accessToken) {
          try {
            const userInfo = await this.fetchTwitterUserInfo(accessToken);
            platformUserId = userInfo.id;
            platformUsername = userInfo.username;
          } catch (err) {
            ErrorService.capture('Failed to fetch Twitter user info:', err);
          }
        }

        // Instagram: exchange short-lived token for long-lived token, fetch IG user info
        if (platform === 'instagram' && accessToken) {
          try {
            const longLivedTokens = await this.exchangeInstagramLongLivedToken(accessToken, config);
            if (longLivedTokens) {
              accessToken = longLivedTokens.accessToken;
              expiresAt = longLivedTokens.expiresAt;
            }
            const igInfo = await this.fetchInstagramUserInfo(accessToken);
            platformUserId = igInfo.id;
            platformUsername = igInfo.username;
          } catch (err) {
            ErrorService.capture('Failed to fetch Instagram user info:', err);
          }
        }

        // LinkedIn: fetch profile info using access token
        if (platform === 'linkedin' && accessToken) {
          try {
            const liInfo = await this.fetchLinkedInUserInfo(accessToken);
            platformUserId = liInfo.id;
            platformUsername = liInfo.name;
          } catch (err) {
            ErrorService.capture('Failed to fetch LinkedIn user info:', err);
          }
        }

        // TikTok: fetch user info using access token
        if (platform === 'tiktok' && accessToken) {
          try {
            const tiktokInfo = await this.fetchTikTokUserInfo(accessToken);
            platformUserId = tiktokInfo.id;
            platformUsername = tiktokInfo.username;
            platformPageName = tiktokInfo.displayName;
          } catch (err) {
            ErrorService.capture('Failed to fetch TikTok user info:', err);
          }
        }

        // Pinterest: fetch profile info using access token
        if (platform === 'pinterest' && accessToken) {
          try {
            const pinterestInfo = await this.fetchPinterestUserInfo(accessToken);
            platformUserId = pinterestInfo.id;
            platformUsername = pinterestInfo.username;
          } catch (err) {
            ErrorService.capture('Failed to fetch Pinterest user info:', err);
          }
        }

        return { accessToken, refreshToken, expiresAt, scope, platformUserId, platformUsername, platformPageName };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  /**
   * Refresh an access token using a refresh token
   * @reference PlatformSyncService.refreshAccessToken()
   */
  async refreshAccessToken(connectionId: number): Promise<SocialOAuthTokens> {
    const result = await this.db.query<SocialMediaConnectionRow>(
      'SELECT * FROM social_media_connections WHERE id = ? AND is_active = 1',
      [connectionId]
    );

    const row = result.rows[0];
    if (!row) throw new SocialConnectionNotFoundError(connectionId);
    if (!row.refresh_token_encrypted || !row.token_iv) {
      throw new BizError({
        code: 'NO_REFRESH_TOKEN',
        message: `No refresh token available for connection ${connectionId}`,
        context: { connectionId },
        userMessage: 'This connection cannot be refreshed — please reconnect'
      });
    }

    const refreshToken = this.decryptToken(row.refresh_token_encrypted, row.token_iv);
    const platform = row.platform as SocialPlatform;
    const config = SOCIAL_PLATFORM_CONFIGS[platform];
    if (!config) throw BizError.badRequest(`Platform ${platform} not configured`);

    const breaker = this.circuitBreakers[platform];
    if (!breaker) throw BizError.badRequest(`No circuit breaker for ${platform}`);

    return breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const body = new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        });

        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
        };
        if (platform === 'twitter') {
          const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }

        const response = await fetch(config.tokenUrl, {
          method: 'POST',
          headers,
          body: body.toString(),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Token refresh failed (${response.status})`);
        }

        const data = await response.json() as Record<string, unknown>;

        const accessToken = (data.access_token as string) || '';
        const newRefreshToken = (data.refresh_token as string) || null;
        const expiresIn = data.expires_in as number | undefined;
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

        return { accessToken, refreshToken: newRefreshToken, expiresAt, scope: null };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  /**
   * Get a valid (non-expired) access token, auto-refreshing if needed
   */
  async getValidAccessToken(connectionId: number): Promise<string> {
    const result = await this.db.query<SocialMediaConnectionRow>(
      'SELECT * FROM social_media_connections WHERE id = ? AND is_active = 1',
      [connectionId]
    );

    const row = result.rows[0];
    if (!row) throw new SocialConnectionNotFoundError(connectionId);
    if (!row.access_token_encrypted || !row.token_iv) {
      throw new BizError({
        code: 'NO_ACCESS_TOKEN',
        message: `No access token for connection ${connectionId}`,
        context: { connectionId },
        userMessage: 'This connection has no access token — please reconnect'
      });
    }

    if (row.token_expires_at) {
      const expiresAt = new Date(row.token_expires_at);
      const bufferMs = 5 * 60 * 1000;
      if (expiresAt.getTime() - bufferMs < Date.now()) {
        const newTokens = await this.refreshAccessToken(connectionId);
        await this.saveOAuthTokens(connectionId, newTokens);
        return newTokens.accessToken;
      }
    }

    return this.decryptToken(row.access_token_encrypted, row.token_iv);
  }

  /**
   * Save OAuth tokens (encrypted) to an existing connection
   */
  async saveOAuthTokens(connectionId: number, tokens: SocialOAuthTokens): Promise<void> {
    const { encrypted: accessEncrypted, iv } = this.encryptToken(tokens.accessToken);
    let refreshEncrypted: Buffer | null = null;
    if (tokens.refreshToken) {
      const result = this.encryptToken(tokens.refreshToken);
      refreshEncrypted = result.encrypted;
    }

    const setClauses: string[] = [
      'access_token_encrypted = ?',
      'refresh_token_encrypted = ?',
      'token_iv = ?',
    ];
    const params: unknown[] = [accessEncrypted, refreshEncrypted, iv];

    if (tokens.expiresAt) {
      setClauses.push('token_expires_at = ?');
      params.push(tokens.expiresAt);
    }
    if (tokens.platformUserId) {
      setClauses.push('platform_user_id = ?');
      params.push(tokens.platformUserId);
    }
    if (tokens.platformUsername) {
      setClauses.push('platform_username = ?');
      params.push(tokens.platformUsername);
    }
    if (tokens.platformPageName) {
      setClauses.push('platform_page_name = ?');
      params.push(tokens.platformPageName);
    }
    if (tokens.scope) {
      setClauses.push('scopes = ?');
      params.push(JSON.stringify(tokens.scope.split(' ')));
    }

    setClauses.push('last_used_at = NOW()');
    params.push(connectionId);

    await this.db.query(
      `UPDATE social_media_connections SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
  }

  // ==========================================================================
  // PLATFORM INFO HELPERS (Private)
  // ==========================================================================

  /**
   * Fetch Facebook Page info using user access token
   */
  private async fetchFacebookPageInfo(userAccessToken: string): Promise<{ pageId: string; pageName: string; pageAccessToken: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`Facebook pages fetch failed (${response.status})`);

      const data = await response.json() as { data: Array<{ id: string; name: string; access_token: string }> };

      if (!data.data || data.data.length === 0) {
        throw new Error('No Facebook Pages found for this user');
      }

      const page = data.data[0];
      if (!page) throw new Error('No Facebook Pages found for this user');
      return {
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
      };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Fetch Twitter/X user info using access token
   */
  private async fetchTwitterUserInfo(accessToken: string): Promise<{ id: string; username: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.twitter.com/2/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`Twitter user info fetch failed (${response.status})`);

      const data = await response.json() as { data: { id: string; username: string } };
      return { id: data.data.id, username: data.data.username };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Exchange Instagram short-lived token for long-lived token (60 days)
   * @phase Tier 5A Phase 6
   */
  private async exchangeInstagramLongLivedToken(
    shortLivedToken: string,
    config: SocialPlatformConfig
  ): Promise<{ accessToken: string; expiresAt: Date } | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const params = new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: config.clientSecret,
        access_token: shortLivedToken,
      });

      const response = await fetch(
        `https://graph.instagram.com/access_token?${params.toString()}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        ErrorService.capture('Instagram long-lived token exchange failed', { status: response.status });
        return null;
      }

      const data = await response.json() as { access_token: string; token_type: string; expires_in: number };
      return {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Fetch Instagram user info (id, username) using access token
   * @phase Tier 5A Phase 6
   * @reference fetchTwitterUserInfo pattern
   */
  private async fetchInstagramUserInfo(accessToken: string): Promise<{ id: string; username: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`Instagram user info fetch failed (${response.status})`);

      const data = await response.json() as { id: string; username: string };
      return { id: data.id, username: data.username };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Post to Instagram via Instagram Graph API (container + publish two-step)
   * Uses /{ig-user-id}/media to create container, then /{ig-user-id}/media_publish
   * Note: Instagram requires an image — text-only posts are NOT supported
   * @phase Tier 5A Phase 6
   * @reference postToFacebook pattern
   */
  private async postToInstagram(
    accessToken: string,
    connection: SocialConnection,
    input: PostToSocialInput
  ): Promise<{ platformPostId: string; platformPostUrl: string }> {
    const breaker = this.circuitBreakers.instagram;
    if (!breaker) throw new Error('Instagram circuit breaker not initialized');

    const igUserId = connection.platform_user_id;
    if (!igUserId) {
      throw new BizError({
        code: 'INSTAGRAM_NO_USER_ID',
        message: 'Instagram connection missing user ID',
        context: { connectionId: connection.id },
        userMessage: 'Instagram user ID not found — please reconnect'
      });
    }

    // Instagram requires an image URL — text-only posts are not supported
    if (!input.post_image_url) {
      throw new BizError({
        code: 'INSTAGRAM_IMAGE_REQUIRED',
        message: 'Instagram posts require an image URL',
        context: { connectionId: connection.id },
        userMessage: 'Instagram requires an image to create a post'
      });
    }

    return breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        // Step 1: Create media container
        const containerParams = new URLSearchParams({
          image_url: input.post_image_url!,
          access_token: accessToken,
        });
        if (input.post_text) {
          containerParams.set('caption', input.post_text);
        }

        const containerResponse = await fetch(
          `https://graph.instagram.com/v19.0/${igUserId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: containerParams.toString(),
            signal: controller.signal,
          }
        );

        if (!containerResponse.ok) {
          const errText = await containerResponse.text();
          throw new Error(`Instagram container creation failed (${containerResponse.status}): ${errText}`);
        }

        const containerData = await containerResponse.json() as { id: string };

        // Step 2: Publish the container
        const publishParams = new URLSearchParams({
          creation_id: containerData.id,
          access_token: accessToken,
        });

        const publishResponse = await fetch(
          `https://graph.instagram.com/v19.0/${igUserId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: publishParams.toString(),
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);

        if (!publishResponse.ok) {
          const errText = await publishResponse.text();
          throw new Error(`Instagram publish failed (${publishResponse.status}): ${errText}`);
        }

        const publishData = await publishResponse.json() as { id: string };
        const platformPostId = publishData.id;
        const platformPostUrl = `https://www.instagram.com/p/${platformPostId}/`;

        return { platformPostId, platformPostUrl };

      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  /**
   * Fetch LinkedIn user info using access token
   * Uses LinkedIn v2 API: /v2/userinfo (OpenID Connect)
   * @phase Tier 5A Phase 6
   * @reference fetchTwitterUserInfo pattern
   */
  private async fetchLinkedInUserInfo(accessToken: string): Promise<{ id: string; name: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`LinkedIn user info fetch failed (${response.status})`);

      const data = await response.json() as { sub: string; name: string; email?: string };
      return { id: data.sub, name: data.name };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Post to LinkedIn via Community Management API
   * Uses POST /rest/posts with author URN
   * @phase Tier 5A Phase 6
   * @reference postToTwitter pattern (JSON body, Bearer auth)
   */
  private async postToLinkedIn(
    accessToken: string,
    connection: SocialConnection,
    input: PostToSocialInput
  ): Promise<{ platformPostId: string; platformPostUrl: string }> {
    const breaker = this.circuitBreakers.linkedin;
    if (!breaker) throw new Error('LinkedIn circuit breaker not initialized');

    const personId = connection.platform_user_id;
    if (!personId) {
      throw new BizError({
        code: 'LINKEDIN_NO_PERSON_ID',
        message: 'LinkedIn connection missing person ID',
        context: { connectionId: connection.id },
        userMessage: 'LinkedIn person ID not found — please reconnect'
      });
    }

    return breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const postBody: Record<string, unknown> = {
          author: `urn:li:person:${personId}`,
          commentary: input.post_text || '',
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: 'PUBLISHED',
        };

        // Add article content for link shares
        if (input.post_link) {
          postBody.content = {
            article: {
              source: input.post_link,
              title: input.post_text?.substring(0, 100) || 'Shared link',
              description: input.post_text?.substring(0, 200) || '',
            },
          };
        }

        const response = await fetch('https://api.linkedin.com/rest/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202401',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify(postBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`LinkedIn post failed (${response.status}): ${errText}`);
        }

        // LinkedIn returns the post URN in the x-restli-id header
        const postUrn = response.headers.get('x-restli-id') || '';
        const platformPostId = postUrn;
        const platformPostUrl = `https://www.linkedin.com/feed/update/${postUrn}`;

        return { platformPostId, platformPostUrl };

      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  // ==========================================================================
  // TIKTOK + PINTEREST METHODS (Phase 10)
  // ==========================================================================

  /**
   * Fetch TikTok user info using access token
   * Uses TikTok API v2: /v2/user/info/
   * @phase Tier 5A Phase 10
   * @reference fetchLinkedInUserInfo pattern
   */
  private async fetchTikTokUserInfo(accessToken: string): Promise<{ id: string; username: string; displayName: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`TikTok user info fetch failed (${response.status})`);
      const data = await response.json() as { data: { user: { open_id: string; union_id?: string; display_name: string } } };
      return { id: data.data.user.open_id, username: data.data.user.display_name, displayName: data.data.user.display_name };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Fetch Pinterest user info using access token
   * Uses Pinterest API v5: /v5/user_account
   * @phase Tier 5A Phase 10
   * @reference fetchLinkedInUserInfo pattern
   */
  private async fetchPinterestUserInfo(accessToken: string): Promise<{ id: string; username: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('https://api.pinterest.com/v5/user_account', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Pinterest user info fetch failed (${response.status})`);
      const data = await response.json() as { username: string; id?: string };
      return { id: data.id || data.username, username: data.username };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Post to TikTok via Content Posting API v2
   * Uses the Photo Post API for image content
   * @phase Tier 5A Phase 10
   * @reference postToLinkedIn pattern (JSON body, Bearer auth)
   */
  private async postToTikTok(
    accessToken: string,
    connection: SocialConnection,
    input: PostToSocialInput
  ): Promise<{ platformPostId: string; platformPostUrl: string }> {
    const breaker = this.circuitBreakers.tiktok;
    if (!breaker) throw new Error('TikTok circuit breaker not initialized');

    const openId = connection.platform_user_id;
    if (!openId) {
      throw new BizError({
        code: 'TIKTOK_NO_USER_ID',
        message: 'TikTok connection missing user ID',
        context: { connectionId: connection.id },
        userMessage: 'TikTok user ID not found — please reconnect'
      });
    }

    return breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const postBody: Record<string, unknown> = {
          post_info: {
            title: input.post_text?.substring(0, 150) || '',
            description: input.post_text || '',
            disable_comment: false,
            privacy_level: 'PUBLIC_TO_EVERYONE',
          },
          source_info: {
            source: 'PULL_FROM_URL',
            photo_cover_index: 0,
            photo_images: input.post_image_url ? [input.post_image_url] : [],
          },
          post_mode: 'DIRECT_POST',
          media_type: 'PHOTO',
        };

        const response = await fetch(
          'https://open.tiktokapis.com/v2/post/publish/content/init/',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postBody),
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`TikTok post failed (${response.status}): ${errText}`);
        }

        const data = await response.json() as { data?: { publish_id?: string } };
        const publishId = data.data?.publish_id || `tiktok_${Date.now()}`;
        const platformPostUrl = `https://www.tiktok.com/@${connection.platform_username || openId}`;

        return { platformPostId: publishId, platformPostUrl };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  /**
   * Post to Pinterest via API v5 — Create Pin
   * Creates a pin with image, link, and description
   * @phase Tier 5A Phase 10
   * @reference postToLinkedIn pattern (JSON body, Bearer auth)
   */
  private async postToPinterest(
    accessToken: string,
    connection: SocialConnection,
    input: PostToSocialInput
  ): Promise<{ platformPostId: string; platformPostUrl: string }> {
    const breaker = this.circuitBreakers.pinterest;
    if (!breaker) throw new Error('Pinterest circuit breaker not initialized');

    return breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const pinBody: Record<string, unknown> = {
          title: input.post_text?.substring(0, 100) || '',
          description: input.post_text || '',
          board_id: connection.platform_user_id || '',
        };

        if (input.post_link) {
          pinBody.link = input.post_link;
        }

        if (input.post_image_url) {
          pinBody.media_source = {
            source_type: 'image_url',
            url: input.post_image_url,
          };
        }

        const response = await fetch('https://api.pinterest.com/v5/pins', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pinBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Pinterest pin creation failed (${response.status}): ${errText}`);
        }

        const data = await response.json() as { id: string };
        const platformPostId = data.id;
        const platformPostUrl = `https://www.pinterest.com/pin/${platformPostId}/`;

        return { platformPostId, platformPostUrl };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  // ==========================================================================
  // ANALYTICS METHODS (Phase 9)
  // ==========================================================================

  /**
   * Get aggregated social analytics for a listing within a date range
   * Runs 5 queries via Promise.allSettled for graceful degradation
   * @phase Tier 5A Phase 9
   */
  async getSocialAnalytics(listingId: number, startDate: string, endDate: string): Promise<SocialAnalyticsData> {
    const DAY_NAMES = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const [summaryResult, platformResult, timeSeriesResult, contentTypeResult, cadenceDayResult, cadenceHourResult, lastSyncResult] = await Promise.allSettled([
      // 1. Summary
      this.db.query<{
        totalPosts: number | bigint;
        totalPosted: number | bigint;
        totalFailed: number | bigint;
        totalScheduled: number | bigint;
        totalImpressions: number | bigint;
        totalEngagements: number | bigint;
        totalClicks: number | bigint;
      }>(
        `SELECT
          COUNT(*) as totalPosts,
          SUM(CASE WHEN status='posted' THEN 1 ELSE 0 END) as totalPosted,
          SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as totalFailed,
          SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) as totalScheduled,
          COALESCE(SUM(CASE WHEN status='posted' THEN impressions ELSE 0 END), 0) as totalImpressions,
          COALESCE(SUM(CASE WHEN status='posted' THEN engagements ELSE 0 END), 0) as totalEngagements,
          COALESCE(SUM(CASE WHEN status='posted' THEN clicks ELSE 0 END), 0) as totalClicks
        FROM social_media_posts
        WHERE listing_id = ? AND created_at BETWEEN ? AND ?`,
        [listingId, startDate, endDate + ' 23:59:59']
      ),

      // 2. By Platform
      this.db.query<{
        platform: string;
        postCount: number | bigint;
        impressions: number | bigint;
        engagements: number | bigint;
        clicks: number | bigint;
      }>(
        `SELECT platform,
          COUNT(*) as postCount,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(engagements), 0) as engagements,
          COALESCE(SUM(clicks), 0) as clicks
        FROM social_media_posts
        WHERE listing_id = ? AND posted_at BETWEEN ? AND ? AND status='posted'
        GROUP BY platform`,
        [listingId, startDate, endDate + ' 23:59:59']
      ),

      // 3. Time Series
      this.db.query<{
        date: string;
        posts: number | bigint;
        impressions: number | bigint;
        engagements: number | bigint;
        clicks: number | bigint;
      }>(
        `SELECT DATE(posted_at) as date,
          COUNT(*) as posts,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(engagements), 0) as engagements,
          COALESCE(SUM(clicks), 0) as clicks
        FROM social_media_posts
        WHERE listing_id = ? AND posted_at BETWEEN ? AND ? AND status='posted'
        GROUP BY DATE(posted_at)
        ORDER BY date`,
        [listingId, startDate, endDate + ' 23:59:59']
      ),

      // 4. By Content Type
      this.db.query<{
        content_type: string;
        postCount: number | bigint;
        impressions: number | bigint;
        engagements: number | bigint;
        clicks: number | bigint;
      }>(
        `SELECT COALESCE(content_type, 'unknown') as content_type,
          COUNT(*) as postCount,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(engagements), 0) as engagements,
          COALESCE(SUM(clicks), 0) as clicks
        FROM social_media_posts
        WHERE listing_id = ? AND posted_at BETWEEN ? AND ? AND status='posted'
        GROUP BY content_type`,
        [listingId, startDate, endDate + ' 23:59:59']
      ),

      // 5a. Cadence by day of week
      this.db.query<{
        dayNum: number | bigint;
        count: number | bigint;
        avgEngagement: number;
      }>(
        `SELECT DAYOFWEEK(posted_at) as dayNum,
          COUNT(*) as count,
          AVG(engagements) as avgEngagement
        FROM social_media_posts
        WHERE listing_id = ? AND posted_at BETWEEN ? AND ? AND status='posted'
        GROUP BY DAYOFWEEK(posted_at)`,
        [listingId, startDate, endDate + ' 23:59:59']
      ),

      // 5b. Cadence by hour of day
      this.db.query<{
        hour: number | bigint;
        count: number | bigint;
        avgEngagement: number;
      }>(
        `SELECT HOUR(posted_at) as hour,
          COUNT(*) as count,
          AVG(engagements) as avgEngagement
        FROM social_media_posts
        WHERE listing_id = ? AND posted_at BETWEEN ? AND ? AND status='posted'
        GROUP BY HOUR(posted_at)`,
        [listingId, startDate, endDate + ' 23:59:59']
      ),

      // 6. Last metrics sync
      this.db.query<{ lastSync: string | null }>(
        `SELECT MAX(last_metrics_sync) as lastSync FROM social_media_posts WHERE listing_id = ?`,
        [listingId]
      ),
    ]);

    // Parse summary
    const summaryRow = summaryResult.status === 'fulfilled' ? summaryResult.value.rows[0] : null;
    const totalImpressions = summaryRow ? bigIntToNumber(summaryRow.totalImpressions) : 0;
    const totalEngagements = summaryRow ? bigIntToNumber(summaryRow.totalEngagements) : 0;
    const totalClicks = summaryRow ? bigIntToNumber(summaryRow.totalClicks) : 0;

    const summary: SocialAnalyticsSummary = {
      totalPosts: summaryRow ? bigIntToNumber(summaryRow.totalPosts) : 0,
      totalPosted: summaryRow ? bigIntToNumber(summaryRow.totalPosted) : 0,
      totalFailed: summaryRow ? bigIntToNumber(summaryRow.totalFailed) : 0,
      totalScheduled: summaryRow ? bigIntToNumber(summaryRow.totalScheduled) : 0,
      totalImpressions,
      totalEngagements,
      totalClicks,
      avgEngagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
      avgClickRate: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    };

    // Parse platform breakdown
    const byPlatform: SocialPlatformAnalytics[] = platformResult.status === 'fulfilled'
      ? platformResult.value.rows.map(row => {
          const imp = bigIntToNumber(row.impressions);
          const eng = bigIntToNumber(row.engagements);
          const clk = bigIntToNumber(row.clicks);
          return {
            platform: row.platform as SocialPlatform,
            postCount: bigIntToNumber(row.postCount),
            impressions: imp,
            engagements: eng,
            clicks: clk,
            engagementRate: imp > 0 ? (eng / imp) * 100 : 0,
            clickRate: imp > 0 ? (clk / imp) * 100 : 0,
          };
        })
      : [];

    // Parse time series
    const timeSeries: SocialTimeSeriesPoint[] = timeSeriesResult.status === 'fulfilled'
      ? timeSeriesResult.value.rows.map(row => ({
          date: typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0]!,
          posts: bigIntToNumber(row.posts),
          impressions: bigIntToNumber(row.impressions),
          engagements: bigIntToNumber(row.engagements),
          clicks: bigIntToNumber(row.clicks),
        }))
      : [];

    // Parse content type breakdown
    const byContentType: SocialContentTypeAnalytics[] = contentTypeResult.status === 'fulfilled'
      ? contentTypeResult.value.rows.map(row => {
          const imp = bigIntToNumber(row.impressions);
          const eng = bigIntToNumber(row.engagements);
          return {
            contentType: row.content_type,
            postCount: bigIntToNumber(row.postCount),
            impressions: imp,
            engagements: eng,
            clicks: bigIntToNumber(row.clicks),
            engagementRate: imp > 0 ? (eng / imp) * 100 : 0,
          };
        })
      : [];

    // Parse cadence
    const cadence: SocialPostingCadence = {
      byDayOfWeek: cadenceDayResult.status === 'fulfilled'
        ? cadenceDayResult.value.rows.map(row => ({
            day: DAY_NAMES[bigIntToNumber(row.dayNum)] || 'Unknown',
            count: bigIntToNumber(row.count),
            avgEngagement: Math.round((row.avgEngagement || 0) * 100) / 100,
          }))
        : [],
      byHourOfDay: cadenceHourResult.status === 'fulfilled'
        ? cadenceHourResult.value.rows.map(row => ({
            hour: bigIntToNumber(row.hour),
            count: bigIntToNumber(row.count),
            avgEngagement: Math.round((row.avgEngagement || 0) * 100) / 100,
          }))
        : [],
    };

    // Last metrics sync
    const lastMetricsSync = lastSyncResult.status === 'fulfilled' && lastSyncResult.value.rows[0]?.lastSync
      ? new Date(lastSyncResult.value.rows[0].lastSync).toISOString()
      : null;

    return { summary, byPlatform, timeSeries, byContentType, cadence, lastMetricsSync };
  }

  /**
   * Sync metrics for a single post from its platform API
   * Returns updated metrics or null on failure (fire-and-forget style)
   * @phase Tier 5A Phase 9
   */
  async syncPostMetrics(postId: number): Promise<{ impressions: number; engagements: number; clicks: number } | null> {
    try {
      const postResult = await this.db.query<SocialMediaPostRow>(
        'SELECT * FROM social_media_posts WHERE id = ?',
        [postId]
      );
      const post = postResult.rows[0];
      if (!post || !post.platform_post_id || !post.connection_id) return null;

      const platform = post.platform as SocialPlatform;
      let accessToken: string;
      try {
        accessToken = await this.getValidAccessToken(post.connection_id);
      } catch {
        return null;
      }

      let metrics: { impressions: number; engagements: number; clicks: number } | null = null;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        switch (platform) {
          case 'facebook': {
            const breaker = this.circuitBreakers.facebook;
            if (!breaker) break;
            metrics = await breaker.execute(async () => {
              const response = await fetch(
                `https://graph.facebook.com/v19.0/${post.platform_post_id}?fields=insights.metric(post_impressions,post_engagements)&access_token=${encodeURIComponent(accessToken)}`,
                { signal: controller.signal }
              );
              if (!response.ok) return null;
              const data = await response.json() as { insights?: { data?: Array<{ name: string; values: Array<{ value: number }> }> } };
              const insights = data.insights?.data ?? [];
              const imp = insights.find(i => i.name === 'post_impressions')?.values?.[0]?.value ?? 0;
              const eng = insights.find(i => i.name === 'post_engagements')?.values?.[0]?.value ?? 0;
              return { impressions: imp, engagements: eng, clicks: 0 };
            });
            break;
          }
          case 'twitter': {
            const breaker = this.circuitBreakers.twitter;
            if (!breaker) break;
            metrics = await breaker.execute(async () => {
              const response = await fetch(
                `https://api.twitter.com/2/tweets/${post.platform_post_id}?tweet.fields=public_metrics`,
                {
                  headers: { 'Authorization': `Bearer ${accessToken}` },
                  signal: controller.signal,
                }
              );
              if (!response.ok) return null;
              const data = await response.json() as { data?: { public_metrics?: { impression_count?: number; like_count?: number; retweet_count?: number; reply_count?: number; url_link_clicks?: number } } };
              const pm = data.data?.public_metrics;
              if (!pm) return null;
              return {
                impressions: pm.impression_count ?? 0,
                engagements: (pm.like_count ?? 0) + (pm.retweet_count ?? 0) + (pm.reply_count ?? 0),
                clicks: pm.url_link_clicks ?? 0,
              };
            });
            break;
          }
          case 'instagram': {
            const breaker = this.circuitBreakers.instagram;
            if (!breaker) break;
            metrics = await breaker.execute(async () => {
              const response = await fetch(
                `https://graph.facebook.com/v19.0/${post.platform_post_id}/insights?metric=impressions,engagement&access_token=${encodeURIComponent(accessToken)}`,
                { signal: controller.signal }
              );
              if (!response.ok) return null;
              const data = await response.json() as { data?: Array<{ name: string; values: Array<{ value: number }> }> };
              const insights = data.data ?? [];
              const imp = insights.find(i => i.name === 'impressions')?.values?.[0]?.value ?? 0;
              const eng = insights.find(i => i.name === 'engagement')?.values?.[0]?.value ?? 0;
              return { impressions: imp, engagements: eng, clicks: 0 };
            });
            break;
          }
          case 'linkedin': {
            const breaker = this.circuitBreakers.linkedin;
            if (!breaker) break;
            metrics = await breaker.execute(async () => {
              const response = await fetch(
                `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&shares=List(${encodeURIComponent(post.platform_post_id!)})`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'LinkedIn-Version': '202401',
                    'X-Restli-Protocol-Version': '2.0.0',
                  },
                  signal: controller.signal,
                }
              );
              if (!response.ok) return null;
              const data = await response.json() as { elements?: Array<{ totalShareStatistics?: { impressionCount?: number; engagementCount?: number; clickCount?: number } }> };
              const stats = data.elements?.[0]?.totalShareStatistics;
              if (!stats) return null;
              return {
                impressions: stats.impressionCount ?? 0,
                engagements: stats.engagementCount ?? 0,
                clicks: stats.clickCount ?? 0,
              };
            });
            break;
          }
          case 'tiktok': {
            const breaker = this.circuitBreakers.tiktok;
            if (!breaker) break;
            metrics = await breaker.execute(async () => {
              const response = await fetch(
                'https://open.tiktokapis.com/v2/video/query/?fields=view_count,like_count,comment_count,share_count',
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ filters: { video_ids: [post.platform_post_id] } }),
                  signal: controller.signal,
                }
              );
              if (!response.ok) return null;
              const data = await response.json() as { data?: { videos?: Array<{ view_count?: number; like_count?: number; comment_count?: number; share_count?: number }> } };
              const video = data.data?.videos?.[0];
              if (!video) return null;
              return {
                impressions: video.view_count ?? 0,
                engagements: (video.like_count ?? 0) + (video.comment_count ?? 0) + (video.share_count ?? 0),
                clicks: 0,
              };
            });
            break;
          }
          case 'pinterest': {
            const breaker = this.circuitBreakers.pinterest;
            if (!breaker) break;
            metrics = await breaker.execute(async () => {
              const response = await fetch(
                `https://api.pinterest.com/v5/pins/${post.platform_post_id}?pin_metrics=true`,
                {
                  headers: { 'Authorization': `Bearer ${accessToken}` },
                  signal: controller.signal,
                }
              );
              if (!response.ok) return null;
              const data = await response.json() as { pin_metrics?: { lifetime_metrics?: { impression?: number; save?: number; pin_click?: number; outbound_click?: number } } };
              const pm = data.pin_metrics?.lifetime_metrics;
              if (!pm) return null;
              return {
                impressions: pm.impression ?? 0,
                engagements: pm.save ?? 0,
                clicks: (pm.pin_click ?? 0) + (pm.outbound_click ?? 0),
              };
            });
            break;
          }
          default:
            break;
        }
      } finally {
        clearTimeout(timeout);
      }

      if (metrics) {
        await this.db.query(
          'UPDATE social_media_posts SET impressions = ?, engagements = ?, clicks = ?, last_metrics_sync = NOW() WHERE id = ?',
          [metrics.impressions, metrics.engagements, metrics.clicks, postId]
        );
      }

      return metrics;
    } catch (error) {
      ErrorService.capture('syncPostMetrics failed', { postId, error });
      return null;
    }
  }

  /**
   * Sync metrics for all eligible posts (cron job)
   * Processes posts that haven't been synced in 6+ hours, LIMIT 50
   * @phase Tier 5A Phase 9
   */
  async syncAllPostMetrics(listingId?: number): Promise<MetricsSyncResult> {
    const result: MetricsSyncResult = { synced: 0, failed: 0, skipped: 0, timestamp: new Date().toISOString() };

    try {
      let query = `SELECT id FROM social_media_posts
        WHERE status = 'posted'
          AND platform_post_id IS NOT NULL
          AND (last_metrics_sync IS NULL OR last_metrics_sync < DATE_SUB(NOW(), INTERVAL 6 HOUR))`;
      const params: unknown[] = [];

      if (listingId) {
        query += ' AND listing_id = ?';
        params.push(listingId);
      }

      query += ' ORDER BY last_metrics_sync ASC LIMIT 50';

      const postsResult = await this.db.query<{ id: number }>(query, params);

      for (const row of postsResult.rows) {
        const metrics = await this.syncPostMetrics(row.id);
        if (metrics) {
          result.synced++;
        } else {
          result.failed++;
        }
      }
    } catch (error) {
      ErrorService.capture('syncAllPostMetrics failed', { listingId, error });
    }

    return result;
  }

  // ==========================================================================
  // ROW MAPPING HELPERS (Private)
  // ==========================================================================

  /**
   * Map a database row to app-level SocialConnection
   * SECURITY: access_token and refresh_token are EXCLUDED
   */
  private mapConnectionRow(row: SocialMediaConnectionRow): SocialConnection {
    return {
      id: row.id,
      listing_id: row.listing_id,
      user_id: row.user_id,
      platform: row.platform as SocialPlatform,
      platform_user_id: row.platform_user_id,
      platform_username: row.platform_username,
      platform_page_name: row.platform_page_name,
      scopes: safeJsonParse<string[]>(row.scopes),
      is_active: row.is_active === 1,
      token_expires_at: row.token_expires_at ? new Date(row.token_expires_at) : null,
      connected_at: row.connected_at ? new Date(row.connected_at) : null,
      last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
      created_at: new Date(row.created_at),
      updated_at: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  /**
   * Map a database row to app-level SocialPost
   */
  private mapPostRow(row: SocialMediaPostRow): SocialPost {
    return {
      id: row.id,
      connection_id: row.connection_id,
      listing_id: row.listing_id,
      content_type: row.content_type,
      content_id: row.content_id,
      platform: row.platform as SocialPlatform,
      post_text: row.post_text,
      post_image_url: row.post_image_url,
      post_link: row.post_link,
      platform_post_id: row.platform_post_id,
      platform_post_url: row.platform_post_url,
      status: row.status as SocialPost['status'],
      scheduled_at: row.scheduled_at ? new Date(row.scheduled_at) : null,
      posted_at: row.posted_at ? new Date(row.posted_at) : null,
      error_message: row.error_message,
      impressions: row.impressions,
      engagements: row.engagements,
      clicks: row.clicks,
      last_metrics_sync: row.last_metrics_sync ? new Date(row.last_metrics_sync) : null,
      created_at: new Date(row.created_at)
    };
  }
}
