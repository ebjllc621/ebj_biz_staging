/**
 * Events Feature Type Definitions
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 2 - Client Component Shell
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 */

import type { EventCardData } from '@/features/homepage/types';

/**
 * Extended event data with geographic coordinates for map display
 * @updated 2026-01-05 - Added listing_tier and listing_claimed for tier-based map markers
 */
export interface EventWithCoordinates extends EventCardData {
  /** Latitude coordinate (null if not set) */
  latitude: number | null;
  /** Longitude coordinate (null if not set) */
  longitude: number | null;
  /** Listing subscription tier - used for map marker styling */
  listing_tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  /** Whether the listing is claimed - unclaimed listings use default marker */
  listing_claimed: boolean;
  /** Phase 3B: Whether the event is a recurring parent */
  is_recurring?: boolean;
  /** Phase 3B: Parent event ID for child instances */
  parent_event_id?: number | null;
}

/**
 * Sort options for events
 * Default order: featured > distance > soonest date
 */
export type EventSortOption =
  | 'priority'    // Default: featured > distance > date
  | 'date'        // Soonest first
  | 'name'        // Alphabetical
  | 'distance';   // Closest first (requires geolocation)

/**
 * Events filter state
 */
export interface EventsFilters {
  /** Search query string */
  q: string;
  /** Sort option */
  sort: EventSortOption;
  /** Current page number */
  page: number;
  /** Event type filter */
  eventType?: string;
  /** Location type filter */
  locationType?: 'physical' | 'virtual' | 'hybrid';
}

/**
 * Display mode for events view
 */
export type EventDisplayMode = 'grid' | 'list';

/**
 * Map marker data for event rendering
 */
export interface EventMapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  eventType?: string;
}

/**
 * Sort dropdown option
 */
export interface EventSortDropdownOption {
  value: EventSortOption;
  label: string;
}

/**
 * Extended event data with parent listing information for detail page display
 * Returned by EventService.getBySlugWithListing()
 *
 * @phase Phase 1 - Event Detail Page Core
 */
export interface EventDetailData {
  // All Event fields (from EventService.Event)
  id: number;
  listing_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  event_type: string | null;
  start_date: Date;
  end_date: Date;
  timezone: string;
  location_type: 'physical' | 'virtual' | 'hybrid';
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  virtual_link: string | null;
  banner_image: string | null;
  thumbnail: string | null;
  is_ticketed: boolean;
  ticket_price: number | null;
  total_capacity: number | null;
  remaining_capacity: number | null;
  rsvp_count: number;
  status: string;
  is_featured: boolean;
  is_mock: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  // Phase 1A Gap-Fill: Feature Map Section 3.1 fields
  external_ticket_url: string | null;
  age_restrictions: string | null;
  parking_notes: string | null;
  weather_contingency: string | null;
  waitlist_enabled: boolean;
  check_in_enabled: boolean;
  // Phase 3A: Community event fields
  is_community_event: boolean;
  submitted_by_user_id: number | null;
  moderation_notes: string | null;
  // Phase 3B: Recurring event fields
  is_recurring: boolean;
  recurrence_type: string | null;
  recurrence_days: number[] | null;
  recurrence_end_date: Date | null;
  parent_event_id: number | null;
  series_index: number | null;
  // Joined listing fields
  listing_name: string | null;
  listing_slug: string | null;
  listing_logo: string | null;
  listing_cover_image: string | null;
  listing_tier: string | null;
  listing_claimed: boolean;
  listing_rating: number | null;
  listing_review_count: number | null;
  listing_phone: string | null;
  listing_email: string | null;
  listing_website: string | null;
  listing_city: string | null;
  listing_state: string | null;
  // Computed fields
  latitude: number | null;
  longitude: number | null;
}

/**
 * RSVP status for UI state management
 * @phase Phase 2 - RSVP & Engagement UI
 */
export type EventRSVPStatus = 'none' | 'confirmed' | 'cancelled';

/**
 * Ticket tier display data (from GET /api/events/[id]/tickets)
 * @phase Phase 2 - RSVP & Engagement UI
 */
