/**
 * Offers Feature Type Definitions
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0
 * @phase Phase 2 - Client Component Shell
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * @see docs/pages/layouts/offers/phases/PHASE_2_BRAIN_PLAN.md
 */

/**
 * Offer data with geographic coordinates for map display
 * Coordinates inherited from parent listing
 */
export interface OfferWithCoordinates {
  id: number;
  title: string;
  slug: string;
  listing_id: number;
  listing_name: string;
  listing_slug: string;
  description?: string;
  offer_type: 'discount' | 'coupon' | 'product' | 'service';
  original_price?: number;
  sale_price?: number;
  discount_percentage?: number;
  image?: string;
  thumbnail?: string;
  start_date: string;
  end_date: string;
  quantity_remaining?: number;
  is_featured: boolean;
  latitude: number | null;
  longitude: number | null;
  listing_tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  listing_claimed: boolean;
}

/**
 * Sort options for offers
 * Default order: featured, closest by location, category
 */
export type OfferSortOption =
  | 'priority'
  | 'price_low'
  | 'price_high'
  | 'ending_soon'
  | 'discount'
  | 'distance';

/**
 * Offer filters state
 */
export interface OffersFilters {
  q: string;
  sort: OfferSortOption;
  page: number;
  offerType?: 'discount' | 'coupon' | 'product' | 'service';
  category?: string;
  isFlashOnly?: boolean;
}

/**
 * Display mode for offers view
 */
export type OfferDisplayMode = 'grid' | 'list';

/**
 * Map marker data for offer rendering
 */
export interface OfferMapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  discount_percentage?: number;
}

/**
 * Sort dropdown option
 */
export interface OfferSortDropdownOption {
  value: OfferSortOption;
  label: string;
}

// ============================================================================
// Phase 1: Claim & Detail Page Types
// ============================================================================

/**
 * Claim result after successfully claiming an offer
 */
export interface ClaimResult {
  success: boolean;
  claimId: number;
  promoCode: string;
  expiresAt: Date;
  redemptionInstructions: string | null;
}

/**
 * User claim record with joined offer data
 */
export interface Claim {
  id: number;
  offer_id: number;
  user_id: number;
  promo_code: string;
  claimed_at: Date;
  redeemed_at: Date | null;
  status: ClaimStatus;
  redemption_method: 'qr_scan' | 'manual_entry' | 'in_app' | 'self_reported' | null;
  // Joined offer data
  offer_title: string;
  offer_image: string | null;
  offer_type: string;
  business_name: string;
  end_date: Date;
}

/**
 * Claim status enum
 */
export type ClaimStatus = 'claimed' | 'redeemed' | 'expired';

/**
 * Claim eligibility check result
 */
export interface ClaimEligibility {
  canClaim: boolean;
  reason: string | null;
  remainingClaims: number;
  userClaimCount: number;
}

/**
 * Offer with listing information for detail page
 */
