/**
 * Homepage Feature Type Definitions
 *
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */

import { Listing } from '@core/services/ListingService';
import { Offer } from '@core/services/OfferService';
import { Event } from '@core/services/EventService';
import { Category } from '@core/services/CategoryService';

// ============================================================================
// Public Homepage Types
// ============================================================================

/**
 * Featured category for homepage display
 */
export interface FeaturedCategory {
  id: number;
  name: string;
  slug: string;
  icon_url?: string;
  listing_count: number;
}

/**
 * Listing card for homepage display
 */
export interface ListingCardData {
  id: number;
  name: string;
  slug: string;
  category_name?: string;
  city?: string;
  state?: string;
  cover_image_url?: string;
  logo_url?: string;
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  job_count?: number;
  event_count?: number;
  offer_count?: number;
}

/**
 * Offer card for homepage display
 */
export interface OfferCardData {
  id: number;
  title: string;
  slug: string;
  listing_name: string;
  listing_slug: string;
  offer_type: 'discount' | 'coupon' | 'product' | 'service';
  original_price?: number;
  sale_price?: number;
  discount_percentage?: number;
  image?: string;
  end_date: Date;
}

/**
 * Event card for homepage display
 */
export interface EventCardData {
  id: number;
  title: string;
  slug: string;
  listing_name: string;
  listing_slug: string;
  event_type?: string;
  start_date: Date;
  end_date: Date;
  venue_name?: string;
  city?: string;
  state?: string;
  banner_image?: string;
  is_ticketed: boolean;
  ticket_price?: number;
  remaining_capacity?: number;
}

/**
 * Platform statistics for public homepage
 */
export interface PlatformStats {
  total_listings: number;
  total_users: number;
  total_reviews: number;
  total_events: number;
}

/**
 * Public homepage data structure
 */
export interface PublicHomeData {
  categories: FeaturedCategory[];
  featured_listings: ListingCardData[];
  active_offers: OfferCardData[];
  upcoming_events: EventCardData[];
  latest_listings: ListingCardData[];
  stats: PlatformStats;
}

// ============================================================================
// Authenticated Homepage Types
// ============================================================================

/**
 * User statistics for authenticated homepage
 */
export interface UserHomeStats {
  profile_views: number;
  connections: number;
  unread_messages: number;
  owned_listings: number;
}

/**
 * Network activity item
 */
export interface ActivityItem {
  id: number;
  type: 'connection' | 'review' | 'listing' | 'offer' | 'event';
  title: string;
  description: string;
  actor_name?: string;
  actor_avatar?: string;
  created_at: Date;
  link?: string;
}

/**
 * Connection suggestion for authenticated users
 */
export interface ConnectionSuggestion {
  id: number;
  name: string;
  occupation?: string;
  company?: string;
  avatar_url?: string;
  mutual_connections: number;
}

/**
 * Network growth metrics
 */
export interface NetworkGrowth {
  weekly_connections: number;
  weekly_views: number;
  engagement_rate: number;
}

/**
 * Authenticated homepage data structure
 */
export interface AuthenticatedHomeData {
  user_stats: UserHomeStats;
  recent_activity: ActivityItem[];
  connection_suggestions: ConnectionSuggestion[];
  personalized_listings: ListingCardData[];
  personalized_offers: OfferCardData[];
  network_growth: NetworkGrowth;
  // Browse sections (same as public homepage)
  categories: FeaturedCategory[];
  featured_listings: ListingCardData[];
  active_offers: OfferCardData[];
  upcoming_events: EventCardData[];
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search scope for homepage search
 */
export type SearchScope = 'listings' | 'offers' | 'events' | 'all';

/**
 * Search result item
 */
export interface SearchResult {
  id: number;
  type: SearchScope;
  title: string;
  description?: string;
  image?: string;
  link: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Homepage API response for public view
 */
export interface PublicHomeResponse {
  success: true;
  data: PublicHomeData;
  cached_at?: string;
}

/**
 * Homepage API response for authenticated view
 */
export interface AuthenticatedHomeResponse {
  success: true;
  data: AuthenticatedHomeData;
}