export interface TicketTierDisplay {
  id: number;
  event_id: number;
  ticket_name: string;
  ticket_price: number;
  quantity_total: number;
  quantity_sold: number;
  /** Computed: quantity_total - quantity_sold */
  remaining: number;
  /** Computed: remaining <= 0 */
  soldOut: boolean;
}

// ============================================================
// Phase 3: Analytics & Social Sharing Types
// ============================================================

/** Analytics metric types tracked in event_analytics table */
export type EventAnalyticsMetricType = 'impression' | 'page_view' | 'save' | 'share' | 'external_click';

/** Traffic source for analytics tracking */
export type EventAnalyticsSource = 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage';

/** Share type (who shared) */
export type EventShareType = 'creator' | 'consumer' | 'exhibitor';

/** Share platform identifiers */
export type EventSharePlatform = 'facebook' | 'instagram' | 'x' | 'linkedin' | 'nextdoor' | 'whatsapp' | 'sms' | 'email' | 'copy';

/** Follow subscription type */
export type EventFollowType = 'business' | 'category' | 'all_events';

/** Notification frequency preference */
export type EventNotificationFrequency = 'realtime' | 'daily' | 'weekly';

/** Analytics funnel data (for dashboard/admin views) */
export interface EventAnalyticsFunnel {
  event_id: number;
  impressions: number;
  page_views: number;
  saves: number;
  shares: number;
  external_clicks: number;
  rsvps: number;
  conversion_rates: {
    view_rate: number;
    save_rate: number;
    rsvp_rate: number;
  };
}

/** Share analytics grouped by platform */
export interface EventSharePlatformData {
  platform: EventSharePlatform;
  shares: number;
  clicks: number;
  clickRate: number;
}

/** Input for recording a share */
export interface RecordEventShareInput {
  event_id: number;
  user_id: number | undefined;
  share_type: EventShareType;
  platform: EventSharePlatform;
  share_url: string;
}

/** Follow state for UI */
export interface EventFollowState {
  isFollowing: boolean;
  followId: number | null;
  frequency: EventNotificationFrequency;
}

// ============================================================
// Phase 4: Event Reviews & Post-Event Lifecycle Types
// ============================================================

/** Event review data from event_reviews table */
export interface EventReview {
  id: number;
  event_id: number;
  user_id: number;
  rating: number;
  review_text: string | null;
  is_testimonial_approved: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  created_at: string;
  updated_at: string;
  // Joined user fields (from query)
  user_name?: string;
  user_avatar?: string | null;
  // Phase 4B: Helpful voting + owner response
  helpful_count?: number;
  not_helpful_count?: number;
  owner_response?: string | null;
  owner_response_date?: string | null;
}

/** Rating distribution for event reviews */
export interface EventReviewDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  total: number;
  average: number;
}

/** Cross-sell offer data (subset of offer fields for display) */
export interface EventCrossSellOffer {
  id: number;
  title: string;
  slug: string;
  discount_type: string | null;
  discount_value: number | null;
  end_date: string | null;
  thumbnail: string | null;
}

// ============================================================
// Phase 5: Event Sponsors System Types
// ============================================================

/** Sponsor tier levels with visual hierarchy */
export type EventSponsorTier = 'title' | 'gold' | 'silver' | 'bronze' | 'community';

/** Sponsor status lifecycle */
export type EventSponsorStatus = 'pending' | 'active' | 'expired' | 'cancelled';

/** Event sponsor data from event_sponsors table with joined listing info */
export interface EventSponsor {
  id: number;
  event_id: number;
  sponsor_listing_id: number;
  sponsor_tier: EventSponsorTier;
  display_order: number;
  sponsor_logo: string | null;
  sponsor_message: string | null;
  click_count: number;
  impression_count: number;
  status: EventSponsorStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined listing fields
  listing_name?: string;
  listing_slug?: string;
  listing_logo?: string;
  listing_city?: string;
  listing_state?: string;
  listing_tier?: string;
}

