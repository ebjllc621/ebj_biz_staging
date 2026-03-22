/**
 * Dashboard Types
 *
 * Type definitions for dashboard components and services
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 */

export interface DashboardStats {
  connections: number;
  profile_views: number;
  unread_messages: number;
  pending_requests: number;
  bookmarks_count: number;
  reviews_count: number;
  recommendations_sent: number;
  referrals_sent: number;
}

export interface NotificationSummary {
  total_unread: number;
  by_type: {
    connection_request: number;
    message: number;
    bizwire: number;
    review: number;
    mention: number;
    system: number;
    recommendation?: number; // Unread recommendations count
  };
}

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message?: string;
  entity_type?: string;
  entity_id?: number;
  action_url?: string;
  is_read: boolean;
  created_at: Date;
}

export interface Bookmark {
  id: number;
  entity_type: 'listing' | 'event' | 'offer' | 'content';
  entity_id: number;
  entity_name: string;
  entity_image?: string;
  notes?: string;
  created_at: Date;
}

export interface DashboardActivityItem {
  id: number;
  type: 'connection' | 'review' | 'listing' | 'offer' | 'event' | 'message';
  title: string;
  description: string;
  actor_name?: string;
  created_at: Date;
}

// Listing Stats (Phase 6)
export type { ListingStats, ListingActivityItem } from './listing-stats';

// ============================================================================
// PHASE 10 TYPES: Marketing & Advanced Features
// ============================================================================

// Re-export Campaign types from CampaignService
export type {
  Campaign,
  CampaignType,
  CampaignStatus,
  CampaignTargeting,
  CampaignCreatives,
  CampaignPerformance
} from '@core/services/CampaignService';

// Re-export Subscription types from SubscriptionService
export type {
  SubscriptionPlan,
  AddonSuite,
  ListingSubscription,
  ListingSubscriptionAddon,
  ListingTier,
  SubscriptionStatus,
  AddonStatus,
  AddonSuiteName,
  TierLimits
} from '@core/types/subscription';

// Analytics Types
export interface AnalyticsDateRange {
  start: string; // ISO date (YYYY-MM-DD)
  end: string;   // ISO date (YYYY-MM-DD)
  preset: '7d' | '30d' | '90d' | 'custom';
}

export interface ViewsTrendData {
  date: string;
  views: number;
}

export interface SourceData {
  source: string;
  views: number;
  percentage: number;
}

export interface EngagementData {
  clicks: number;
  averageTimeOnPage: number;
  bounceRate: number;
  conversions: number;
}

export interface AnalyticsSummary {
  viewsTrend: ViewsTrendData[];
  sources: SourceData[];
  engagement: EngagementData;
  totalViews: number;
  last30DaysViews: number;
}

// Campaign Form Types
export interface CampaignFormData {
  title: string;
  description: string;
  campaign_type: import('@core/services/CampaignService').CampaignType;
  budget: number;
  daily_budget?: number;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  target_audience?: {
    categories?: number[];
    locations?: string[];
    tiers?: string[];
    engagement?: 'high' | 'medium' | 'low';
  };
  creatives?: {
    images?: string[];
    text?: string;
    cta?: string;
  };
}

// Billing Types
export interface PlanFeatureComparison {
  name: string;
  essentials: string | number | boolean;
  plus: string | number | boolean;
  preferred: string | number | boolean;
  premium: string | number | boolean;
}

export interface CurrentPlanInfo {
  plan: import('@core/services/SubscriptionService').SubscriptionPlan;
  subscription: import('@core/services/SubscriptionService').ListingSubscription;
  activeAddons: import('@core/services/SubscriptionService').ListingSubscriptionAddon[];
  totalMonthlyCost: number;
  renewsAt: Date | null;
}