export interface OfferWithListing {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  offer_type: string;
  original_price: number | null;
  sale_price: number | null;
  discount_percentage: number | null;
  image: string | null;
  thumbnail: string | null;
  start_date: Date;
  end_date: Date;
  quantity_total: number | null;
  quantity_remaining: number | null;
  max_per_user: number;
  redemption_code: string | null;
  redemption_instructions: string | null;
  redemption_count: number;
  promo_code_mode: 'universal' | 'unique';
  universal_code: string | null;
  terms_conditions: string | null;
  min_purchase_amount: number | null;
  applicable_products: unknown | null;
  status: 'draft' | 'active' | 'paused' | 'expired' | 'sold_out';
  is_featured: boolean;
  is_mock: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  // Listing fields
  listing_name: string;
  listing_logo: string | null;
  listing_slug: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Analytics event types
 */
export type AnalyticsEventType = 'impression' | 'page_view' | 'engagement' | 'share' | 'claim' | 'redemption';

/**
 * Analytics source types
 */
export type AnalyticsSource = 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage' | 'category';

// ============================================================================
// Phase 2: Engagement & Notification Types
// ============================================================================

/**
 * Follow type for offer notifications
 */
export type FollowType = 'business' | 'category' | 'all_offers';

/**
 * Notification frequency preference
 */
export type NotificationFrequency = 'realtime' | 'daily' | 'weekly';

/**
 * Offer follow record
 */
export interface OfferFollow {
  id: number;
  user_id: number;
  follow_type: FollowType;
  target_id: number | null;
  notification_frequency: NotificationFrequency;
  created_at: Date;
  // Joined fields (optional)
  target_name?: string; // Listing name or category name
}

/**
 * Share type - business owner vs consumer
 */
export type ShareType = 'business_owner' | 'consumer';

/**
 * Supported share platforms
 */
export type SharePlatform =
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'nextdoor'
  | 'whatsapp'
  | 'sms'
  | 'email'
  | 'copy_link';

/**
 * Offer share record
 */
export interface OfferShare {
  id: number;
  offer_id: number;
  user_id: number;
  share_type: ShareType;
  platform: SharePlatform;
  share_url: string;
  short_url: string | null;
  clicks: number;
  created_at: Date;
}

/**
 * Share click metadata for tracking
 */
export interface ShareClickMetadata {
  referrer_url?: string;
  user_agent?: string;
  ip_hash?: string;
  resulted_in_signup?: boolean;
  resulted_in_claim?: boolean;
}

/**
 * Share analytics for an offer
 */
export interface ShareAnalytics {
  offer_id: number;
  total_shares: number;
  total_clicks: number;
  click_through_rate: number;
  shares_by_platform: Record<SharePlatform, number>;
  clicks_by_platform: Record<SharePlatform, number>;
  conversions: {
    signups: number;
    claims: number;
  };
  top_platform: SharePlatform | null;
}

/**
 * Business-level share performance
 */
export interface BusinessSharePerformance {
  listing_id: number;
  total_shares: number;
  total_clicks: number;
  avg_click_through_rate: number;
  best_performing_offer: {
    id: number;
    title: string;
    clicks: number;
  } | null;
  platform_breakdown: Record<SharePlatform, { shares: number; clicks: number }>;
}

/**
 * Offer notification event types
 */
export type OfferNotificationEventType =
  | 'offer_published'      // New offer from followed business/category
  | 'offer_claimed'        // User claimed an offer (to user)
  | 'offer_claim_received' // Business received a claim (to business)
  | 'offer_expiring_soon'  // Claimed offer expiring (to user)
  | 'offer_digest'         // Periodic offer summary (to user)
  | 'offer_performance';   // Performance update (to business)

// ============================================================================
// Phase 3: Redemption & Analytics Types
// ============================================================================

/**
 * QR code data for display
 */
export interface QRCodeData {
  claimId: number;
  promoCode: string;
  verificationUrl: string;
  expiresAt: Date;
  offerTitle: string;
  businessName: string;
}

/**
 * Redemption method options
 */
export type RedemptionMethod = 'qr_scan' | 'manual_entry' | 'in_app' | 'self_reported';

/**
 * Redemption verification result
 */
export interface RedemptionVerification {
  valid: boolean;
  claim: Claim | null;
  error: string | null;
  offer: {
    id: number;
    title: string;
    expiresAt: Date;
  } | null;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
}

/**
 * Redemption completion result
 */
export interface RedemptionResult {
  success: boolean;
  claimId: number;
  redemptionMethod: RedemptionMethod;
  redeemedAt: Date;
  message: string;
}

/**
 * Analytics funnel data
 */
export interface AnalyticsFunnel {
  offerId: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
  stages: {
    impressions: number;
    pageViews: number;
    engagements: number;
    shares: number;
    claims: number;
    redemptions: number;
  };
  conversionRates: {
    impressionToView: number;
    viewToClaim: number;
    claimToRedemption: number;
    overallConversion: number;
  };
  dropOffRates: {
    viewDropOff: number;
    claimDropOff: number;
    redemptionDropOff: number;
  };
}

/**
 * Traffic source breakdown
 */
export interface TrafficSourceBreakdown {
  offerId: number;
  sources: Array<{
    source: AnalyticsSource;
    impressions: number;
    pageViews: number;
    claims: number;
    redemptions: number;
    conversionRate: number;
  }>;
  topSource: AnalyticsSource | null;
  socialBreakdown: {
    platform: SharePlatform;
    clicks: number;
    claims: number;
    conversionRate: number;
  }[];
}

/**
 * CSV export filters
 */
export interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  status?: ClaimStatus;
  includeEmail?: boolean;
}

/**
 * CSV export result
 */
export interface CSVExportResult {
  csv: string;
  filename: string;
  rowCount: number;
  generatedAt: Date;
}

/**
 * Offer performance comparison
 */
export interface OfferComparison {
  offerId: number;
  title: string;
  status: OfferStatus;
  metrics: {
    impressions: number;
    pageViews: number;
    claims: number;
    redemptions: number;
    viewConversionRate: number;
    claimConversionRate: number;
    redemptionRate: number;
  };
  rank: number;
  percentile: number;
}

/**
 * Offer status enum
 */
export type OfferStatus = 'draft' | 'active' | 'paused' | 'expired' | 'sold_out';

/**
 * Export eligibility result
 */
export interface ExportEligibility {
  canExport: boolean;
  emailAccess: boolean;
  monthlyLimit: number;
  remainingExports: number;
  tier: string;
}