/** Input for creating a sponsor relationship */
export interface CreateEventSponsorInput {
  event_id: number;
  sponsor_listing_id: number;
  sponsor_tier: EventSponsorTier;
  display_order?: number;
  sponsor_logo?: string;
  sponsor_message?: string;
  start_date?: string;
  end_date?: string;
}

/** Input for updating a sponsor */
export interface UpdateEventSponsorInput {
  sponsor_tier?: EventSponsorTier;
  display_order?: number;
  sponsor_logo?: string;
  sponsor_message?: string;
  status?: EventSponsorStatus;
  start_date?: string;
  end_date?: string;
}

/** Sponsor analytics data */
export interface EventSponsorAnalytics {
  sponsor_id: number;
  listing_name: string;
  sponsor_tier: EventSponsorTier;
  click_count: number;
  impression_count: number;
  click_through_rate: number;
}

/** Admin sponsor list item (extended with event info) */
export interface AdminEventSponsor extends EventSponsor {
  event_title?: string;
  event_slug?: string;
  event_start_date?: string;
  event_status?: string;
}

// ============================================================
// Phase 6A: Dashboard My Events Types
// ============================================================

/** User event item for dashboard display (upcoming, saved, past, created tabs) */
export interface UserEventItem {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  location_type: 'physical' | 'virtual' | 'hybrid';
  venue_name: string | null;
  city: string | null;
  state: string | null;
  banner_image: string | null;
  thumbnail: string | null;
  is_ticketed: boolean;
  ticket_price: number | null;
  total_capacity: number | null;
  rsvp_count: number;
  status: string;
  is_featured: boolean;
  listing_name: string | null;
  listing_slug: string | null;
  listing_logo: string | null;
  rsvp_status?: string | null;
  rsvp_date?: string | null;
  is_saved?: boolean;
  is_creator?: boolean;
  has_reviewed?: number;
  page_views?: number;
  shares?: number;
  // Phase 3B: Recurring event fields
  is_recurring?: boolean;
  recurrence_type?: string | null;
  parent_event_id?: number | null;
  series_index?: number | null;
}

/** Active tab for My Events dashboard section */
export type MyEventsTab = 'upcoming' | 'saved' | 'past' | 'created';

/** Quick stats for a single event (creator view) */
export interface EventQuickStats {
  event_id: number;
  title: string;
  rsvp_count: number;
  total_capacity: number | null;
  page_views: number;
  shares: number;
  status: string;
  start_date: string;
}

// ============================================================
// Phase 6B: Dashboard Calendar & .ics Export Types
// ============================================================

/** Calendar view mode toggle */
export type CalendarViewMode = 'day' | 'week' | 'month';

/** Calendar event status for color coding */
export type CalendarEventStatus = 'going' | 'saved' | 'created' | 'past';

/** Calendar event item (lighter than UserEventItem, optimized for grid display) */
export interface CalendarEvent {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  end_date: string;
  timezone: string;
  location_type: 'physical' | 'virtual' | 'hybrid';
  venue_name: string | null;
  city: string | null;
  state: string | null;
  banner_image: string | null;
  thumbnail: string | null;
  is_ticketed: boolean;
  ticket_price: number | null;
  total_capacity: number | null;
  rsvp_count: number;
  status: string;
  listing_name: string | null;
  listing_slug: string | null;
  /** Calendar-specific: how the user relates to this event */
  calendar_status: CalendarEventStatus;
}

