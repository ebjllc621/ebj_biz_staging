/**
 * PlatformSyncService - OAuth Platform Integration + Metrics Sync
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Circuit breaker: Required for ADVANCED tier external service calls (per FCMPushProvider pattern)
 * - AbortController: All external API calls (per CronJobService.triggerJob pattern)
 * - Token encryption: AES-256-GCM via Node.js crypto
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9B_INTERNET_PERSONALITY_PLATFORM_SYNC.md
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9B
 * @reference src/core/services/notification/FCMPushProvider.ts - CircuitBreaker pattern
 * @reference src/core/services/CronJobService.ts - Singleton + AbortController pattern
 */

import crypto from 'crypto';
import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { ErrorService } from '@core/services/ErrorService';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/json';
import type {
  SyncPlatform,
  ProfileSyncType,
  PlatformConnection,
  PlatformMetricsSnapshot,
  PlatformConfig,
  NormalizedPlatformMetrics,
} from '@core/types/platform-sync';
import type { PlatformOAuthTokenRow, PlatformMetricsHistoryRow } from '@core/types/db-rows';

// ============================================================================
// Platform Config Registry
// ============================================================================

const PLATFORM_CONFIGS: Record<SyncPlatform, PlatformConfig> = {
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: process.env.YOUTUBE_REDIRECT_URI || '',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID || '',
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI || '',
    scopes: ['instagram_basic', 'instagram_manage_insights'],
    authUrl: 'https://www.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
  },
  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    redirectUri: process.env.TIKTOK_REDIRECT_URI || '',
    scopes: ['user.info.basic', 'user.info.stats'],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  },
};

// ============================================================================
// Circuit Breaker (replicated from FCMPushProvider — ADVANCED tier requirement)
// ============================================================================

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  isOpen: boolean;
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: null,
    isOpen: false,
  };

  constructor(
    private maxFailures: number = 5,
    private resetTimeoutMs: number = 60000
  ) {}

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.isOpen && this.shouldReset()) {
      this.reset();
    }

    if (this.state.isOpen) {
      throw new Error('Circuit breaker open — platform temporarily unavailable');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.failures = 0;
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();
    if (this.state.failures >= this.maxFailures) {
      this.state.isOpen = true;
      console.warn(`[PlatformSyncService] Circuit breaker opened after ${this.state.failures} failures`);
    }
  }

  private shouldReset(): boolean {
    if (!this.state.lastFailureTime) return false;
    return Date.now() - this.state.lastFailureTime >= this.resetTimeoutMs;
  }

  private reset(): void {
    console.log('[PlatformSyncService] Circuit breaker reset');
    this.state.failures = 0;
    this.state.lastFailureTime = null;
    this.state.isOpen = false;
  }

  public getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

// ============================================================================
// OAuth State Store (in-memory with TTL)
// ============================================================================

interface OAuthStateData {
  userId: number;
  profileType: ProfileSyncType;
  profileId: number;
  platform: SyncPlatform;
  expiresAt: number;
}

const oauthStateStore = new Map<string, OAuthStateData>();

// Cleanup expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of oauthStateStore.entries()) {
    if (value.expiresAt < now) {
      oauthStateStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ============================================================================
// Sync Result Types
// ============================================================================

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface BulkSyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}

// ============================================================================
// PlatformSyncService Implementation
// ============================================================================

export class PlatformSyncService {
  private db: DatabaseService;
  private circuitBreakers: Record<SyncPlatform, CircuitBreaker>;

  constructor(db: DatabaseService) {
    this.db = db;
    this.circuitBreakers = {
      youtube: new CircuitBreaker(5, 60000),
      instagram: new CircuitBreaker(5, 60000),
      tiktok: new CircuitBreaker(5, 60000),
    };
  }

  // ============================================================================
  // Token Encryption/Decryption
  // ============================================================================

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

  // ============================================================================
  // OAuth Flow
  // ============================================================================