// ============================================================================
// Phase 3 Technical Debt Types (TD-P3-003+)
// ============================================================================

/**
 * Time-series granularity options
 * @phase TD-P3-003
 */
export type TimeSeriesGranularity = 'daily' | 'weekly' | 'monthly';

/**
 * Time-series data point
 * @phase TD-P3-003
 */
export interface TimeSeriesDataPoint {
  date: string; // ISO date string (YYYY-MM-DD or YYYY-MM)
  impressions: number;
  pageViews: number;
  claims: number;
  redemptions: number;
}

/**
 * Time-series analytics response
 * @phase TD-P3-003
 */
export interface TimeSeriesData {
  offerId: number;
  granularity: TimeSeriesGranularity;
  period: {
    startDate: Date;
    endDate: Date;
  };
  dataPoints: TimeSeriesDataPoint[];
  totals: {
    impressions: number;
    pageViews: number;
    claims: number;
    redemptions: number;
  };
}

/**
 * Geographic distribution data
 * @phase TD-P3-006
 */
export interface GeographicDistribution {
  offerId: number;
  locations: Array<{
    city: string | null;
    state: string | null;
    country: string;
    claimCount: number;
    percentage: number;
  }>;
  topLocations: Array<{
    label: string;
    count: number;
  }>;
}

/**
 * Audience demographics (anonymized)
 * @phase TD-P3-007
 */
export interface AudienceDemographics {
  offerId: number;
  totalClaimers: number;
  newVsReturning: {
    newUsers: number;
    returningUsers: number;
    newUserPercentage: number;
  };
  claimFrequency: {
    firstTimers: number;
    repeatClaimers: number;
    averageClaimsPerUser: number;
  };
  engagementLevel: {
    highEngagement: number; // Redeemed
    mediumEngagement: number; // Claimed but not redeemed
    lowEngagement: number; // Viewed only
  };
}

/**
 * Dispute status
 * @phase TD-P3-008
 */
export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'closed';

/**
 * Offer dispute record
 * @phase TD-P3-008
 */
export interface OfferDispute {
  id: number;
  claim_id: number;
  user_id: number;
  reason: string;
  details: string | null;
  status: DisputeStatus;
  resolution: string | null;
  created_at: Date;
  resolved_at: Date | null;
}

// ============================================================================
// Phase 4: Advanced Features Types
// ============================================================================