/** Calendar day cell data for grid rendering */
export interface CalendarDay {
  date: Date;
  /** ISO date string (YYYY-MM-DD) for keying */
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

// ============================================================
// Phase 8C: Waitlist Types
// ============================================================

/** Waitlist entry status */
export type WaitlistStatus = 'waiting' | 'offered' | 'claimed' | 'expired' | 'cancelled';

/** Waitlist entry from event_waitlist table */
export interface EventWaitlistEntry {
  id: number;
  event_id: number;
  user_id: number;
  position: number;
  status: WaitlistStatus;
  offered_at: string | null;
  claim_deadline: string | null;
  created_at: string;
  user_name?: string;
  user_avatar?: string | null;
}

// ============================================================
// Phase 3 Gap-Fill: RSVP & Attendee Management Types
// ============================================================

/** Enriched attendee detail for owner/admin views */
export interface AttendeeDetail {
  id: number;
  event_id: number;
  user_id: number;
  ticket_id: number | null;
  rsvp_status: 'pending' | 'confirmed' | 'cancelled';
  rsvp_date: Date | string;
  attended: boolean;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
}

/** DB row type for attendee JOIN query */
export interface AttendeeDetailRow {
  id: number;
  event_id: number;
  user_id: number;
  ticket_id: number | null;
  rsvp_status: string;
  rsvp_date: string;
  attended: number | boolean;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
}

// ============================================================
// Phase 4: Check-In System Types
// ============================================================

export type CheckInMethod = 'qr_scan' | 'manual' | 'self';

export interface EventCheckIn {
  id: number;
  eventId: number;
  rsvpId: number;
  userId: number;
  checkInCode: string;
  checkInMethod: CheckInMethod;
  checkedInBy: number | null;
  checkedInAt: Date;
  notes: string | null;
}

export interface CheckInStats {
  totalRsvps: number;
  totalCheckedIn: number;
  checkInRate: number;
  byMethod: {
    qr_scan: number;
    manual: number;
    self: number;
  };
}

// ============================================================
// Phase 5A: Native Ticketing — Payment Types
// ============================================================

/** Payment status for ticket purchases */
export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';

/** Ticket purchase record (mapped from EventTicketPurchaseRow) */
export interface TicketPurchase {
  id: number;
  event_id: number;
  ticket_id: number;
  user_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_status: PurchaseStatus;
  purchased_at: Date | null;
  refunded_at: Date | null;
  refund_amount: number | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================
// Phase 5B: Native Ticketing — Revenue & Reporting Types
// ============================================================

/** Revenue aggregation for an event */
export interface EventRevenue {
  total_purchases: number;
  total_revenue: number;
  total_tickets_sold: number;
  total_refunds: number;
  total_refund_amount: number;
  by_tier: Array<{
    ticket_name: string;
    ticket_price: number;
    purchases: number;
    revenue: number;
    tickets_sold: number;
    quantity_total: number;
    quantity_sold: number;
  }>;
}

/** Platform-wide ticket sales stats for admin dashboard */
export interface PlatformTicketSalesStats {
  total_revenue: number;
  total_purchases: number;
  total_refunds: number;
  total_refund_amount: number;
  recent_purchases: TicketPurchase[];
}

/** Enriched ticket purchase with event details (for My Tickets page) */
export interface EnrichedTicketPurchase extends TicketPurchase {
  event_title: string;
  event_slug: string;
  event_start_date: string;
  event_end_date: string;
  event_venue_name: string | null;
  event_city: string | null;
  event_state: string | null;
  event_check_in_enabled: boolean;
  ticket_name: string;
}

/** Admin ticket sales list item with event and buyer info */
export interface AdminTicketSale extends TicketPurchase {
  event_title: string;
  event_slug: string;
  buyer_name: string;
  buyer_email: string;
  ticket_name: string;
}

// ============================================================
// Phase 6A: Event Co-Host System Types
// ============================================================

/** Co-host role on an event */
export type EventCoHostRole = 'organizer' | 'vendor' | 'performer' | 'exhibitor';

/** Co-host invitation/membership status */
export type EventCoHostStatus = 'pending' | 'active' | 'declined' | 'removed';

/** Event co-host data from event_co_hosts table with joined listing info */
export interface EventCoHost {
  id: number;
  event_id: number;
  co_host_listing_id: number;
  co_host_role: EventCoHostRole;
  display_order: number;
  invitation_message: string | null;
  status: EventCoHostStatus;
  invited_by_user_id: number | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined listing fields
  listing_name?: string;
  listing_slug?: string;
  listing_logo?: string;
  listing_city?: string;
  listing_state?: string;
  listing_tier?: string;
}

/** Input for inviting a co-host */
export interface CreateEventCoHostInput {
  event_id: number;
  co_host_listing_id: number;
  co_host_role: EventCoHostRole;
  display_order?: number;
  invitation_message?: string;
}

/** Input for updating a co-host (status change, role change) */
export interface UpdateEventCoHostInput {
  co_host_role?: EventCoHostRole;
  display_order?: number;
  status?: EventCoHostStatus;
}

/** Admin co-host list item (extended with event info) */
export interface AdminEventCoHost extends EventCoHost {
  event_title?: string;
  event_slug?: string;
  event_start_date?: string;
  event_status?: string;
  invited_by_name?: string;
}

// ============================================================
// Phase 6B: Event Exhibitor System Types
// ============================================================

/** Exhibitor booth size classification */
export type ExhibitorBoothSize = 'small' | 'medium' | 'large' | 'premium';

/** Exhibitor invitation/membership status */
export type EventExhibitorStatus = 'pending' | 'active' | 'declined' | 'removed';

/** Event exhibitor data from event_exhibitors table with joined listing info */
export interface EventExhibitor {
  id: number;
  event_id: number;
  exhibitor_listing_id: number;
  booth_number: string | null;
  booth_size: ExhibitorBoothSize;
  exhibitor_description: string | null;
  exhibitor_logo: string | null;
  display_order: number;
  invitation_message: string | null;
  click_count: number;
  impression_count: number;
  status: EventExhibitorStatus;
  invited_by_user_id: number | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined listing fields
  listing_name?: string;
  listing_slug?: string;
  listing_logo?: string;
  listing_city?: string;
  listing_state?: string;
  listing_tier?: string;
}

/** Input for inviting an exhibitor */
export interface CreateEventExhibitorInput {
  event_id: number;
  exhibitor_listing_id: number;
  booth_number?: string;
  booth_size?: ExhibitorBoothSize;
  exhibitor_description?: string;
  invitation_message?: string;
  display_order?: number;
}

/** Input for updating an exhibitor (status change, booth change) */
export interface UpdateEventExhibitorInput {
  booth_number?: string;
  booth_size?: ExhibitorBoothSize;
  exhibitor_description?: string;
  exhibitor_logo?: string;
  display_order?: number;
  status?: EventExhibitorStatus;
}

/** Admin exhibitor list item (extended with event info) */
export interface AdminEventExhibitor extends EventExhibitor {
  event_title?: string;
  event_slug?: string;
  event_start_date?: string;
  event_status?: string;
  invited_by_name?: string;
}

// ============================================================
// Phase 6C: Event Service Request Types (Quote Integration)
// ============================================================

/** Service category for event procurement */
export type EventServiceCategory =
  | 'catering'
  | 'av_equipment'
  | 'security'
  | 'decor'
  | 'photography'
  | 'entertainment'
  | 'transportation'
  | 'venue_services'
  | 'cleaning'
  | 'staffing'
  | 'other';

/** Service request priority level */
export type EventServiceRequestPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Service request lifecycle status */
export type EventServiceRequestStatus = 'draft' | 'open' | 'in_progress' | 'fulfilled' | 'cancelled';

/** Event service request data from event_service_requests table */
export interface EventServiceRequest {
  id: number;
  event_id: number;
  requester_listing_id: number;
  quote_id: number | null;
  service_category: EventServiceCategory;
  title: string;
  description: string | null;
  required_by_date: string | null;
  budget_min: number | null;
  budget_max: number | null;
  priority: EventServiceRequestPriority;
  status: EventServiceRequestStatus;
  fulfilled_by_listing_id: number | null;
  fulfilled_quote_response_id: number | null;
  notes: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  event_title?: string;
  event_slug?: string;
  event_start_date?: string;
  requester_listing_name?: string;
  fulfilled_by_name?: string;
  quote_status?: string;
  quote_response_count?: number;
}

/** Input for creating an event service request */
export interface CreateEventServiceRequestInput {
  event_id: number;
  service_category: EventServiceCategory;
  title: string;
  description?: string;
  required_by_date?: string;
  budget_min?: number;
  budget_max?: number;
  priority?: EventServiceRequestPriority;
  notes?: string;
}

/** Input for updating an event service request */
export interface UpdateEventServiceRequestInput {
  title?: string;
  description?: string;
  required_by_date?: string;
  budget_min?: number;
  budget_max?: number;
  priority?: EventServiceRequestPriority;
  status?: EventServiceRequestStatus;
  notes?: string;
}

/** Admin service request list item (extended with event + listing info) */
export interface AdminEventServiceRequest extends EventServiceRequest {
  event_status?: string;
  created_by_name?: string;
}

// ============================================================
// Phase 6D: Organizer Analytics Types
// ============================================================

/** Per-entity status breakdown for organizer analytics */
export interface OrganizerEntityBreakdown {
  total: number;
  pending: number;
  active: number;
  declined: number;
  removed: number;
  acceptance_rate: number; // active / (active + declined) as percentage
}

/** Exhibitor engagement metrics */
export interface OrganizerExhibitorMetrics extends OrganizerEntityBreakdown {
  total_impressions: number;
  total_clicks: number;
  click_through_rate: number; // clicks / impressions as percentage
}

/** Service request fulfillment metrics */
export interface OrganizerServiceMetrics {
  total: number;
  draft: number;
  open: number;
  in_progress: number;
  fulfilled: number;
  cancelled: number;
  fulfillment_rate: number; // fulfilled / (total - cancelled - draft) as percentage
  total_quote_responses: number;
  avg_responses_per_request: number;
}

/** Complete organizer analytics for a single event */
export interface OrganizerAnalyticsData {
  event_id: number;
  co_hosts: OrganizerEntityBreakdown;
  exhibitors: OrganizerExhibitorMetrics;
  service_requests: OrganizerServiceMetrics;
  /** Overall organizer engagement score (0-100) */
  organizer_score: number;
  /** Tier limits for context */
  tier_limits: {
    co_hosts: number;
    exhibitors: number;
    service_requests: number;
    tier: string;
  };
}

// ============================================================
// Phase 8: KPI Dashboard Types
// ============================================================

/** Platform-wide event KPI stats for admin dashboard (FM Section 17) */
export interface EventKPIStats {
  // Conversion metrics
  event_to_rsvp_rate: number | null;           // FM 17.1: page views → RSVP %
  rsvp_to_attendance_rate: number | null;       // FM 17.2: RSVP → check-in %