  /**
   * Generate OAuth authorization URL with cryptographic state parameter
   */
  getAuthorizationUrl(
    platform: SyncPlatform,
    profileType: ProfileSyncType,
    profileId: number,
    userId: number
  ): string {
    const config = PLATFORM_CONFIGS[platform];
    if (!config.clientId) {
      throw BizError.badRequest(`Platform ${platform} is not configured`);
    }

    // Generate cryptographic state
    const nonce = crypto.randomBytes(32).toString('hex');
    const stateData: OAuthStateData = {
      userId,
      profileType,
      profileId,
      platform,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute TTL
    };
    oauthStateStore.set(nonce, stateData);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: nonce,
      access_type: 'offline', // YouTube-specific but harmless for others
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Validate and consume OAuth state parameter (anti-CSRF)
   */
  validateAndConsumeState(state: string): OAuthStateData {
    const data = oauthStateStore.get(state);
    if (!data) {
      throw BizError.badRequest('Invalid or expired OAuth state');
    }
    if (data.expiresAt < Date.now()) {
      oauthStateStore.delete(state);
      throw BizError.badRequest('OAuth state has expired — please try connecting again');
    }
    oauthStateStore.delete(state);
    return data;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    platform: SyncPlatform,
    code: string
  ): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null; scope: string | null }> {
    const config = PLATFORM_CONFIGS[platform];

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

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Token exchange failed (${response.status}): ${errText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      const accessToken = (data.access_token as string) || '';
      const refreshToken = (data.refresh_token as string) || null;
      const expiresIn = data.expires_in as number | undefined;
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
      const scope = (data.scope as string) || null;

      return { accessToken, refreshToken, expiresAt, scope };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshAccessToken(
    tokenRow: PlatformOAuthTokenRow
  ): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null }> {
    if (!tokenRow.refresh_token_encrypted || !tokenRow.token_iv) {
      throw new Error('No refresh token available');
    }

    const refreshToken = this.decryptToken(tokenRow.refresh_token_encrypted, tokenRow.token_iv);
    const platform = tokenRow.platform as SyncPlatform;
    const config = PLATFORM_CONFIGS[platform];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

      return { accessToken, refreshToken: newRefreshToken, expiresAt };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  // ============================================================================
  // Connection CRUD
  // ============================================================================

  /**
   * Get all connections for a profile (NEVER returns tokens)
   */
  async getConnections(profileType: ProfileSyncType, profileId: number): Promise<PlatformConnection[]> {
    const result = await this.db.query<PlatformOAuthTokenRow>(
      `SELECT id, user_id, profile_type, profile_id, platform, platform_user_id, platform_username,
              is_active, linked_at, last_synced_at, last_sync_status, last_sync_error
       FROM platform_oauth_tokens
       WHERE profile_type = ? AND profile_id = ?
       ORDER BY platform`,
      [profileType, profileId]
    );

    return result.rows.map(row => this.mapConnectionRow(row));
  }

  /**
   * Save a new connection (encrypt tokens before storage)
   */
  async saveConnection(
    userId: number,
    profileType: ProfileSyncType,
    profileId: number,
    platform: SyncPlatform,
    tokens: { accessToken: string; refreshToken: string | null; expiresAt: Date | null; scope: string | null },
    platformInfo: { platformUserId: string; platformUsername: string }
  ): Promise<PlatformConnection> {
    const { encrypted: accessEncrypted, iv } = this.encryptToken(tokens.accessToken);
    let refreshEncrypted: Buffer | null = null;
    if (tokens.refreshToken) {
      const { encrypted } = this.encryptToken(tokens.refreshToken);
      refreshEncrypted = encrypted;
    }

    // Upsert — if connection already exists, update it
    await this.db.query(
      `INSERT INTO platform_oauth_tokens
         (user_id, profile_type, profile_id, platform, platform_user_id, platform_username,
          access_token_encrypted, refresh_token_encrypted, token_iv, token_expires_at, scope, is_active,
          linked_at, last_sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), 'pending')
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         platform_user_id = VALUES(platform_user_id),
         platform_username = VALUES(platform_username),
         access_token_encrypted = VALUES(access_token_encrypted),
         refresh_token_encrypted = VALUES(refresh_token_encrypted),
         token_iv = VALUES(token_iv),
         token_expires_at = VALUES(token_expires_at),
         scope = VALUES(scope),
         is_active = 1,
         linked_at = NOW(),
         last_sync_status = 'pending',
         updated_at = NOW()`,
      [
        userId,
        profileType,
        profileId,
        platform,
        platformInfo.platformUserId,
        platformInfo.platformUsername,
        accessEncrypted,
        refreshEncrypted,
        iv,
        tokens.expiresAt,
        tokens.scope,
      ]
    );

    const connections = await this.getConnections(profileType, profileId);
    const connection = connections.find(c => c.platform === platform);
    if (!connection) throw new Error('Failed to retrieve saved connection');
    return connection;
  }

  /**
   * Soft-delete a connection (set is_active = 0, preserve history)
   */
  async disconnectPlatform(profileType: ProfileSyncType, profileId: number, platform: SyncPlatform): Promise<void> {
    await this.db.query(
      `UPDATE platform_oauth_tokens SET is_active = 0, updated_at = NOW()
       WHERE profile_type = ? AND profile_id = ? AND platform = ?`,
      [profileType, profileId, platform]
    );
  }

  /**
   * Get all active connections across all profiles (for cron bulk sync)
   */
  async getActiveConnectionsForSync(): Promise<PlatformOAuthTokenRow[]> {
    const result = await this.db.query<PlatformOAuthTokenRow>(
      `SELECT * FROM platform_oauth_tokens WHERE is_active = 1 ORDER BY platform, profile_id`
    );
    return result.rows;
  }

  // ============================================================================
  // Metrics Fetch (per-platform normalizers)
  // ============================================================================

  /**
   * Get a decrypted access token, refreshing if expired
   */
  private async getValidAccessToken(tokenRow: PlatformOAuthTokenRow): Promise<string> {
    const isExpired = tokenRow.token_expires_at && new Date(tokenRow.token_expires_at) < new Date();

    if (isExpired && tokenRow.refresh_token_encrypted) {
      try {
        const refreshed = await this.refreshAccessToken(tokenRow);
        // Update DB with new tokens
        const { encrypted: newAccessEncrypted, iv: newIv } = this.encryptToken(refreshed.accessToken);
        let newRefreshEncrypted: Buffer | null = null;
        if (refreshed.refreshToken) {
          const { encrypted } = this.encryptToken(refreshed.refreshToken);
          newRefreshEncrypted = encrypted;
        }
        await this.db.query(
          `UPDATE platform_oauth_tokens
           SET access_token_encrypted = ?, refresh_token_encrypted = COALESCE(?, refresh_token_encrypted),
               token_iv = ?, token_expires_at = ?, updated_at = NOW()
           WHERE id = ?`,
          [newAccessEncrypted, newRefreshEncrypted, newIv, refreshed.expiresAt, tokenRow.id]
        );
        return refreshed.accessToken;
      } catch (err) {
        // Mark connection as inactive if refresh fails
        await this.db.query(
          `UPDATE platform_oauth_tokens SET is_active = 0, last_sync_status = 'failure',
           last_sync_error = ?, updated_at = NOW() WHERE id = ?`,
          ['Token refresh failed — reconnect required', tokenRow.id]
        );
        throw new Error('Access token expired and refresh failed');
      }
    }

    return this.decryptToken(tokenRow.access_token_encrypted, tokenRow.token_iv);
  }

  /**
   * Fetch YouTube channel metrics
   */
  private async fetchYouTubeMetrics(accessToken: string): Promise<NormalizedPlatformMetrics> {
    return this.circuitBreakers.youtube.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/channels');
        url.searchParams.set('part', 'snippet,statistics');
        url.searchParams.set('mine', 'true');

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`YouTube API error (${response.status})`);
        }

        const data = await response.json() as Record<string, unknown>;
        const items = data.items as Array<Record<string, unknown>> | undefined;
        const channel = items?.[0];
        if (!channel) throw new Error('No YouTube channel found');

        const stats = channel.statistics as Record<string, string> | undefined;
        const snippet = channel.snippet as Record<string, string> | undefined;

        return {
          follower_count: 0,
          following_count: 0,
          post_count: bigIntToNumber(parseInt(stats?.videoCount || '0', 10)),
          avg_engagement_rate: null,
          avg_views: 0,
          subscriber_count: bigIntToNumber(parseInt(stats?.subscriberCount || '0', 10)),
          total_views: bigIntToNumber(parseInt(stats?.viewCount || '0', 10)),
          audience_demographics: null,
          platform_user_id: channel.id as string || '',
          platform_username: snippet?.title || '',
        };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  /**
   * Fetch Instagram account metrics
   */
  private async fetchInstagramMetrics(accessToken: string): Promise<NormalizedPlatformMetrics> {
    return this.circuitBreakers.instagram.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const url = new URL('https://graph.instagram.com/me');
        url.searchParams.set('fields', 'id,username,followers_count,follows_count,media_count');
        url.searchParams.set('access_token', accessToken);

        const response = await fetch(url.toString(), { signal: controller.signal });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Instagram API error (${response.status})`);
        }

        const data = await response.json() as Record<string, unknown>;

        return {
          follower_count: bigIntToNumber((data.followers_count as number) || 0),
          following_count: bigIntToNumber((data.follows_count as number) || 0),
          post_count: bigIntToNumber((data.media_count as number) || 0),
          avg_engagement_rate: null,
          avg_views: 0,
          subscriber_count: 0,
          total_views: 0,
          audience_demographics: null,
          platform_user_id: (data.id as string) || '',
          platform_username: (data.username as string) || '',
        };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  /**
   * Fetch TikTok account metrics
   */
  private async fetchTikTokMetrics(accessToken: string): Promise<NormalizedPlatformMetrics> {
    return this.circuitBreakers.tiktok.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,follower_count,following_count,likes_count,video_count', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`TikTok API error (${response.status})`);
        }

        const data = await response.json() as Record<string, unknown>;
        const user = (data.data as Record<string, unknown>)?.user as Record<string, unknown> | undefined;

        return {
          follower_count: bigIntToNumber((user?.follower_count as number) || 0),
          following_count: bigIntToNumber((user?.following_count as number) || 0),
          post_count: bigIntToNumber((user?.video_count as number) || 0),
          avg_engagement_rate: null,
          avg_views: 0,
          subscriber_count: 0,
          total_views: 0,
          audience_demographics: null,
          platform_user_id: (user?.open_id as string) || '',
          platform_username: (user?.display_name as string) || '',
        };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }

  // ============================================================================
  // Sync Orchestration
  // ============================================================================

  /**
   * Sync metrics for a single profile (all active platforms)
   */
  async syncProfile(profileType: ProfileSyncType, profileId: number): Promise<SyncResult> {
    const result = await this.db.query<PlatformOAuthTokenRow>(
      `SELECT * FROM platform_oauth_tokens WHERE profile_type = ? AND profile_id = ? AND is_active = 1`,
      [profileType, profileId]
    );

    const syncResult: SyncResult = { synced: 0, failed: 0, errors: [] };
    const syncRunId = crypto.randomUUID();

    for (const tokenRow of result.rows) {
      try {
        const accessToken = await this.getValidAccessToken(tokenRow);
        const platform = tokenRow.platform as SyncPlatform;

        let metrics: NormalizedPlatformMetrics;
        if (platform === 'youtube') {
          metrics = await this.fetchYouTubeMetrics(accessToken);
        } else if (platform === 'instagram') {
          metrics = await this.fetchInstagramMetrics(accessToken);
        } else {
          metrics = await this.fetchTikTokMetrics(accessToken);
        }

        await this.saveMetricsSnapshot({
          profile_id: profileId,
          profile_type: profileType,
          platform,
          metrics,
          syncRunId,
        });

        // Update token row: last_synced_at, status, platform info
        await this.db.query(
          `UPDATE platform_oauth_tokens SET
             last_synced_at = NOW(), last_sync_status = 'success', last_sync_error = NULL,
             platform_user_id = ?, platform_username = ?, updated_at = NOW()
           WHERE id = ?`,
          [metrics.platform_user_id, metrics.platform_username, tokenRow.id]
        );

        syncResult.synced++;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown sync error';
        await this.db.query(
          `UPDATE platform_oauth_tokens SET last_sync_status = 'failure', last_sync_error = ?, updated_at = NOW() WHERE id = ?`,
          [errMsg.substring(0, 500), tokenRow.id]
        );
        syncResult.failed++;
        syncResult.errors.push(`${tokenRow.platform}: ${errMsg}`);
        ErrorService.capture(`PlatformSyncService.syncProfile error for profile ${profileId}:`, error);
      }
    }

    // Update profile totals after sync
    if (syncResult.synced > 0) {
      await this.updateProfileFromMetrics(profileType, profileId);
    }

    return syncResult;
  }

  /**
   * Sync all active connections across all profiles (for cron job)
   */
  async syncAllProfiles(): Promise<BulkSyncResult> {
    const allTokens = await this.getActiveConnectionsForSync();
    const bulk: BulkSyncResult = { total: allTokens.length, synced: 0, failed: 0, errors: [] };

    // Process in batches of 10 (rate limit compliance)
    const batchSize = 10;
    for (let i = 0; i < allTokens.length; i += batchSize) {
      const batch = allTokens.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (tokenRow) => {
          const platform = tokenRow.platform as SyncPlatform;
          const profileType = tokenRow.profile_type as ProfileSyncType;
          const profileId = tokenRow.profile_id;

          const accessToken = await this.getValidAccessToken(tokenRow);
          let metrics: NormalizedPlatformMetrics;

          if (platform === 'youtube') {
            metrics = await this.fetchYouTubeMetrics(accessToken);
          } else if (platform === 'instagram') {
            metrics = await this.fetchInstagramMetrics(accessToken);
          } else {
            metrics = await this.fetchTikTokMetrics(accessToken);
          }

          const syncRunId = crypto.randomUUID();
          await this.saveMetricsSnapshot({ profile_id: profileId, profile_type: profileType, platform, metrics, syncRunId });

          await this.db.query(
            `UPDATE platform_oauth_tokens SET
               last_synced_at = NOW(), last_sync_status = 'success', last_sync_error = NULL,
               platform_user_id = ?, platform_username = ?, updated_at = NOW()
             WHERE id = ?`,
            [metrics.platform_user_id, metrics.platform_username, tokenRow.id]
          );
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          bulk.synced++;
        } else {
          bulk.failed++;
          const errMsg = result.reason instanceof Error ? result.reason.message : 'Unknown error';
          bulk.errors.push(errMsg);
        }
      }
    }

    return bulk;
  }

  /**
   * Save a metrics snapshot to platform_metrics_history
   */
  async saveMetricsSnapshot(data: {
    profile_id: number;
    profile_type: ProfileSyncType;
    platform: SyncPlatform;
    metrics: NormalizedPlatformMetrics;
    syncRunId: string;
  }): Promise<void> {
    const { profile_id, profile_type, platform, metrics, syncRunId } = data;

    await this.db.query(
      `INSERT INTO platform_metrics_history
         (profile_id, profile_type, platform, follower_count, following_count, post_count,
          avg_engagement_rate, avg_views, subscriber_count, total_views, audience_demographics,
          raw_metrics, sync_run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        profile_id,
        profile_type,
        platform,
        metrics.follower_count,
        metrics.following_count,
        metrics.post_count,
        metrics.avg_engagement_rate,
        metrics.avg_views,
        metrics.subscriber_count,
        metrics.total_views,
        metrics.audience_demographics ? JSON.stringify(metrics.audience_demographics) : null,
        syncRunId,
      ]
    );
  }

