/**
 * Sharing Analytics Types
 *
 * Phase 10: Admin Analytics & Dashboard types for unified sharing system
 *
 * @phase Phase 10 - Analytics & Admin Dashboard
 * @authority docs/components/connections/userrecommendations/phases/PHASE_10_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

// ============================================================================
// METRICS INTERFACES
// ============================================================================

export interface SharingMetricsOverview {
  total_recommendations: number;
  total_views: number;
  total_helpful: number;
  total_not_helpful: number;
  total_thanked: number;
  avg_quality_score: number;
  spam_flag_count: number;
}

export interface SharingFunnelMetrics {
  period: 'day' | 'week' | 'month';
  stages: {
    sent: number;
    viewed: number;
    rated: number;
    helpful: number;
    thanked: number;
  };
  conversion_rates: {
    view_rate: number;       // viewed / sent * 100
    rating_rate: number;     // rated / viewed * 100
    helpful_rate: number;    // helpful / rated * 100
    thank_rate: number;      // thanked / sent * 100
  };
}

export interface SharingQualityMetrics {
  total_rated: number;
  helpful_count: number;
  not_helpful_count: number;
  helpful_rate: number;
  avg_view_time_seconds: number | null;
  engagement_score: number; // 0-100 composite score
}

export interface SharingBreakdownMetrics {
  by_entity_type: Array<{
    entity_type: string;
    count: number;
    helpful_rate: number;
    avg_views: number;
  }>;
  by_sender: Array<{
    user_id: number;
    display_name: string | null;
    total_sent: number;
    helpful_rate: number;
    quality_score: number;
  }>;
  top_recipients: Array<{
    user_id: number;
    display_name: string | null;
    total_received: number;
    response_rate: number;
  }>;
}

// ============================================================================
// SPAM DETECTION INTERFACES
// ============================================================================

export interface SpamAlert {
  id: number;
  user_id: number;
  alert_type: 'rate_limit' | 'duplicate_message' | 'bulk_send' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high';
  description: string;
  metadata: {
    shares_per_hour?: number;
    duplicate_message_count?: number;
    bulk_send_count?: number;
    ip_address?: string;
    [key: string]: unknown;
  };
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  reviewed_by: number | null;
  reviewed_at: Date | null;
  action_taken: string | null;
  created_at: Date;
}

export interface SpamThresholds {
  shares_per_hour: number;           // Default: 20
  duplicate_message_count: number;   // Default: 5
  accounts_per_ip: number;           // Default: 3 (24h window)
  min_account_age_hours: number;     // Default: 24
  bulk_send_threshold: number;       // Default: 50
}

export interface SpamDetectionResult {
  is_spam: boolean;
  score: number; // 0-100, higher = more likely spam
  flags: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    reason: string;
  }>;
  recommended_action: 'allow' | 'warn' | 'block';
}

// ============================================================================
// A/B TESTING INTERFACES
// ============================================================================

export interface ABTestResult {
  test_id: string;
  feature_flag_key: string;
  variant_id: string;
  variant_name: string;
  metrics: {
    total_users: number;
    total_recommendations: number;
    avg_quality_score: number;
    helpful_rate: number;
    thank_rate: number;
    engagement_score: number;
    // Phase 10.1: Statistical significance
    p_value?: number;
    z_score?: number;
    significant?: boolean;
    confidence_interval?: {
      lower: number;
      upper: number;
      confidence_level: number;
    };
    lift_percentage?: number;
    min_sample_reached?: boolean;
  };
  confidence_interval: {
    helpful_rate_lower: number;
    helpful_rate_upper: number;
    confidence_level: number; // e.g., 0.95 for 95%
  } | null;
}

export interface ABTestComparison {
  control: ABTestResult;
  variants: ABTestResult[];
  winner: {
    variant_id: string;
    improvement: number; // % improvement over control
    confidence: number;   // statistical confidence 0-1
    significant: boolean;
  } | null;
}

// ============================================================================
// QUALITY SCORE CALCULATION
// ============================================================================

/**
 * Quality Score Formula (0-100):
 *
 * quality_score = (helpful_rate * 0.50) + (engagement_rate * 0.30) + ((1 - spam_rate) * 0.20 * 100)
 *
 * Where:
 * - helpful_rate = helpful / rated (if rated > 0, else 0)
 * - engagement_rate = (viewed + rated + thanked) / sent
 * - spam_rate = spam_flags / sent (if flagged)
 *
 * Tiers:
 * - Excellent: 80-100
 * - Good: 60-79
 * - Fair: 40-59
 * - Poor: 0-39
 */
export interface QualityScoreBreakdown {
  score: number;
  tier: 'excellent' | 'good' | 'fair' | 'poor';
  components: {
    helpful_component: number;      // 0-50 points
    engagement_component: number;   // 0-30 points
    spam_component: number;         // 0-20 points
  };
  metrics: {
    helpful_rate: number;
    engagement_rate: number;
    spam_rate: number;
  };
}

// ============================================================================
// DASHBOARD STATE INTERFACES
// ============================================================================

export interface AdminSharingDashboardState {
  overview: SharingMetricsOverview | null;
  funnel: SharingFunnelMetrics | null;
  quality: SharingQualityMetrics | null;
  breakdown: SharingBreakdownMetrics | null;
  spam_alerts: SpamAlert[];
  ab_tests: ABTestComparison | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GetMetricsRequest {
  period?: 'day' | 'week' | 'month';
  from_date?: string;
  to_date?: string;
}

export interface GetSpamAlertsRequest {
  status?: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  severity?: 'low' | 'medium' | 'high';
  limit?: number;
  offset?: number;
}

export interface DismissSpamAlertRequest {
  reason?: string;
}

export interface TakeSpamActionRequest {
  action: 'warn_user' | 'suspend_user' | 'ban_user' | 'rate_limit';
  duration_hours?: number;
  notes?: string;
}

// ============================================================================
// STATISTICAL SIGNIFICANCE TYPES (Phase 10.1)
// ============================================================================

/**
 * Result of statistical significance calculation using two-proportion z-test
 */
export interface StatisticalSignificanceResult {
  p_value: number;
  z_score: number;
  significant: boolean;
  confidence_interval: {
    lower: number;
    upper: number;
    confidence_level: number;
  };
  lift_percentage: number;
  min_sample_reached: boolean;
}
