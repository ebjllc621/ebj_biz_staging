/**
 * Internet Personality Types - Tier 3 Creator Profiles Phase 1
 *
 * GOVERNANCE COMPLIANCE:
 * - Type-safe database row to application entity mapping
 * - Build Map v2.1 ENHANCED patterns
 * - DatabaseService boundary: row types in db-rows.ts, app types here
 *
 * @authority CLAUDE.md - Type system standards
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 1
 */

// ============================================================================
// Enums
// ============================================================================

export enum InternetPersonalityStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive'
}

// ============================================================================
// Application-Level Interfaces (parsed types)
// ============================================================================

export interface InternetPersonalityProfile {
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
  creating_since: number | null;                 // YEAR type
  content_categories: string[];                  // Parsed from JSON
  platforms: (string | { name: string; url?: string; verified?: boolean })[]; // Parsed from JSON — may be strings or objects
  total_reach: number;
  avg_engagement_rate: number | null;
  collaboration_types: string[];                 // Parsed from JSON
  rate_card: Record<string, unknown> | null;     // Parsed from JSON
  media_kit_url: string | null;
  management_contact: string | null;
  website_url: string | null;
  social_links: Record<string, string> | null;   // Parsed from JSON
  is_verified: boolean;                          // Parsed from TINYINT(1)
  is_featured: boolean;                          // Parsed from TINYINT(1)
  status: InternetPersonalityStatus;
  collaboration_count: number;
  view_count: number;
  contact_count: number;
  rating_average: number;
  rating_count: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface Collaboration {
  id: number;
  personality_id: number;
  brand_name: string | null;
  brand_logo: string | null;
  listing_id: number | null;
  collaboration_type: string | null;
  description: string | null;
  content_url: string | null;
  collaboration_date: Date | null;
  sort_order: number;
  created_at: Date;
}

export interface InternetPersonalityReview {
  id: number;
  personality_id: number;
  reviewer_user_id: number;
  reviewer_listing_id: number | null;
  rating: number;
  review_text: string | null;
  collaboration_type: string | null;
  status: string;
  created_at: Date;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateInternetPersonalityInput {
  display_name: string;
  slug?: string;
  listing_id?: number;
  profile_image?: string;
  cover_image?: string;
  headline?: string;
  bio?: string;
  location?: string;
  creating_since?: number;
  content_categories?: string[];
  platforms?: string[];
  total_reach?: number;
  avg_engagement_rate?: number;
  collaboration_types?: string[];
  rate_card?: Record<string, unknown>;
  media_kit_url?: string;
  management_contact?: string;
  website_url?: string;
  social_links?: Record<string, string>;
  is_featured?: boolean;
}

export interface UpdateInternetPersonalityInput {
  display_name?: string;
  slug?: string;
  listing_id?: number | null;
  profile_image?: string;
  cover_image?: string;
  headline?: string;
  bio?: string;
  location?: string;
  creating_since?: number | null;
  content_categories?: string[];
  platforms?: string[];
  total_reach?: number;
  avg_engagement_rate?: number | null;
  collaboration_types?: string[];
  rate_card?: Record<string, unknown> | null;
  media_kit_url?: string | null;
  management_contact?: string | null;
  website_url?: string | null;
  social_links?: Record<string, string> | null;
  is_verified?: boolean;
  is_featured?: boolean;
  status?: InternetPersonalityStatus;
  published_at?: Date | null;
}

export interface CreateCollaborationInput {
  brand_name?: string;
  brand_logo?: string;
  listing_id?: number;
  collaboration_type?: string;
  description?: string;
  content_url?: string;
  collaboration_date?: Date;
}

export interface UpdateCollaborationInput {
  brand_name?: string;
  brand_logo?: string;
  listing_id?: number | null;
  collaboration_type?: string;
  description?: string;
  content_url?: string;
  collaboration_date?: Date;
  sort_order?: number;
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export interface InternetPersonalityFilters {
  status?: InternetPersonalityStatus;
  location?: string;
  content_categories?: string[];
  platforms?: string[];
  collaboration_types?: string[];
  is_verified?: boolean;
  is_featured?: boolean;
  minRating?: number;
  searchQuery?: string;
}

export type InternetPersonalitySortOption = 'recent' | 'popular' | 'rating' | 'alphabetical';