  // Growth metrics
  new_registrations_via_events: number | null;  // FM 17.3: not tracked
  business_follow_rate: number | null;          // FM 17.4: not tracked

  // Activity metrics
  avg_events_per_business: number | null;       // FM 17.5: events/business/month
  post_publish_share_rate: number | null;       // FM 17.6: % shared on 1+ channel
  social_to_rsvp_rate: number | null;           // FM 17.7: not tracked
  notification_subscription_rate: number | null; // FM 17.8: % users subscribed
  post_event_review_rate: number | null;        // FM 17.9: attendees → review %

  // Organizer metrics
  organizer_adoption_rate: number | null;       // FM 17.10: not tracked
  vendor_acceptance_rate: number | null;        // FM 17.11: exhibitor invite → accept %

  // Community metrics
  community_submissions_per_month: number | null; // FM 17.12: community events/month

  // Revenue metrics
  ticket_revenue_total: number | null;          // FM 17.13: total Stripe revenue

  // Cross-sell metrics
  cross_sell_conversion_rate: number | null;    // FM 17.14: not tracked

  // Summary
  total_events: number;
  total_rsvps: number;
  total_shares: number;
  period: string;

  // Tracking flags for metrics that can't be computed
  not_tracked: string[];
}

/** Admin platform-wide organizer stats */
export interface AdminOrganizerStats {
  events_with_co_hosts: number;
  events_with_exhibitors: number;
  events_with_service_requests: number;
  total_co_hosts: number;
  total_exhibitors: number;
  total_service_requests: number;
  avg_co_host_acceptance_rate: number;
  avg_exhibitor_acceptance_rate: number;
  avg_service_fulfillment_rate: number;
}
