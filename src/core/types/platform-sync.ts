/**
 * Platform Sync Type Definitions
 *
 * @description Types for OAuth platform connections and metrics sync
 * @phase Tier 3 Creator Profiles - Phase 9B
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9B_INTERNET_PERSONALITY_PLATFORM_SYNC.md
 */

// Platform types
export type SyncPlatform = 'youtube' | 'instagram' | 'tiktok';
export type ProfileSyncType = 'affiliate_marketer' | 'internet_personality';
export type SyncStatus = 'success' | 'failure' | 'pending';

// Platform OAuth Token (app-level — NEVER includes raw tokens)
export interface PlatformConnection {
  id: number;
  user_id: number;
  profile_type: ProfileSyncType;
  profile_id: number;
  platform: SyncPlatform;
  platform_user_id: string | null;
  platform_username: string | null;
  is_active: boolean;
  linked_at: Date;
  last_synced_at: Date | null;
  last_sync_status: SyncStatus;
  last_sync_error: string | null;
}

// Platform Metrics Snapshot
export interface PlatformMetricsSnapshot {
  id: number;
  profile_id: number;
  profile_type: ProfileSyncType;
  platform: SyncPlatform;
  follower_count: number;
  following_count: number;
  post_count: number;
  avg_engagement_rate: number | null;
  avg_views: number;
  subscriber_count: number;
  total_views: number;
  audience_demographics: Record<string, unknown> | null;
  raw_metrics: Record<string, unknown> | null;
  recorded_at: Date;
  sync_run_id: string | null;
}

// Input for initiating OAuth
export interface PlatformConnectInput {
  platform: SyncPlatform;
  profile_type: ProfileSyncType;
  profile_id: number;
}

// Platform-specific config
export interface PlatformConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

// Normalized metrics from any platform
export interface NormalizedPlatformMetrics {
  follower_count: number;
  following_count: number;
  post_count: number;
  avg_engagement_rate: number | null;
  avg_views: number;
  subscriber_count: number;
  total_views: number;
  audience_demographics: Record<string, unknown> | null;
  platform_user_id: string;
  platform_username: string;
}