// 4.1 Template Types
export interface OfferTemplate {
  id: number;
  listing_id: number;
  name: string;
  template_data: OfferTemplateData;
  recurrence_type: RecurrenceType;
  recurrence_days: number[] | null;
  recurrence_end_date: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OfferTemplateData {
  title: string;
  description: string | null;
  offer_type: string;
  original_price: number | null;
  sale_price: number | null;
  discount_percentage: number | null;
  terms_conditions: string | null;
  redemption_instructions: string | null;
  max_per_user: number;
  quantity_total: number | null;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceConfig {
  type: RecurrenceType;
  days?: number[]; // For weekly: [0-6], for monthly: [1-31]
  endDate?: Date;
}

// 4.2 Flash Offer Types
export interface CreateFlashOfferInput {
  title: string;
  description?: string;
  offer_type: 'discount' | 'coupon' | 'product' | 'service';
  original_price?: number;
  sale_price?: number;
  discount_percentage?: number;
  start_date: Date | string;
  end_date: Date | string;
  flash_start_time: string; // HH:MM
  flash_end_time: string; // HH:MM
  max_per_user?: number;
  quantity_total?: number;
  redemption_instructions?: string;
}

export interface FlashOfferFilters {
  urgencyLevel?: 'normal' | 'high' | 'critical';
  category?: string;
  location?: { lat: number; lng: number; radius: number };
}

export type FlashUrgencyLevel = 'normal' | 'high' | 'critical';

// 4.3 Geo-Fence Types
export interface GeoTrigger {
  id: number;
  offer_id: number;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  notification_message: string | null;
  created_at: Date;
}

export interface GeoTriggerConfig {
  latitude: number;
  longitude: number;
  radius_meters?: number; // default 500
  notification_message?: string;
}

// 4.4 Social Proof Types
export interface SocialProofData {
  offer_id: number;
  claims_today: number;
  claims_total: number;
  connection_claims?: number; // Users you follow who claimed
  trending: boolean; // Significant increase in claims
}

// 4.5 Loyalty Types
export interface UserLoyalty {
  id: number;
  user_id: number;
  listing_id: number;
  total_claims: number;
  total_redemptions: number;
  total_value: number;
  first_claim_at: Date | null;
  last_claim_at: Date | null;
  loyalty_tier: LoyaltyTier;
}

export type LoyaltyTier = 'new' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyalCustomer {
  user_id: number;
  display_name: string; // Anonymized unless opted in
  total_claims: number;
  loyalty_tier: LoyaltyTier;
  last_claim_at: Date;
}

// 4.6 Bundle Types
export interface OfferBundle {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  total_value: number | null;
  bundle_price: number | null;
  start_date: Date;
  end_date: Date;
  max_claims: number | null;
  claims_count: number;
  status: 'draft' | 'active' | 'expired' | 'sold_out';
  created_by: number;
  offers?: Offer[]; // Joined offer data
  created_at: Date;
  updated_at: Date;
}

export interface CreateBundleInput {
  name: string;
  slug?: string;
  description?: string;
  bundle_price: number;
  start_date: Date | string;
  end_date: Date | string;
  max_claims?: number;
  offer_ids: number[];
}

export interface BundleClaimResult {
  bundle_id: number;
  claims: ClaimResult[];
  total_savings: number;
}

// 4.7 Review Types
export interface OfferReview {
  id: number;
  offer_id: number;
  claim_id: number;
  user_id: number;
  rating: 1 | 2 | 3 | 4 | 5;
  was_as_described: boolean | null;
  was_easy_to_redeem: boolean | null;
  comment: string | null;
  images: string[] | null;
  created_at: Date;
  // Joined user data
  reviewer_name?: string;
  // Phase 4B: Helpful voting + owner response
  helpful_count?: number;
  not_helpful_count?: number;
  owner_response?: string | null;
  owner_response_date?: string | null;
}

export interface ReviewInput {
  rating: 1 | 2 | 3 | 4 | 5;
  was_as_described?: boolean;
  was_easy_to_redeem?: boolean;
  comment?: string;
  images?: string[];
}

// 4.8 A/B Test Types
export interface ABTest {
  id: number;
  offer_id: number;
  variant_type: 'title' | 'image' | 'price';
  variant_a_value: string;
  variant_b_value: string;
  variant_a_impressions: number;
  variant_a_claims: number;
  variant_b_impressions: number;
  variant_b_claims: number;
  winning_variant: 'a' | 'b' | 'none';
  status: 'running' | 'completed' | 'stopped';
  started_at: Date;
  ended_at: Date | null;
}

export interface ABTestConfig {
  variant_type: 'title' | 'image' | 'price';
  variant_a_value: string;
  variant_b_value: string;
}

export interface ABTestResults {
  test_id: number;
  variant_a: {
    impressions: number;
    claims: number;
    conversion_rate: number;
  };
  variant_b: {
    impressions: number;
    claims: number;
    conversion_rate: number;
  };
  statistical_significance: number; // 0-100%
  recommended_winner: 'a' | 'b' | 'inconclusive';
}

// 4.9 Offline Support Types
export interface OfflineCacheData {
  claim_id: number;
  promo_code: string;
  offer_title: string;
  business_name: string;
  expires_at: Date;
  cached_at: Date;
  signature: string; // HMAC for validation
}

// 4.10 B2B Types
export interface B2BOfferFilters extends OffersFilters {
  is_b2b?: boolean;
  target_business_type?: string;
}

// Phase 4.5 Additional Types

export interface FlashOfferConfig {
  listing_id: number;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  timezone: string;
  is_active: boolean;
  auto_create: boolean;
  template_id?: number;
}

export interface BusinessLoyaltyStatus {
  listing_id: number;
  listing_name: string;
  total_claims: number;
  total_redemptions: number;
  loyalty_tier: LoyaltyTier;
  points_to_next_tier: number;
  exclusive_offers_count: number;
  last_claim_at: Date | null;
}

export type BundleType = 'themed' | 'seasonal' | 'loyalty' | 'custom';

export interface ReviewSummary {
  offer_id: number;
  average_rating: number;
  total_reviews: number;
  ratings_breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  as_described_percentage: number;
  easy_to_redeem_percentage: number;
}

export interface RecurrencePattern {
  type: RecurrenceType;
  interval: number; // e.g., every 2 weeks
  days_of_week?: number[]; // 0-6 for weekly
  days_of_month?: number[]; // 1-31 for monthly
  end_date?: Date;
  occurrences?: number; // Max occurrences
}

// Alias for backward compatibility
export type GeoFenceTrigger = GeoTrigger;

// 4.11 Offer type (needed for interface completeness)
export interface Offer {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  offer_type: string;
  original_price: number | null;
  sale_price: number | null;
  discount_percentage: number | null;
  image: string | null;
  thumbnail: string | null;
  start_date: Date;
  end_date: Date;
  quantity_total: number | null;
  quantity_remaining: number | null;
  max_per_user: number;
  status: 'draft' | 'active' | 'paused' | 'expired' | 'sold_out';
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}
