/**
 * Affiliate Marketer Types - Tier 3 Creator Profiles Phase 1
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

export enum AffiliateMarketerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive'
}

// ============================================================================
// Application-Level Interfaces (parsed types)
// ============================================================================

export interface AffiliateMarketerProfile {
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
  niches: string[];                              // Parsed from JSON
  specializations: string[];                     // Parsed from JSON
  affiliate_networks: string[];                  // Parsed from JSON
  commission_range_min: number | null;
  commission_range_max: number | null;
  flat_fee_min: number | null;
  flat_fee_max: number | null;
  audience_size: number;
  audience_demographics: Record<string, unknown> | null;  // Parsed from JSON
  platforms: string[];                           // Parsed from JSON
  website_url: string | null;
  social_links: Record<string, string> | null;   // Parsed from JSON
  is_verified: boolean;                          // Parsed from TINYINT(1)
  is_featured: boolean;                          // Parsed from TINYINT(1)
  status: AffiliateMarketerStatus;
  campaign_count: number;
  businesses_helped: number;
  avg_conversion_rate: number | null;
  view_count: number;
  contact_count: number;
  rating_average: number;
  rating_count: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface PortfolioItem {
  id: number;
  marketer_id: number;
  brand_name: string | null;
  brand_logo: string | null;
  campaign_title: string | null;
  description: string | null;
  results_summary: string | null;
  conversion_rate: number | null;
  content_url: string | null;
  campaign_date: Date | null;
  sort_order: number;
  created_at: Date;
}

export interface AffiliateMarketerReview {
  id: number;
  marketer_id: number;
  reviewer_user_id: number;
  reviewer_listing_id: number | null;
  rating: number;
  review_text: string | null;
  campaign_type: string | null;
  status: string;
  created_at: Date;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateAffiliateMarketerInput {
  display_name: string;
  slug?: string;
  listing_id?: number;
  profile_image?: string;
  cover_image?: string;
  headline?: string;
  bio?: string;
  location?: string;
  niches?: string[];
  specializations?: string[];
  affiliate_networks?: string[];
  commission_range_min?: number;
  commission_range_max?: number;
  flat_fee_min?: number;
  flat_fee_max?: number;
  audience_size?: number;
  audience_demographics?: Record<string, unknown>;
  platforms?: string[];
  website_url?: string;
  social_links?: Record<string, string>;
  is_featured?: boolean;
}

export interface UpdateAffiliateMarketerInput {
  display_name?: string;
  slug?: string;
  listing_id?: number | null;
  profile_image?: string;
  cover_image?: string;
  headline?: string;
  bio?: string;
  location?: string;
  niches?: string[];
  specializations?: string[];
  affiliate_networks?: string[];
  commission_range_min?: number | null;
  commission_range_max?: number | null;
  flat_fee_min?: number | null;
  flat_fee_max?: number | null;
  audience_size?: number;
  audience_demographics?: Record<string, unknown> | null;
  platforms?: string[];
  website_url?: string | null;
  social_links?: Record<string, string> | null;
  is_verified?: boolean;
  is_featured?: boolean;
  status?: AffiliateMarketerStatus;
  published_at?: Date | null;
}

export interface CreatePortfolioItemInput {
  brand_name?: string;
  brand_logo?: string;
  campaign_title?: string;
  description?: string;
  results_summary?: string;
  conversion_rate?: number;
  content_url?: string;
  campaign_date?: Date;
}

export interface UpdatePortfolioItemInput {
  brand_name?: string;
  brand_logo?: string;
  campaign_title?: string;
  description?: string;
  results_summary?: string;
  conversion_rate?: number;
  content_url?: string;
  campaign_date?: Date;
  sort_order?: number;
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export interface AffiliateMarketerFilters {
  status?: AffiliateMarketerStatus;
  location?: string;
  niches?: string[];
  platforms?: string[];
  is_verified?: boolean;
  is_featured?: boolean;
  minRating?: number;
  searchQuery?: string;
}

export type AffiliateMarketerSortOption = 'recent' | 'popular' | 'rating' | 'alphabetical';
