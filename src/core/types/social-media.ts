/**
 * Social Media Manager Type Definitions
 *
 * @description Types for social media connections and cross-platform posting
 * @phase Tier 5A Social Media Manager - Phase 1
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier5A_Phases/PHASE_1_DATABASE_SERVICE_FOUNDATION.md
 */

// Platform types
export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'pinterest' | 'youtube';
export type SocialPostStatus = 'pending' | 'posted' | 'failed' | 'scheduled' | 'deleted';

/**
 * App-level social media connection
 * SECURITY: access_token and refresh_token are NEVER exposed outside the service
 */
export interface SocialConnection {
  id: number;
  listing_id: number;
  user_id: number;
  platform: SocialPlatform;
  platform_user_id: string | null;
  platform_username: string | null;
  platform_page_name: string | null;
  scopes: string[] | null;
  is_active: boolean;
  token_expires_at: Date | null;
  connected_at: Date | null;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

/**
 * App-level social media post entity
 */
export interface SocialPost {
  id: number;
  connection_id: number;
  listing_id: number;
  content_type: string | null;
  content_id: number;
  platform: SocialPlatform;
  post_text: string | null;
  post_image_url: string | null;
  post_link: string | null;
  platform_post_id: string | null;
  platform_post_url: string | null;
  status: SocialPostStatus;
  scheduled_at: Date | null;
  posted_at: Date | null;
  error_message: string | null;
  impressions: number;
  engagements: number;
  clicks: number;
  last_metrics_sync: Date | null;
  created_at: Date;
}

/**
 * Input for creating a social media connection
 */
export interface CreateConnectionInput {
  listing_id: number;
  user_id: number;
  platform: SocialPlatform;
  platform_user_id?: string;
  platform_username?: string;
  platform_page_name?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  scopes?: string[];
  connected_at?: Date;
}

/**
 * Input for creating a social media post
 */
export interface CreatePostInput {
  connection_id: number;
  listing_id: number;
  content_type?: string;
  content_id: number;
  platform: SocialPlatform;
  post_text?: string;
  post_image_url?: string;
  post_link?: string;
  status?: SocialPostStatus;
  scheduled_at?: Date;
}

/**
 * Filtering parameters for post queries
 */
export interface SocialPostFilters {
  status?: SocialPostStatus;
  platform?: SocialPlatform;
  contentType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Platform-specific OAuth configuration
 * @reference src/core/types/platform-sync.ts - PlatformConfig
 */
export interface SocialPlatformConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

/**
 * OAuth state data stored in-memory during OAuth flow
 * @reference PlatformSyncService OAuthStateData
 */
export interface SocialOAuthStateData {
  userId: number;
  listingId: number;
  platform: SocialPlatform;
  expiresAt: number;
}

/**
 * Token exchange result from OAuth provider
 */
export interface SocialOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  platformUserId?: string;
  platformUsername?: string;
  platformPageName?: string;
}

/**
 * Input for posting content to a social platform
 * @phase Tier 5A Social Media Manager - Phase 3
 */
export interface PostToSocialInput {
  connection_id: number;
  listing_id: number;
  content_type: string;
  content_id: number;
  platform: SocialPlatform;
  post_text: string;
  post_image_url?: string;
  post_link?: string;
}

/**
 * Result of a social media post attempt
 * @phase Tier 5A Social Media Manager - Phase 3
 */
export interface PostToSocialResult {
  success: boolean;
  post_id: number;
  platform_post_id?: string;
  platform_post_url?: string;
  posted_at?: Date;
  error?: string;
}

/**
 * Fields that can be updated on a post record
 * @phase Tier 5A Social Media Manager - Phase 3
 */
export interface PostStatusUpdate {
  status: SocialPostStatus;
  platform_post_id?: string;
  platform_post_url?: string;
  posted_at?: Date;
  error_message?: string;
}

/**
 * Per-platform posting status for the SocialMediaManagerModal
 * @phase Tier 5A Social Media Manager - Phase 4
 */
export interface SocialPostingStatus {
  platform: SocialPlatform;
  connection_id: number;
  status: 'idle' | 'posting' | 'success' | 'failed';
  result?: PostToSocialResult;
  error?: string;
}

/**
 * Platform-specific posting constraints
 * @phase Tier 5A Social Media Manager - Phase 5
 */
export interface PlatformConstraints {
  maxCharacters: number;
  warningThreshold: number;
  maxHashtags: number | null;
  linkCountsAsCharacters: boolean;
  supportsImages: boolean;
  supportsMultipleImages: boolean;
  maxImages: number;
  platformDisplayName: string;
}

/**
 * Character validation result (follows SEOPreviewPanel ValidationResult pattern)
 * @phase Tier 5A Social Media Manager - Phase 5
 * @reference src/features/dashboard/components/managers/content/SEOPreviewPanel.tsx
 */
export interface PlatformCharacterValidation {
  status: 'good' | 'warning' | 'error';
  message: string;
  count: number;
  max: number;
}

/**
 * Per-platform post text entry
 * @phase Tier 5A Social Media Manager - Phase 5
 */
export interface PlatformPostText {
  platform: SocialPlatform;
  text: string;
  validation: PlatformCharacterValidation;
}

/**
 * Input for scheduling a social media post
 * @phase Tier 5A Social Media Manager - Phase 7
 */
export interface SchedulePostInput {
  connection_id: number;
  listing_id: number;
  content_type: string;
  content_id: number;
  platform: SocialPlatform;
  post_text: string;
  post_image_url?: string;
  post_link?: string;
  scheduled_at: Date;
}

/**
 * Input for rescheduling a scheduled post
 * @phase Tier 5A Social Media Manager - Phase 7
 */
export interface ReschedulePostInput {
  scheduled_at: Date;
  post_text?: string;
}

/**
 * Result of the cron scheduled post processor
 * @phase Tier 5A Social Media Manager - Phase 7
 */
export interface ScheduledPostProcessorResult {
  processed: number;
  posted: number;
  failed: number;
  skipped: number;
  by_post: Array<{
    post_id: number;
    platform: SocialPlatform;
    status: 'posted' | 'failed' | 'skipped';
    error?: string;
  }>;
  timestamp: string;
}

/**
 * Social connection with token expiry status for settings page display
 * @phase Tier 5A Social Media Manager - Phase 8
 */
export interface SocialConnectionStatus {
  connection: SocialConnection;
  tokenStatus: 'valid' | 'expiring_soon' | 'expired' | 'unknown';
  daysUntilExpiry: number | null;
}

/**
 * Available platform for connection (not yet connected)
 * @phase Tier 5A Social Media Manager - Phase 8
 */
export interface AvailablePlatform {
  platform: SocialPlatform;
  displayName: string;
  isConnected: boolean;
  connection?: SocialConnection;
}

// ============================================================================
// ANALYTICS TYPES (Phase 9)
// ============================================================================

/** Aggregated analytics summary for KPI cards */
export interface SocialAnalyticsSummary {
  totalPosts: number;
  totalPosted: number;
  totalFailed: number;
  totalScheduled: number;
  totalImpressions: number;
  totalEngagements: number;
  totalClicks: number;
  avgEngagementRate: number;
  avgClickRate: number;
}

/** Per-platform analytics breakdown */
export interface SocialPlatformAnalytics {
  platform: SocialPlatform;
  postCount: number;
  impressions: number;
  engagements: number;
  clicks: number;
  engagementRate: number;
  clickRate: number;
}

/** Time-series data point for social analytics */
export interface SocialTimeSeriesPoint {
  date: string;
  posts: number;
  impressions: number;
  engagements: number;
  clicks: number;
}

/** Content type performance breakdown */
export interface SocialContentTypeAnalytics {
  contentType: string;
  postCount: number;
  impressions: number;
  engagements: number;
  clicks: number;
  engagementRate: number;
}

/** Posting cadence analytics */
export interface SocialPostingCadence {
  byDayOfWeek: Array<{ day: string; count: number; avgEngagement: number }>;
  byHourOfDay: Array<{ hour: number; count: number; avgEngagement: number }>;
}

/** Combined analytics response */
export interface SocialAnalyticsData {
  summary: SocialAnalyticsSummary;
  byPlatform: SocialPlatformAnalytics[];
  timeSeries: SocialTimeSeriesPoint[];
  byContentType: SocialContentTypeAnalytics[];
  cadence: SocialPostingCadence;
  lastMetricsSync: string | null;
}

/** Metrics sync result (per-post sync from platform APIs) */
export interface MetricsSyncResult {
  synced: number;
  failed: number;
  skipped: number;
  timestamp: string;
}

/**
 * AI-generated hashtag suggestion
 * @phase Tier 5A Social Media Manager - Phase 10
 */
export interface HashtagSuggestion {
  tag: string;
  relevance: 'high' | 'medium' | 'low';
  category: 'content' | 'trending' | 'industry' | 'platform';
}