  /**
   * Update profile aggregate metrics from latest platform snapshots
   */
  async updateProfileFromMetrics(profileType: ProfileSyncType, profileId: number): Promise<void> {
    // Get latest snapshot per platform
    const latestMetrics = await this.getLatestMetrics(profileType, profileId);

    let totalReach = 0;
    let totalEngagementRate = 0;
    let engagementCount = 0;
    const platforms: string[] = [];

    for (const [platform, snapshot] of Object.entries(latestMetrics)) {
      if (!snapshot) continue;
      platforms.push(platform);
      totalReach += snapshot.follower_count + snapshot.subscriber_count;
      if (snapshot.avg_engagement_rate !== null) {
        totalEngagementRate += snapshot.avg_engagement_rate;
        engagementCount++;
      }
    }

    const avgEngagementRate = engagementCount > 0 ? totalEngagementRate / engagementCount : null;

    if (profileType === 'internet_personality') {
      const updates: string[] = [];
      const values: unknown[] = [];

      if (totalReach > 0) {
        updates.push('total_reach = ?');
        values.push(totalReach);
      }
      if (avgEngagementRate !== null) {
        updates.push('avg_engagement_rate = ?');
        values.push(avgEngagementRate);
      }

      if (updates.length > 0) {
        values.push(profileId);
        await this.db.query(
          `UPDATE content_internet_personalities SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }
    }
  }

  /**
   * Get latest metrics snapshot per platform for a profile
   */
  async getLatestMetrics(
    profileType: ProfileSyncType,
    profileId: number
  ): Promise<Record<string, PlatformMetricsSnapshot | null>> {
    const result = await this.db.query<PlatformMetricsHistoryRow>(
      `SELECT h.*
       FROM platform_metrics_history h
       INNER JOIN (
         SELECT platform, MAX(recorded_at) AS max_recorded
         FROM platform_metrics_history
         WHERE profile_id = ? AND profile_type = ?
         GROUP BY platform
       ) latest ON h.platform = latest.platform AND h.recorded_at = latest.max_recorded
       WHERE h.profile_id = ? AND h.profile_type = ?`,
      [profileId, profileType, profileId, profileType]
    );

    const map: Record<string, PlatformMetricsSnapshot | null> = {};
    for (const row of result.rows) {
      map[row.platform] = this.mapMetricsRow(row);
    }
    return map;
  }

  // ============================================================================
  // Row Mappers
  // ============================================================================

  private mapConnectionRow(row: PlatformOAuthTokenRow): PlatformConnection {
    return {
      id: row.id,
      user_id: row.user_id,
      profile_type: row.profile_type as ProfileSyncType,
      profile_id: row.profile_id,
      platform: row.platform as SyncPlatform,
      platform_user_id: row.platform_user_id,
      platform_username: row.platform_username,
      is_active: row.is_active === 1,
      linked_at: new Date(row.linked_at),
      last_synced_at: row.last_synced_at ? new Date(row.last_synced_at) : null,
      last_sync_status: (row.last_sync_status || 'pending') as 'success' | 'failure' | 'pending',
      last_sync_error: row.last_sync_error,
    };
  }

  private mapMetricsRow(row: PlatformMetricsHistoryRow): PlatformMetricsSnapshot {
    return {
      id: row.id,
      profile_id: row.profile_id,
      profile_type: row.profile_type as ProfileSyncType,
      platform: row.platform as SyncPlatform,
      follower_count: row.follower_count,
      following_count: row.following_count,
      post_count: row.post_count,
      avg_engagement_rate: row.avg_engagement_rate,
      avg_views: row.avg_views,
      subscriber_count: row.subscriber_count,
      total_views: bigIntToNumber(row.total_views),
      audience_demographics: row.audience_demographics
        ? safeJsonParse<Record<string, unknown>>(
            typeof row.audience_demographics === 'string'
              ? row.audience_demographics
              : JSON.stringify(row.audience_demographics)
          )
        : null,
      raw_metrics: row.raw_metrics
        ? safeJsonParse<Record<string, unknown>>(
            typeof row.raw_metrics === 'string'
              ? row.raw_metrics
              : JSON.stringify(row.raw_metrics)
          )
        : null,
      recorded_at: new Date(row.recorded_at),
      sync_run_id: row.sync_run_id,
    };
  }
}

// ============================================================================
// Singleton Factory (CronJobService pattern)
// ============================================================================

let instance: PlatformSyncService | null = null;

export function getPlatformSyncService(): PlatformSyncService {
  if (!instance) {
    instance = new PlatformSyncService(getDatabaseService());
  }
  return instance;
}
