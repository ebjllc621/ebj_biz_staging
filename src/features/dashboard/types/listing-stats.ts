/**
 * Listing Statistics Types
 *
 * @tier SIMPLE
 * @phase Phase 6 - Listing Manager Dashboard
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_6_BRAIN_PLAN.md
 *
 * Types for listing statistics API responses used in Listing Manager Dashboard.
 */

/**
 * ListingStats - Complete listing statistics response
 *
 * Contains aggregated metrics for a specific listing across views, reviews,
 * followers, messages, offers, events, and profile completeness.
 */
export interface ListingStats {
  /** View statistics */
  views: {
    /** Total all-time views */
    total: number;
    /** Views in last 30 days */
    last30Days: number;
    /** Trend direction compared to previous 30-day period */
    trend: 'up' | 'down' | 'neutral';
    /** Trend percentage change (positive or negative) */
    trendPercent: number;
  };
  /** Review statistics */
  reviews: {
    /** Total approved reviews */
    total: number;
    /** Average rating (0-5) */
    averageRating: number;
    /** Pending reviews awaiting moderation */
    pending: number;
  };
  /** Total follower count (users who bookmarked this listing) */
  followers: number;
  /** Message statistics */
  messages: {
    /** Total messages */
    total: number;
    /** Unread message count */
    unread: number;
  };
  /** Offer statistics */
  offers: {
    /** Active offers (not expired) */
    active: number;
    /** Total offers (including expired) */
    total: number;
  };
  /** Event statistics */
  events: {
    /** Upcoming events (future dates) */
    upcoming: number;
    /** Total events (including past) */
    total: number;
  };
  /** Recommendations received (entity_type='listing' referrals targeting this listing) */
  recommendations: number;
  /** Affiliated listings (other listings whose owners share connection groups with this listing's owner) */
  affiliatedListings: number;
  /** Quotes received (quote_requests targeting this listing) */
  quotesReceived: number;
  /** Total engagements - aggregated interactions across listing ecosystem (views, shares, contacts, RSVPs, offer clicks, recommendations, etc.) */
  pageClicks: number;
  /** Profile completeness metrics */
  completeness: {
    /** Percentage complete (0-100) */
    percentage: number;
    /** Missing required fields */
    missingRequired: string[];
    /** Missing optional fields that improve profile */
    missingOptional: string[];
  };
}

/**
 * ListingActivityItem - Single activity feed item
 *
 * Represents a discrete event in the listing's activity timeline.
 */
export interface ListingActivityItem {
  /** Unique activity ID */
  id: number;
  /** Type of activity */
  type: 'review' | 'message' | 'view_milestone' | 'offer_redemption' | 'event_rsvp' | 'follower';
  /** Activity title */
  title: string;
  /** Activity description */
  description: string;
  /** Name of the actor (if applicable) */
  actor_name?: string;
  /** Activity timestamp */
  created_at: Date;
}
