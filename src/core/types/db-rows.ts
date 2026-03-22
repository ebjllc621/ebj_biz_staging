/**
 * Database Row Type Definitions
 *
 * Generated from MariaDB 10.11 schema (docs/audits/phase/P3A/db/schema.sql)
 *
 * GOVERNANCE COMPLIANCE:
 * - Type-safe database row interfaces for all 50 tables
 * - Matches actual database schema column types
 * - Supports JSON columns with proper TypeScript types
 * - Enum columns use union types for type safety
 *
 * @authority PHASE_R3_BRAIN_PLAN.md - Database Row Type Definitions
 * @phase Phase R3.2 - Type Safety & Code Quality
 * @see docs/audits/phase/P3A/db/schema.sql
 */

// ============================================================================
// PRIORITY TABLES (Phase 4-6 Services)
// ============================================================================

/**
 * categories table row interface
 * Hierarchical category management system
 */
export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  cat_description: string | null;
  keywords: string | null; // JSON column: {primary: string[], secondary?: string[], excluded?: string[]}
  parent_id: number | null; // Foreign key to categories.id
  created_at: string; // ISO 8601 timestamp
  updated_at: string | null; // ISO 8601 timestamp
  level: number;
  path: string | null;
  icon: string | null;
  display_order: number;
  is_active: number; // TINYINT(1) - MariaDB boolean (0 or 1)
}

/**
 * listings table row interface
 * Core listing/business entity (58 columns)
 */
