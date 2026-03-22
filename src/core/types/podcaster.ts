/**
 * Podcaster Types - Creator Profiles
 *
 * GOVERNANCE COMPLIANCE:
 * - Type-safe database row to application entity mapping
 * - Build Map v2.1 ENHANCED patterns
 * - DatabaseService boundary: row types in db-rows.ts, app types here
 *
 * @authority CLAUDE.md - Type system standards
 * @tier ADVANCED
 * @reference src/core/types/affiliate-marketer.ts - Exact pattern replicated
 */

// ============================================================================
// Enums
// ============================================================================

export enum PodcasterStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive'
}

// ============================================================================
// Application-Level Interfaces (parsed types)
// ============================================================================

export interface PodcasterProfile {
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
  // Podcaster-specific fields
  podcast_name: string | null;
  hosting_platform: string | null;
  rss_feed_url: string | null;
  total_episodes: number;
  avg_episode_length: number;
  publishing_frequency: string | null;
  genres: string[];                              // Parsed from JSON
  guest_booking_info: string | null;
  monetization_methods: string[];                // Parsed from JSON
  listener_count: number;
  download_count: number;
  // Shared fields (same as AM/IP)
  platforms: (string | { name: string; url?: string; verified?: boolean })[]; // Parsed from JSON — may be strings or objects
  website_url: string | null;
  social_links: Record<string, string> | null;   // Parsed from JSON
  is_verified: boolean;                          // Parsed from TINYINT(1)
  is_featured: boolean;                          // Parsed from TINYINT(1)
  status: PodcasterStatus;
  view_count: number;
  contact_count: number;
  rating_average: number;
  rating_count: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface PodcasterEpisode {
  id: number;
  podcaster_id: number;
  episode_title: string | null;
  episode_number: number | null;
  season_number: number | null;
  description: string | null;
  audio_url: string | null;
  duration: number | null;
  guest_names: string[];                         // Parsed from JSON
  published_at: Date | null;
  sort_order: number;
  created_at: Date;
}

export interface PodcasterReview {
  id: number;
  podcaster_id: number;
  reviewer_user_id: number;
  reviewer_listing_id: number | null;
  rating: number;
  review_text: string | null;
  episode_reference: string | null;
  status: string;
  created_at: Date;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreatePodcasterInput {
  display_name: string;
  slug?: string;
  listing_id?: number;
  profile_image?: string;
  cover_image?: string;
  headline?: string;
  bio?: string;
  location?: string;
  podcast_name?: string;
  hosting_platform?: string;
  rss_feed_url?: string;
  total_episodes?: number;
  avg_episode_length?: number;
  publishing_frequency?: string;
  genres?: string[];
  guest_booking_info?: string;
  monetization_methods?: string[];
  listener_count?: number;
  download_count?: number;
  platforms?: string[];
  website_url?: string;
  social_links?: Record<string, string>;
  is_featured?: boolean;
}

export interface UpdatePodcasterInput {
  display_name?: string;
  slug?: string;
  listing_id?: number | null;
  profile_image?: string;
  cover_image?: string;
  headline?: string;
  bio?: string;
  location?: string;
  podcast_name?: string;
  hosting_platform?: string;
  rss_feed_url?: string;
  total_episodes?: number;
  avg_episode_length?: number;
  publishing_frequency?: string;
  genres?: string[];
  guest_booking_info?: string;
  monetization_methods?: string[];
  listener_count?: number;
  download_count?: number;
  platforms?: string[];
  website_url?: string | null;
  social_links?: Record<string, string> | null;
  is_verified?: boolean;
  is_featured?: boolean;
  status?: PodcasterStatus;
  published_at?: Date | null;
}

export interface CreateEpisodeInput {
  episode_title?: string;
  episode_number?: number;
  season_number?: number;
  description?: string;
  audio_url?: string;
  duration?: number;
  guest_names?: string[];
  published_at?: Date;
}

export interface UpdateEpisodeInput {
  episode_title?: string;
  episode_number?: number;
  season_number?: number;
  description?: string;
  audio_url?: string;
  duration?: number;
  guest_names?: string[];
  published_at?: Date;
  sort_order?: number;
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export interface PodcasterFilters {
  status?: PodcasterStatus;
  location?: string;
  genres?: string[];
  platforms?: string[];
  is_verified?: boolean;
  is_featured?: boolean;
  minRating?: number;
  searchQuery?: string;
}

export type PodcasterSortOption = 'recent' | 'popular' | 'rating' | 'alphabetical';