export interface ListingRow {
  id: number;
  user_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  year_established: number | null;
  employee_count: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  category_id: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  gallery_images: string | null; // JSON: string[]
  video_gallery: string | null; // JSON: string[] - tier-limited video URLs
  video_url: string | null;
  audio_url: string | null;
  business_hours: string | null; // JSON: BusinessHour[]
  social_media: string | null; // JSON: SocialMedia
  features: string | null; // JSON: string[]
  amenities: string | null; // JSON: string[]
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  add_ons: string | null; // JSON: string[]
  claimed: number; // TINYINT(1)
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  approved: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null; // TEXT - reason for listing rejection
  admin_reviewer_id: number | null; // INT - admin who reviewed
  admin_notes: string | null; // TEXT - internal admin notes
  admin_decision_at: string | null; // TIMESTAMP - ISO 8601
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  custom_fields: string | null; // JSON: Record<string, unknown>
  metadata: string | null; // JSON: Record<string, unknown>
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  annual_revenue: number | null;
  certifications: string | null; // JSON: string[]
  languages_spoken: string | null; // JSON: string[]
  payment_methods: string | null; // JSON: string[]
  view_count: number;
  click_count: number;
  favorite_count: number;
  import_source: string | null;
  import_date: string | null; // ISO 8601
  import_batch_id: string | null;
  mock: number; // TINYINT(1)
  keywords: string | null; // JSON: string[]
  slogan: string | null;
  active_categories: string | null; // JSON: number[] - ALL active category IDs
  bank_categories: string | null; // JSON: number[] - Bank/reserve category IDs
  section_layout: string | null; // JSON: ListingSectionLayout - Page layout configuration
  gallery_layout: 'grid' | 'masonry' | 'carousel' | 'justified' | null; // ENUM - Gallery display layout preference
  video_gallery_layout: 'grid' | 'masonry' | 'carousel' | 'inline' | 'showcase' | null; // ENUM - Video gallery layout
  combine_video_gallery: number | null; // TINYINT(1) - Combine video gallery with image gallery
  is_featured?: number | boolean; // TINYINT(1) - Admin-controlled featured flag (added in migration 051)
  date_created: string; // ISO 8601
  last_update: string; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * listing_attachments table row interface
 * Phase 5: Listing document attachments
 */
export interface ListingAttachmentRow {
  id: number;
  listing_id: number;
  filename: string;
  display_name: string;
  file_type: string | null;
  file_size: number;
  category: 'brochure' | 'menu' | 'catalog' | 'legal' | 'other';
  download_count: number;
  url: string;
  alt_text: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * subscription_plans table row interface
 * Tier management with versioning
 */
export interface SubscriptionPlanRow {
  id: number;
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  version: string;
  name: string;
  pricing_monthly: number | null;
  pricing_annual: number | null;
  features: string; // JSON: TierLimits
  effective_date: string; // DATE
  deprecated_date: string | null; // DATE
  created_at: string; // ISO 8601
}

/**
 * subscription_plans table row interface with admin fields
 * Extends SubscriptionPlanRow with status and description
 */
export interface AdminSubscriptionPlanRow extends SubscriptionPlanRow {
  status: 'active' | 'inactive' | 'archived';
  description: string | null;
  is_displayed: boolean;
}

/**
 * listing_subscriptions table row interface
 * Active subscriptions with grandfathering
 */
export interface ListingSubscriptionRow {
  id: number;
  listing_id: number;
  plan_id: number;
  plan_version: string;
  started_at: string; // ISO 8601
  renews_at: string | null; // ISO 8601
  is_grandfathered: number; // TINYINT(1)
  override_features: string | null; // JSON: Partial<TierLimits>
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  next_billing_date: string | null; // DATE
  failed_payment_count: number;
  pending_tier_change: string | null;
  billing_cycle: 'monthly' | 'annual';
  cancel_at_period_end: number; // TINYINT(1)
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * addon_suites table row interface
 * Add-on feature packages
 */
export interface AddonSuiteRow {
  id: number;
  suite_name: 'creator' | 'realtor' | 'restaurant' | 'seo_scribe';
  version: string;
  display_name: string;
  pricing_monthly: number | null;
  pricing_annual: number | null;
  features: string; // JSON: string[]
  effective_date: string; // DATE
  deprecated_date: string | null; // DATE
  created_at: string; // ISO 8601
}

/**
 * addon_suites table row interface with admin fields
 * Extends AddonSuiteRow with status and description
 */
export interface AdminAddonSuiteRow extends AddonSuiteRow {
  status: 'active' | 'inactive' | 'archived';
  description: string | null;
  is_displayed: boolean;
}

/**
 * listing_subscription_addons table row interface
 * Add-ons attached to subscriptions
 */
export interface ListingSubscriptionAddonRow {
  id: number;
  listing_subscription_id: number;
  addon_suite_id: number;
  started_at: string; // ISO 8601
  renews_at: string | null; // ISO 8601
  status: 'active' | 'cancelled' | 'expired';
  created_at: string; // ISO 8601
}

// === BILLING SYSTEM TYPES (Phase 1) ===

/**
 * stripe_events table row interface
 * Webhook idempotency tracking
 */
export interface StripeEventRow {
  id: number;
  stripe_event_id: string;
  event_type: string;
  processing_status: 'processing' | 'completed' | 'failed';
  error_message: string | null;
  raw_event: string | null; // JSON
  processed_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
}

/**
 * payment_methods table row interface
 * Stripe payment method tokens (no card data stored)
 */
export interface PaymentMethodRow {
  id: number;
  user_id: number;
  stripe_payment_method_id: string;
  type: 'card' | 'us_bank_account' | 'paypal' | 'link';
  brand: string | null;
  last_four: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: number; // TINYINT(1)
  billing_name: string | null;
  billing_zip: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * billing_transactions table row interface
 * Financial event log for all billing operations
 */
export interface BillingTransactionRow {
  id: number;
  user_id: number;
  listing_id: number | null;
  transaction_type: 'subscription_charge' | 'addon_charge' | 'campaign_bank_deposit' | 'campaign_bank_spend' | 'refund' | 'credit' | 'adjustment';
  amount: string; // DECIMAL(10,2) → string from mariadb
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  subscription_id: number | null;
  addon_id: number | null;
  stripe_charge_id: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  description: string;
  invoice_number: string | null;
  tax_amount: string; // DECIMAL(10,2) → string from mariadb
  tax_rate: string | null; // DECIMAL(5,2) → string from mariadb
  transaction_date: string; // ISO 8601
  due_date: string | null; // ISO 8601
  paid_date: string | null; // ISO 8601
  receipt_url: string | null;
  statement_month: string; // YYYY-MM
  metadata: string | null; // JSON
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// === REFUND SYSTEM TYPES (Phase 4) ===

export interface RefundRequestRow {
  id: number;
  entity_type: 'subscription' | 'event_ticket' | 'addon' | 'other';
  entity_id: number;
  user_id: number;
  listing_id: number | null;
  original_amount: string;
  requested_amount: string;
  approved_amount: string | null;
  processed_amount: string | null;
  currency: string;
  reason_category: 'customer_request' | 'service_issue' | 'billing_error' | 'duplicate_charge' | 'cancellation_mid_cycle' | 'other';
  reason_details: string | null;
  status: 'submitted' | 'under_review' | 'approved' | 'denied' | 'processing' | 'completed' | 'failed';
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  stripe_refund_id: string | null;
  stripe_payment_intent_id: string | null;
  processed_at: string | null;
  requires_escalation: number;
  escalated_to: number | null;
  escalated_at: string | null;
  escalation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefundAuditTrailRow {
  id: number;
  refund_request_id: number;
  admin_user_id: number | null;
  action_type: 'submitted' | 'status_changed' | 'review_assigned' | 'reviewed' | 'approved' | 'denied' | 'escalated' | 'processing' | 'completed' | 'failed';
  action_description: string | null;
  before_status: string | null;
  after_status: string | null;
  before_amount: string | null;
  after_amount: string | null;
  metadata: string | null;
  created_at: string;
}

// === STATEMENT TYPES (Phase 5) ===

export interface MonthlyStatementRow {
  id: number;
  user_id: number;
  statement_month: string;
  subscription_charges: string;
  addon_charges: string;
  campaign_bank_deposits: string;
  campaign_bank_spend: string;
  refunds: string;
  credits: string;
  adjustments: string;
  total_charges: string;
  opening_balance: string;
  closing_balance: string;
  amount_paid: string;
  amount_due: string;
  status: 'draft' | 'sent' | 'paid';
  pdf_url: string | null;
  pdf_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

// === CAMPAIGN BANK TYPES (Phase 6) ===

export interface CampaignBankRow {
  id: number;
  user_id: number;
  listing_id: number;
  balance: string;
  total_deposited: string;
  total_spent: string;
  last_deposit_at: string | null;
  last_spend_at: string | null;
  status: 'active' | 'frozen' | 'depleted';
  created_at: string;
  updated_at: string;
}

/**
 * offers table row interface
 * Promotional offers/deals
 */
export interface OfferRow {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  offer_type: 'discount' | 'coupon' | 'product' | 'service';
  original_price: number | null; // DECIMAL(10,2)
  sale_price: number | null; // DECIMAL(10,2)
  discount_percentage: number | null;
  image: string | null;
  thumbnail: string | null;
  start_date: string; // DATETIME - ISO 8601
  end_date: string; // DATETIME - ISO 8601
  quantity_total: number | null;
  quantity_remaining: number | null;
  max_per_user: number;
  redemption_code: string | null;
  redemption_instructions: string | null; // TEXT
  redemption_count: number;
  status: 'draft' | 'active' | 'paused' | 'expired' | 'sold_out';
  is_featured: number; // TINYINT(1)
  is_mock: number; // TINYINT(1)
  view_count: number;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * offer_redemptions table row interface
 * Offer redemption tracking
 */
export interface OfferRedemptionRow {
  id: number;
  offer_id: number;
  user_id: number;
  redeemed_at: string; // TIMESTAMP - ISO 8601
  redemption_code: string | null;
}

/**
 * events table row interface
 * Event management with ticketing
 *
 * @fixed 2026-01-04 - SYSREP schema validation fix
 * @schema docs/audits/phase/P3A/db/schema.sql (CREATE TABLE events, lines 401-442)
 * @migration scripts/migrations/events-schema-fix/ (adds latitude, longitude, registration_required)
 *
 * IMPORTANT: This interface matches the ACTUAL database schema.
 * Key differences from previous version:
 * - location_type enum replaces is_virtual (supports 'physical', 'virtual', 'hybrid')
 * - total_capacity replaces capacity
 * - is_ticketed replaces registration_required (migration adds registration_required as separate)
 * - ticket_price replaces price
 * - banner_image replaces image_url
 * - virtual_link replaces virtual_url
 * - zip replaces zip_code
 * - status enum includes 'completed'
 */
export interface EventRow {
  id: number;
  listing_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  event_type: string | null; // varchar(50), not enum in schema
  start_date: string; // datetime - ISO 8601
  end_date: string; // datetime - ISO 8601
  timezone: string | null; // varchar(50) DEFAULT 'America/New_York'
  location_type: 'physical' | 'virtual' | 'hybrid'; // enum - NOT is_virtual
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null; // varchar(20) - NOT zip_code
  virtual_link: string | null; // varchar(500) - NOT virtual_url
  banner_image: string | null; // varchar(500) - NOT image_url
  thumbnail: string | null;
  is_ticketed: number; // TINYINT(1) - NOT registration_required
  ticket_price: number | null; // decimal(10,2) - NOT price
  total_capacity: number | null; // int - NOT capacity
  remaining_capacity: number | null;
  rsvp_count: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed' | 'pending_moderation'; // includes 'completed' and 'pending_moderation'
  is_featured: number; // TINYINT(1)
  is_mock: number; // TINYINT(1)
  view_count: number;
  created_at: string; // timestamp - ISO 8601
  updated_at: string; // timestamp - ISO 8601
  // Migration columns (added via scripts/migrations/events-schema-fix/)
  latitude?: number | null; // Added via migration, optional until migration runs
  longitude?: number | null; // Added via migration, optional until migration runs
  registration_required?: number | null; // Added via migration, optional until migration runs
  // Phase 1A Gap-Fill: Feature Map Section 3.1 fields
  external_ticket_url?: string | null;   // VARCHAR(500) - external ticketing URL
  age_restrictions?: string | null;       // VARCHAR(255) - e.g., "21+", "Family-friendly"
  parking_notes?: string | null;          // TEXT - parking/access info
  weather_contingency?: string | null;    // TEXT - rain date/indoor backup
  waitlist_enabled?: number | null;       // TINYINT(1) - 0/1
  check_in_enabled?: number | null;       // TINYINT(1) - 0/1
  // Phase 3A: Community event fields
  is_community_event?: number | null;     // TINYINT(1) - 0/1
  submitted_by_user_id?: number | null;   // INT - user who submitted the community event
  moderation_notes?: string | null;       // TEXT - moderation notes
  // Phase 3B: Recurring event fields
  is_recurring?: number | null;           // TINYINT(1) - 0/1
  recurrence_type?: string | null;        // ENUM('none','daily','weekly','monthly','yearly')
  recurrence_days?: string | null;        // JSON - array of day numbers
  recurrence_end_date?: string | null;    // DATE - ISO 8601
  parent_event_id?: number | null;        // INT - parent event ID for instances
  series_index?: number | null;           // INT - position in series
}

/**
 * event_rsvps table row interface
 * Event RSVP tracking
 */
export interface EventRsvpRow {
  id: number;
  event_id: number;
  user_id: number;
  ticket_id: number | null;
  rsvp_status: 'pending' | 'confirmed' | 'cancelled';
  rsvp_date: string; // ISO 8601
  attended: number; // TINYINT(1)
  check_in_code?: string | null; // Phase 4: QR check-in code (UUID)
}

/**
 * event_check_ins table row interface
 * Phase 4: QR-based check-in tracking
 */
export interface EventCheckInRow {
  id: number;
  event_id: number;
  rsvp_id: number;
  user_id: number;
  check_in_code: string;
  check_in_method: 'qr_scan' | 'manual' | 'self';
  checked_in_by: number | null;
  checked_in_at: string; // ISO 8601
  notes: string | null;
}

/**
 * event_tickets table row interface
 * Event ticket tier management
 */
export interface EventTicketRow {
  id: number;
  event_id: number;
  ticket_name: string;
  ticket_price: string; // DECIMAL(10,2)
  quantity_total: number;
  quantity_sold: number;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * event_ticket_purchases table row interface
 * Phase 5A: Stripe payment transaction tracking
 */
export interface EventTicketPurchaseRow {
  id: number;
  event_id: number;
  ticket_id: number;
  user_id: number;
  quantity: number;
  unit_price: string;  // DECIMAL(10,2) → string from mariadb
  total_amount: string; // DECIMAL(10,2) → string from mariadb
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  purchased_at: string | null;
  refunded_at: string | null;
  refund_amount: string | null; // DECIMAL(10,2) → string from mariadb
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * event_co_hosts table row interface
 * Co-host management for organized events
 */
export interface EventCoHostRow {
  id: number;
  event_id: number;
  co_host_listing_id: number;
  co_host_role: string;
  display_order: number;
  invitation_message: string | null;
  status: string;
  invited_by_user_id: number | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * event_exhibitors table row interface
 * Exhibitor management for organized events
 */
export interface EventExhibitorRow {
  id: number;
  event_id: number;
  exhibitor_listing_id: number;
  booth_number: string | null;
  booth_size: string;
  exhibitor_description: string | null;
  exhibitor_logo: string | null;
  display_order: number;
  invitation_message: string | null;
  click_count: number;
  impression_count: number;
  status: string;
  invited_by_user_id: number | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * event_service_requests table row interface
 * Service procurement bridge table linking events to Quote System
 * Phase 6C: Event Service Procurement
 */
export interface EventServiceRequestRow {
  id: number;
  event_id: number;
  requester_listing_id: number;
  quote_id: number | null;
  service_category: string;
  title: string;
  description: string | null;
  required_by_date: string | null;
  budget_min: string | null;  // DECIMAL(10,2) returns as string from mariadb
  budget_max: string | null;  // DECIMAL(10,2) returns as string from mariadb
  priority: string;
  status: string;
  fulfilled_by_listing_id: number | null;
  fulfilled_quote_response_id: number | null;
  notes: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * reviews table row interface
 * Review and rating system
 */
export interface ReviewRow {
  id: number;
  listing_id: number;
  user_id: number;
  rating: number;
  title: string | null;
  review_text: string | null;
  images: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderation_reason: string | null;
  moderated_by: number | null;
  moderated_at: string | null;
  is_verified_purchase: number;
  helpful_count: number;
  not_helpful_count: number;
  owner_response: string | null;
  owner_response_date: string | null;
  is_mock: number;
  created_at: string;
  updated_at: string;
  is_featured: number;
}

/**
 * review_helpfulness table row interface
 * Review helpfulness tracking
 */
export interface ReviewHelpfulnessRow {
  id: number;
  review_id: number;
  user_id: number;
  is_helpful: number; // TINYINT(1) - MariaDB boolean (0 or 1)
  created_at: string; // ISO 8601
}

/**
 * users table row interface
 * User account management (33 columns)
 */
export interface UserRow {
  id: number;
  uuid: string;
  email: string;
  username: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_email_verified: number; // TINYINT(1)
  email_verified_at: string | null; // ISO 8601
  role: 'general' | 'listing_member' | 'admin';
  is_active: number; // TINYINT(1)
  is_suspended: number; // TINYINT(1)
  suspended_until: string | null; // ISO 8601
  permissions: string | null; // JSON: string[]
  preferences: string | null; // JSON: Record<string, unknown>
  last_login_at: string | null; // ISO 8601
  last_login_ip: string | null;
  failed_login_attempts: number;
  locked_until: string | null; // ISO 8601
  password_reset_token: string | null;
  password_reset_expires: string | null; // ISO 8601
  mfa_enabled: number; // TINYINT(1)
  mfa_secret: string | null;
  mfa_backup_codes: string | null; // JSON: string[]
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at: string | null; // ISO 8601
  status: 'active' | 'suspended' | 'banned' | 'deleted' | 'pending'; // User account status
}

// ============================================================================
// PHASE 6 SERVICES (Performance, SEO, Feature Flags)
// ============================================================================

/**
 * performance_metrics table row interface
 * APM metrics tracking
 */
export interface PerformanceMetricRow {
  id: number;
  metric_type: 'api_response' | 'db_query' | 'memory' | 'cpu';
  metric_name: string;
  value: number;
  status_code: number | null;
  user_id: number | null;
  metadata: string | null; // JSON: Record<string, unknown>
  environment: 'development' | 'staging' | 'production';
  created_at: string; // ISO 8601
}

/**
 * error_logs table row interface
 * Centralized error tracking
 */
export interface ErrorLogRow {
  id: number;
  error_type: string;
  error_message: string; // TEXT
  stack_trace: string | null; // TEXT
  request_url: string | null;
  request_method: string | null;
  user_id: number | null;
  user_agent: string | null; // TEXT
  ip_address: string | null;
  environment: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  resolved_at: string | null; // TIMESTAMP
  resolved_by: number | null;
  metadata: string | null; // JSON: Record<string, unknown>
  created_at: string; // TIMESTAMP
}

/**
 * alerts table row interface
 * Performance alert system
 */
export interface AlertRow {
  id: number;
  alert_type: string; // 'response_time', 'error_rate', etc.
  alert_name: string;
  threshold_value: number | null;
  current_value: number | null;
  severity: 'info' | 'warning' | 'critical';
  message: string; // TEXT
  action_taken: string | null; // TEXT
  acknowledged: number; // TINYINT(1)
  acknowledged_by: number | null;
  acknowledged_at: string | null; // ISO 8601
  resolved: number; // TINYINT(1)
  resolved_at: string | null; // ISO 8601
  metadata: string | null; // JSON: Record<string, unknown>
  environment: string;
  created_at: string; // ISO 8601
}

/**
 * seo_metadata table row interface
 * SEO meta tags management
 */
export interface SEOMetadataRow {
  id: number;
  entity_type: string;
  entity_id: number;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_type: string | null;
  twitter_card: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  schema_type: string | null;
  schema_data: string | null; // JSON: Record<string, unknown>
  created_at: string; // TIMESTAMP
  updated_at: string; // TIMESTAMP
}

/**
 * feature_flags table row interface
 * Feature toggle system with A/B testing
 */
export interface FeatureFlagRow {
  id: number;
  flag_key: string;
  name: string;
  description: string | null; // TEXT
  is_enabled: number; // TINYINT(1) - MariaDB boolean
  rollout_percentage: number; // 0-100
  target_tiers: string | null; // JSON: string[]
  target_user_ids: string | null; // JSON: number[]
  environment: string;
  created_at: string; // TIMESTAMP
  updated_at: string; // TIMESTAMP
}

// ============================================================================
// ADDITIONAL TABLES (Media, Campaigns, Discounts, Menus, etc.)
// ============================================================================

/**
 * media_files table row interface
 * Universal Media Manager
 *
 * Actual DB columns: id, storage_type, path, url, cloudinary_public_id,
 * file_type, file_size, width, height, metadata, is_mock, created_at,
 * updated_at, alt_text, title_text, seo_filename
 */
export interface MediaFileRow {
  id: number;
  storage_type: 'local' | 'cloudinary';
  path: string;                        // relative path or Cloudinary path
  url: string;                         // public URL (Cloudinary URL or local)
  cloudinary_public_id: string | null;
  file_type: string;                   // MIME type (e.g. 'image/jpeg')
  file_size: number;
  width: number | null;
  height: number | null;
  metadata: string | null;             // JSON metadata
  is_mock: number;                     // TINYINT(1)
  created_at: string;                  // ISO 8601
  updated_at: string;                  // ISO 8601
  alt_text: string | null;             // SEO alt text
  title_text: string | null;           // SEO title/tooltip
  seo_filename: string | null;         // SEO-optimized filename
}

/**
 * campaigns table row interface
 * Marketing campaign management
 */
export interface CampaignRow {
  id: number;
  user_id: number;
  campaign_type: 'sponsored_listing' | 'featured_event' | 'featured_offer' | 'banner_ad' | 'email_blast';
  title: string;
  description: string | null; // TEXT
  target_audience: string | null; // JSON: Record<string, unknown>
  budget: number;
  daily_budget: number | null;
  start_date: string; // ISO 8601
  end_date: string; // ISO 8601
  creatives: string | null; // JSON: Record<string, unknown>
  status: 'draft' | 'pending' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
  admin_notes: string | null; // TEXT
  rejection_reason: string | null; // TEXT
  impressions: number;
  clicks: number;
  conversions: number;
  total_spent: number;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  approved_by: number | null;
}

/**
 * discount_codes table row interface
 * Discount/coupon code management
 */
export interface DiscountCodeRow {
  id: number;
  listing_id: number | null;
  code: string;
  description: string | null; // TEXT
  discount_type: 'percentage' | 'fixed' | 'bogo';
  discount_value: number;
  min_purchase: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  start_date: string; // ISO 8601
  end_date: string; // ISO 8601
  is_active: number; // TINYINT(1)
  created_by: number;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * site_menus table row interface
 * Navigation menu management
 */
export interface SiteMenuRow {
  id: number;
  menu_key: string;
  label: string;
  url: string | null;
  target: '_self' | '_blank' | null;
  icon: string | null;
  parent_id: number | null;
  display_order: number;
  is_active: number; // TINYINT(1)
  visible_to_roles: string | null; // JSON: string[]
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * content_articles table row interface
 * Content articles
 */
export interface ContentArticleRow {
  id: number;
  listing_id: number | null;
  category_id: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  tags: string | null; // JSON: string[]
  reading_time: number;
  view_count: number;
  bookmark_count: number;
  status: string; // 'draft' | 'pending' | 'published' | 'archived'
  is_featured: number; // TINYINT(1)
  is_sponsored: number; // TINYINT(1)
  published_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * content_videos table row interface
 * Content videos
 */
export interface ContentVideoRow {
  id: number;
  listing_id: number | null;
  category_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  video_url: string;
  video_type: string; // 'youtube' | 'vimeo' | 'upload' | 'embed'
  duration: number | null;
  tags: string | null; // JSON: string[]
  view_count: number;
  bookmark_count: number;
  status: string; // 'draft' | 'pending' | 'published' | 'archived'
  is_featured: number; // TINYINT(1)
  is_sponsored: number; // TINYINT(1)
  published_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * content_podcasts table row interface
 * Content podcasts
 */
export interface ContentPodcastRow {
  id: number;
  listing_id: number | null;
  category_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  audio_url: string;
  episode_number: number | null;
  season_number: number | null;
  duration: number | null;
  tags: string | null; // JSON: string[]
  view_count: number;
  bookmark_count: number;
  status: string; // 'draft' | 'pending' | 'published' | 'archived'
  is_featured: number; // TINYINT(1)
  is_sponsored: number; // TINYINT(1)
  published_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================================
// NEWSLETTER & GUIDE CONTENT TABLES (Tier 2 Phase 1)
// ============================================================================

/**
 * content_newsletters table row interface
 */
export interface ContentNewsletterRow {
  id: number;
  listing_id: number;
  title: string;
  slug: string | null;
  issue_number: number | null;
  excerpt: string | null;
  web_content: string | null;
  email_html: string | null;
  featured_image: string | null;
  category_id: number | null;
  tags: string | null; // JSON: string[]
  reading_time: number | null;
  status: string; // 'draft' | 'scheduled' | 'published' | 'archived'
  is_featured: number; // TINYINT(1)
  subscriber_count_at_send: number;
  open_count: number;
  click_count: number;
  view_count: number;
  bookmark_count: number;
  share_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * newsletter_subscribers table row interface
 */
export interface NewsletterSubscriberRow {
  id: number;
  listing_id: number;
  user_id: number | null;
  email: string;
  name: string | null;
  status: string; // 'pending' | 'active' | 'unsubscribed' | 'bounced'
  confirmation_token: string | null;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
}

/**
 * content_guides table row interface
 */
export interface ContentGuideRow {
  id: number;
  listing_id: number;
  title: string;
  slug: string | null;
  subtitle: string | null;
  excerpt: string | null;
  overview: string | null;
  prerequisites: string | null;
  featured_image: string | null;
  category_id: number | null;
  tags: string | null; // JSON: string[]
  difficulty_level: string; // 'beginner' | 'intermediate' | 'advanced'
  estimated_time: number | null;
  word_count: number;
  status: string; // 'draft' | 'published' | 'scheduled' | 'archived'
  is_featured: number; // TINYINT(1)
  view_count: number;
  bookmark_count: number;
  share_count: number;
  completion_count: number;
  version: string | null;
  last_reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * content_guide_sections table row interface
 */
export interface ContentGuideSectionRow {
  id: number;
  guide_id: number;
  section_number: number;
  title: string;
  slug: string | null;
  content: string | null;
  estimated_time: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

/**
 * content_guide_progress table row interface
 */
export interface ContentGuideProgressRow {
  id: number;
  guide_id: number;
  user_id: number;
  section_id: number | null;
  completed_sections: string | null; // JSON: number[]
  is_completed: number; // TINYINT(1)
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string | null;
}

// ============================================================================
// JOBS SYSTEM TABLES (Phase 1)
// ============================================================================

/**
 * job_postings table row interface
 * Job posting management
 * @phase Jobs Phase 1
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_1_BRAIN_PLAN.md
 */
export interface JobPostingRow {
  id: number;
  business_id: number | null;
  creator_user_id: number;
  title: string;
  slug: string;
  employment_type: 'full_time' | 'part_time' | 'seasonal' | 'temporary' | 'contract' | 'internship' | 'gig';
  description: string; // TEXT
  compensation_type: 'hourly' | 'salary' | 'commission' | 'tips_hourly' | 'stipend' | 'unpaid' | 'competitive';
  compensation_min: number | null; // DECIMAL(10,2)
  compensation_max: number | null; // DECIMAL(10,2)
  compensation_currency: string;
  work_location_type: 'onsite' | 'remote' | 'hybrid';
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null; // DECIMAL(10,8)
  longitude: number | null; // DECIMAL(11,8)
  department: string | null;
  reports_to: string | null;
  number_of_openings: number;
  schedule_info: string | null; // TEXT
  start_date: string | null; // DATE
  application_deadline: string | null; // DATE
  application_method: 'external' | 'native';
  external_application_url: string | null;
  benefits: string | null; // JSON: string[]
  required_qualifications: string | null; // JSON: string[]
  preferred_qualifications: string | null; // JSON: string[]
  custom_questions: string | null; // JSON: custom question objects (Phase 2)
  is_featured: number; // TINYINT(1)
  featured_until: string | null; // TIMESTAMP - Phase 2
  template_id: number | null; // Phase 2
  is_community_gig: number; // TINYINT(1) - Phase 2
  agency_posting_for_business_id: number | null; // Phase 3
  moderation_notes: string | null; // TEXT - Phase 2
  status: 'draft' | 'pending_moderation' | 'active' | 'paused' | 'filled' | 'expired' | 'archived';
  view_count: number;
  application_count: number;
  // Phase 3 fields
  related_event_ids: string | null; // JSON: number[]
  related_offer_ids: string | null; // JSON: number[]
  is_recurring: number; // TINYINT(1)
  recurring_schedule: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | null;
  next_repost_date: string | null; // DATE
  schema_generated_at: string | null; // TIMESTAMP
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

/**
 * job_media table row interface
 * Job media attachments
 */
export interface JobMediaRow {
  id: number;
  job_id: number;
  media_type: 'image' | 'video';
  file_url: string;
  sort_order: number;
  alt_text: string | null;
  embed_url: string | null;
  platform: string | null;
  source: 'upload' | 'embed' | null;
  created_at: string; // TIMESTAMP - ISO 8601
}

/**
 * event_media table row interface
 * Event media attachments (images + video embeds)
 */
export interface EventMediaRow {
  id: number;
  event_id: number;
  media_type: 'image' | 'video';
  file_url: string;
  sort_order: number;
  alt_text: string | null;
  embed_url: string | null;
  platform: string | null;
  source: 'upload' | 'embed' | null;
  created_at: string; // TIMESTAMP - ISO 8601
}

/**
 * offer_media table row interface
 * Offer media attachments (images + video embeds)
 */
export interface OfferMediaRow {
  id: number;
  offer_id: number;
  media_type: 'image' | 'video';
  file_url: string;
  sort_order: number;
  alt_text: string | null;
  embed_url: string | null;
  platform: string | null;
  source: 'upload' | 'embed' | null;
  thumbnail_url: string | null;
  created_at: string; // TIMESTAMP - ISO 8601
}

/**
 * job_categories table row interface
 * Job-category junction table
 */
export interface JobCategoryRow {
  id: number;
  job_id: number;
  category_id: number;
  created_at: string; // TIMESTAMP - ISO 8601
}

/**
 * job_analytics table row interface
 * Job analytics event tracking
 */
export interface JobAnalyticsRow {
  id: number;
  job_id: number;
  event_type: 'impression' | 'page_view' | 'save' | 'share' | 'external_click' | 'apply_click';
  user_id: number | null;
  source: 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage' | null;
  referrer: string | null;
  created_at: string; // TIMESTAMP - ISO 8601
}

/**
 * user_saved_jobs table row interface
 * User job bookmarks
 */
export interface UserSavedJobRow {
  id: number;
  user_id: number;
  job_id: number;
  created_at: string; // TIMESTAMP - ISO 8601
}

/**
 * job_shares table row interface
 * Job sharing tracking
 */
export interface JobShareRow {
  id: number;
  job_id: number;
  user_id: number | null;
  share_type: 'business_owner' | 'job_seeker' | 'referral';
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'nextdoor' | 'whatsapp' | 'sms' | 'email' | 'copy_link';
  share_url: string;
  short_url: string | null;
  clicks: number;
  created_at: string; // TIMESTAMP - ISO 8601
}

/**
 * job_applications table row interface
 * Native job applications submitted through the platform
 * @phase Jobs Phase 2
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 */
export interface JobApplicationRow {
  id: number;
  job_id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  resume_file_url: string | null;
  cover_message: string | null; // TEXT
  availability: 'immediately' | 'within_2_weeks' | 'within_1_month' | 'flexible' | null;
  custom_answers: string | null; // JSON: Record<string, string>
  application_source: 'direct' | 'social' | 'notification' | 'search' | 'listing';
  status: 'new' | 'reviewed' | 'contacted' | 'interviewed' | 'hired' | 'declined';
  employer_notes: string | null; // TEXT
  referred_by_user_id: number | null;
  contacted_at: string | null; // TIMESTAMP - ISO 8601
  interviewed_at: string | null; // TIMESTAMP - ISO 8601
  status_changed_at: string | null; // TIMESTAMP - ISO 8601
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

/**
 * job_alert_subscriptions table row interface
 * User job alert subscriptions for matching notifications
 * @phase Jobs Phase 2
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 */
export interface JobAlertSubscriptionRow {
  id: number;
  user_id: number;
  alert_type: 'business' | 'category' | 'employment_type' | 'keyword' | 'all_jobs';
  target_id: number | null;
  keyword_filter: string | null;
  employment_type_filter: string | null; // JSON: EmploymentType[]
  location_filter: string | null; // JSON: {city, state, radius_miles}
  compensation_min: number | null; // DECIMAL(10,2)
  compensation_max: number | null; // DECIMAL(10,2)
  notification_frequency: 'realtime' | 'daily' | 'weekly';
  is_active: number; // TINYINT(1)
  last_sent_at: string | null; // TIMESTAMP - ISO 8601
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

/**
 * job_posting_templates table row interface
 * Reusable job posting templates for businesses
 * @phase Jobs Phase 2
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 */
export interface JobPostingTemplateRow {
  id: number;
  template_name: string;
  template_category: 'restaurant' | 'retail' | 'office' | 'trades' | 'healthcare' | 'agriculture' | 'hospitality' | 'custom';
  employment_type: 'full_time' | 'part_time' | 'seasonal' | 'temporary' | 'contract' | 'internship' | 'gig' | null;
  description_template: string | null; // TEXT
  required_qualifications_template: string | null; // JSON: string[]
  preferred_qualifications_template: string | null; // JSON: string[]
  benefits_defaults: string | null; // JSON: string[]
  compensation_type: 'hourly' | 'salary' | 'commission' | 'tips_hourly' | 'stipend' | 'unpaid' | 'competitive' | null;
  is_system_template: number; // TINYINT(1)
  business_id: number | null;
  created_by_user_id: number | null;
  usage_count: number;
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

/**
 * job_hire_reports table row interface
 * Hire reports for analytics funnel completion
 * @phase Jobs Phase 3
 */
export interface JobHireReportRow {
  id: number;
  job_id: number;
  application_id: number | null;
  hire_source: 'native_application' | 'external' | 'direct' | 'referral';
  hired_user_id: number | null;
  hire_date: string; // DATE - ISO 8601
  time_to_fill_days: number | null;
  salary_or_rate: number | null; // DECIMAL(10,2)
  notes: string | null; // TEXT
  reported_by_user_id: number;
  created_at: string; // TIMESTAMP - ISO 8601
}

// ============================================================================
// JOBS PHASE 4 TYPES - Platform Growth & Future Features
// ============================================================================

/**
 * job_seeker_profiles table row interface
 * Job seeker profile extension with skills and resume
 * @phase Jobs Phase 4
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 */
export interface JobSeekerProfileRow {
  id: number;
  user_id: number;
  headline: string | null;
  bio: string | null; // TEXT
  skills: string | null; // JSON: string[]
  experience_level: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  years_experience: number | null;
  resume_file_url: string | null;
  resume_updated_at: string | null; // TIMESTAMP - ISO 8601
  employment_preferences: string | null; // JSON: {types: [], locations: [], remote: boolean, min_salary: number}
  availability_date: string | null; // DATE - ISO 8601
  is_actively_looking: number; // TINYINT(1)
  is_discoverable: number; // TINYINT(1)
  preferred_job_categories: string | null; // JSON: number[]
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

/**
 * employer_branding table row interface
 * Work With Us employer branding section
 * @phase Jobs Phase 4
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 */
export interface EmployerBrandingRow {
  id: number;
  listing_id: number;
  headline: string | null;
  tagline: string | null; // TEXT
  company_culture: string | null; // TEXT
  benefits_highlight: string | null; // TEXT
  team_size: string | null;
  growth_stage: 'startup' | 'growing' | 'established' | 'enterprise' | null;
  hiring_urgency: 'immediate' | 'ongoing' | 'seasonal' | 'future';
  featured_media_url: string | null;
  cta_text: string;
  cta_url: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

/**
 * hiring_campaigns table row interface
 * Seasonal hiring campaign coordination
 * @phase Jobs Phase 4
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 */
export interface HiringCampaignRow {
  id: number;
  listing_id: number;
  campaign_name: string;
  campaign_type: 'seasonal' | 'event' | 'blitz' | 'evergreen';
  hiring_goal: number | null;
  target_roles: string | null; // JSON: string[]
  target_categories: string | null; // JSON: number[]
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'holiday' | null;
  start_date: string; // DATE - ISO 8601
  end_date: string; // DATE - ISO 8601
  budget: string | null; // DECIMAL(10,2) as string from MariaDB
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'completed' | 'archived';
  approved_by_user_id: number | null;
  approved_at: string | null; // TIMESTAMP - ISO 8601
  performance_metrics: string | null; // JSON: {impressions, applications, hires, cost_per_hire}
  notes: string | null; // TEXT
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

/**
 * job_market_content table row interface
 * Job market insights and trends content
 * @phase Jobs Phase 4
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 */
export interface JobMarketContentRow {
  id: number;
  content_type: 'trends' | 'salary_guide' | 'skills_report' | 'industry_outlook' | 'hiring_tips';
  title: string;
  slug: string;
  summary: string | null; // TEXT
  content: string; // LONGTEXT
  data_json: string | null; // JSON: embedded charts, stats, comparisons
  cover_image_url: string | null;
  regions: string | null; // JSON: string[]
  job_categories: string | null; // JSON: number[]
  published_date: string | null; // DATE - ISO 8601
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  author_user_id: number | null;
  view_count: number;
  is_featured: number; // TINYINT(1)
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

/**
 * hiring_events table row interface
 * Job fair and hiring event calendar integration
 * @phase Jobs Phase 4
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 */
export interface HiringEventRow {
  id: number;
  event_id: number;
  event_type: 'job_fair' | 'career_expo' | 'networking' | 'hiring_sprint' | 'webinar' | 'info_session';
  participating_listings: string | null; // JSON: number[]
  expected_openings: number | null;
  featured_roles: string | null; // JSON: string[]
  registration_required: number; // TINYINT(1)
  external_registration_url: string | null;
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

/**
 * candidate_discovery table row interface
 * Premium candidate discovery for employers
 * @phase Jobs Phase 4
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 */
export interface CandidateDiscoveryRow {
  id: number;
  job_seeker_user_id: number;
  listing_id: number;
  match_score: string | null; // DECIMAL(5,2) as string from MariaDB
  matched_skills: string | null; // JSON: string[]
  discovered_at: string; // TIMESTAMP - ISO 8601
  viewed_at: string | null; // TIMESTAMP - ISO 8601
  contacted_at: string | null; // TIMESTAMP - ISO 8601
  contact_method: 'message' | 'email' | 'phone' | null;
  status: 'discovered' | 'interested' | 'contacted' | 'applied' | 'hired' | 'declined';
  employer_notes: string | null; // TEXT
  created_at: string; // TIMESTAMP - ISO 8601
  updated_at: string; // TIMESTAMP - ISO 8601
}

// ============================================================================
// TYPE EXPORTS (for convenience)
// ============================================================================

export type AllRowTypes =
  | CategoryRow
  | ListingRow
  | ListingAttachmentRow
  | SubscriptionPlanRow
  | ListingSubscriptionRow
  | AddonSuiteRow
  | ListingSubscriptionAddonRow
  | OfferRow
  | OfferRedemptionRow
  | EventRow
  | EventRsvpRow
  | EventCheckInRow
  | EventTicketRow
  | EventTicketPurchaseRow
  | EventCoHostRow
  | EventExhibitorRow
  | EventServiceRequestRow
  | ReviewRow
  | ReviewHelpfulnessRow
  | UserRow
  | PerformanceMetricRow
  | ErrorLogRow
  | AlertRow
  | SEOMetadataRow
  | FeatureFlagRow
  | MediaFileRow
  | CampaignRow
  | DiscountCodeRow
  | SiteMenuRow
  | ContentArticleRow
  | ContentVideoRow
  | ContentPodcastRow
  | JobPostingRow
  | JobMediaRow
  | JobCategoryRow
  | JobAnalyticsRow
  | UserSavedJobRow
  | JobShareRow
  | JobApplicationRow
  | JobAlertSubscriptionRow
  | JobPostingTemplateRow
  | JobHireReportRow
  | JobSeekerProfileRow
  | EmployerBrandingRow
  | HiringCampaignRow
  | JobMarketContentRow
  | HiringEventRow
  | CandidateDiscoveryRow
  | ContentNewsletterRow
  | NewsletterSubscriberRow
  | ContentGuideRow
  | ContentGuideSectionRow
  | ContentGuideProgressRow
  | SocialMediaConnectionRow
  | SocialMediaPostRow;

// ============================================================================
// Claim Listing Row Types
// ============================================================================

export interface ListingClaimRow {
  id: number;
  listing_id: number;
  claimant_user_id: number;
  claim_type: 'owner' | 'manager' | 'authorized_representative';
  status: 'initiated' | 'verification_pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  verification_score: string | null; // DECIMAL(3,2) from MariaDB
  admin_reviewer_id: number | null;
  admin_notes: string | null;
  admin_decision_at: string | null;
  rejection_reason: string | null;
  claimant_description: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ListingClaimVerificationRow {
  id: number;
  claim_id: number;
  method: 'email' | 'phone' | 'domain' | 'document' | 'manual';
  status: 'pending' | 'sent' | 'completed' | 'failed' | 'expired';
  verification_code: string | null;
  code_expires_at: string | null;
  attempts: number;
  max_attempts: number;
  score: string | null; // DECIMAL(3,2) from MariaDB
  details: string | null; // JSON
  completed_at: string | null;
  created_at: string;
}

// ============================================================================
// TIER 3: CREATOR PROFILE TABLES
// ============================================================================

export interface ContentAffiliateMarketerRow {
  id: number;
  user_id: number;
  listing_id: number | null;
  display_name: string;
  slug: string | null;
  profile_image: string | null;
  cover_image: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  niches: string | null;
  specializations: string | null;
  affiliate_networks: string | null;
  commission_range_min: number | null;
  commission_range_max: number | null;
  flat_fee_min: number | null;
  flat_fee_max: number | null;
  audience_size: number;
  audience_demographics: string | null;
  platforms: string | null;
  website_url: string | null;
  social_links: string | null;
  is_verified: number;
  is_featured: number;
  status: string;
  campaign_count: number;
  businesses_helped: number;
  avg_conversion_rate: number | null;
  view_count: number;
  contact_count: number;
  rating_average: number;
  rating_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AffiliateMarketerPortfolioRow {
  id: number;
  marketer_id: number;
  brand_name: string | null;
  brand_logo: string | null;
  campaign_title: string | null;
  description: string | null;
  results_summary: string | null;
  conversion_rate: number | null;
  content_url: string | null;
  campaign_date: string | null;
  sort_order: number;
  created_at: string;
}

export interface AffiliateMarketerReviewRow {
  id: number;
  marketer_id: number;
  reviewer_user_id: number;
  reviewer_listing_id: number | null;
  rating: number;
  review_text: string | null;
  campaign_type: string | null;
  status: string;
  created_at: string;
}

export interface ContentInternetPersonalityRow {
  id: number;
  user_id: number;
  listing_id: number | null;
  display_name: string;
  slug: string | null;
  profile_image: string | null;
  cover_image: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  creating_since: number | null;
  content_categories: string | null;
  platforms: string | null;
  total_reach: number;
  avg_engagement_rate: number | null;
  collaboration_types: string | null;
  rate_card: string | null;
  media_kit_url: string | null;
  management_contact: string | null;
  website_url: string | null;
  social_links: string | null;
  is_verified: number;
  is_featured: number;
  status: string;
  collaboration_count: number;
  view_count: number;
  contact_count: number;
  rating_average: number;
  rating_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface InternetPersonalityCollaborationRow {
  id: number;
  personality_id: number;
  brand_name: string | null;
  brand_logo: string | null;
  listing_id: number | null;
  collaboration_type: string | null;
  description: string | null;
  content_url: string | null;
  collaboration_date: string | null;
  sort_order: number;
  created_at: string;
}

export interface InternetPersonalityReviewRow {
  id: number;
  personality_id: number;
  reviewer_user_id: number;
  reviewer_listing_id: number | null;
  rating: number;
  review_text: string | null;
  collaboration_type: string | null;
  status: string;
  created_at: string;
}

// ============================================================================
// TIER 3: PODCASTER TABLES
// ============================================================================

export interface ContentPodcasterRow {
  id: number;
  user_id: number;
  listing_id: number | null;
  display_name: string;
  slug: string | null;
  profile_image: string | null;
  cover_image: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  podcast_name: string | null;
  hosting_platform: string | null;
  rss_feed_url: string | null;
  total_episodes: number;
  avg_episode_length: number;
  publishing_frequency: string | null;
  genres: string | null;
  guest_booking_info: string | null;
  monetization_methods: string | null;
  listener_count: number;
  download_count: number;
  platforms: string | null;
  website_url: string | null;
  social_links: string | null;
  is_verified: number;
  is_featured: number;
  status: string;
  view_count: number;
  contact_count: number;
  rating_average: number;
  rating_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PodcasterEpisodeRow {
  id: number;
  podcaster_id: number;
  episode_title: string | null;
  episode_number: number | null;
  season_number: number | null;
  description: string | null;
  audio_url: string | null;
  duration: number | null;
  guest_names: string | null;
  published_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface PodcasterReviewRow {
  id: number;
  podcaster_id: number;
  reviewer_user_id: number;
  reviewer_listing_id: number | null;
  rating: number;
  review_text: string | null;
  episode_reference: string | null;
  status: string;
  created_at: string;
}

// ============================================================================
// TIER 3: CONTACT PROPOSALS TABLE
// ============================================================================

/**
 * content_contact_proposals table row interface
 * Contact/proposal requests sent to creator profiles
 * @phase Tier 3 Creator Profiles - Phase 5
 * @authority Tier3_Phases/PHASE_5_CONTACT_PROPOSAL_SYSTEM.md
 */
export interface ContentContactProposalRow {
  id: number;
  profile_type: 'affiliate_marketer' | 'internet_personality' | 'podcaster';
  profile_id: number;
  profile_owner_user_id: number;
  sender_user_id: number;
  sender_name: string;
  sender_email: string;
  proposal_type: 'hire' | 'collaborate' | 'inquiry';
  subject: string;
  message: string;
  budget_range: string | null;
  timeline: string | null;
  company_name: string | null;
  status: 'pending' | 'read' | 'replied' | 'archived' | 'declined';
  read_at: Date | null;
  replied_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

// MariaDB TINYINT(1) Helper
export type MariaDBBoolean = 0 | 1;

// Helper to convert MariaDB boolean to TypeScript boolean
export function toBoolean(value: MariaDBBoolean | number): boolean {
  return value === 1;
}

// Platform Sync (Phase 9B)
export interface PlatformOAuthTokenRow {
  id: number;
  user_id: number;
  profile_type: string;
  profile_id: number;
  platform: string;
  platform_user_id: string | null;
  platform_username: string | null;
  access_token_encrypted: Buffer;
  refresh_token_encrypted: Buffer | null;
  token_iv: Buffer;
  token_expires_at: Date | null;
  scope: string | null;
  is_active: number; // TINYINT
  linked_at: Date;
  last_synced_at: Date | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface PlatformMetricsHistoryRow {
  id: number;
  profile_id: number;
  profile_type: string;
  platform: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  avg_engagement_rate: number | null;
  avg_views: number;
  subscriber_count: number;
  total_views: number | bigint;
  audience_demographics: string | Record<string, unknown> | null; // JSON
  raw_metrics: string | Record<string, unknown> | null; // JSON
  recorded_at: Date;
  sync_run_id: string | null;
}

// ============================================================================
// CONTENT FOLLOW TABLES (Tier 4 - Content Subscription Service)
// ============================================================================

// ============================================================================
// SOCIAL MEDIA MANAGER TABLES (Tier 5A Phase 1)
// ============================================================================

/**
 * social_media_connections table row interface
 * OAuth account links for social media posting
 * @phase Tier 5A Social Media Manager - Phase 1
 */
export interface SocialMediaConnectionRow {
  id: number;
  listing_id: number;
  user_id: number;
  platform: string;
  platform_user_id: string | null;
  platform_username: string | null;
  platform_page_name: string | null;
  access_token_encrypted: Buffer | null;   // AES-256-GCM encrypted
  refresh_token_encrypted: Buffer | null;  // AES-256-GCM encrypted
  token_iv: Buffer | null;                 // 12-byte IV for decryption
  token_expires_at: string | null;
  scopes: string | null;  // JSON column — use safeJsonParse()
  is_active: number;
  connected_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * social_media_posts table row interface
 * Cross-posted content tracking
 * @phase Tier 5A Social Media Manager - Phase 1
 */
export interface SocialMediaPostRow {
  id: number;
  connection_id: number;
  listing_id: number;
  content_type: string | null;
  content_id: number;
  platform: string;
  post_text: string | null;
  post_image_url: string | null;
  post_link: string | null;
  platform_post_id: string | null;
  platform_post_url: string | null;
  status: string;
  scheduled_at: string | null;
  posted_at: string | null;
  error_message: string | null;
  impressions: number;
  engagements: number;
  clicks: number;
  last_metrics_sync: string | null;
  created_at: string;
}

export type { ContentFollowRow } from './content-follow';
