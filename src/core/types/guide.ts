/**
 * Guide Types - Tier 2 Content Types Phase 1
 *
 * GOVERNANCE COMPLIANCE:
 * - Type-safe database row to application entity mapping
 * - Build Map v2.1 ENHANCED patterns
 * - DatabaseService boundary: row types in db-rows.ts, app types here
 *
 * @authority CLAUDE.md - Type system standards
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase 1
 */

// ============================================================================
// Enums
// ============================================================================

export enum GuideStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived'
}

export enum GuideDifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

// ============================================================================
// Application-Level Interfaces (parsed types)
// ============================================================================

export interface GuideSection {
  id: number;
  guide_id: number;
  section_number: number;
  title: string;
  slug: string | null;
  content: string | null;
  estimated_time: number | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date | null;
}

export interface Guide {
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
  tags: string[];                        // Parsed from JSON
  difficulty_level: GuideDifficultyLevel;
  estimated_time: number | null;
  word_count: number;
  status: GuideStatus;
  is_featured: boolean;                  // Parsed from TINYINT(1)
  view_count: number;
  bookmark_count: number;
  share_count: number;
  completion_count: number;
  version: string | null;
  last_reviewed_at: Date | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
  sections?: GuideSection[];             // Populated on full fetch
}

export interface GuideProgress {
  id: number;
  guide_id: number;
  user_id: number;
  section_id: number | null;
  completed_sections: number[];          // Parsed from JSON
  is_completed: boolean;                 // Parsed from TINYINT(1)
  started_at: Date | null;
  completed_at: Date | null;
  last_accessed_at: Date | null;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateGuideInput {
  listing_id: number;
  title: string;
  slug?: string;
  subtitle?: string;
  excerpt?: string;
  overview?: string;
  prerequisites?: string;
  featured_image?: string;
  category_id?: number;
  tags?: string[];
  difficulty_level?: GuideDifficultyLevel;
  estimated_time?: number;
  is_featured?: boolean;
  version?: string;
}

export interface UpdateGuideInput {
  title?: string;
  slug?: string;
  subtitle?: string;
  excerpt?: string;
  overview?: string;
  prerequisites?: string;
  featured_image?: string;
  category_id?: number;
  tags?: string[];
  difficulty_level?: GuideDifficultyLevel;
  estimated_time?: number;
  status?: GuideStatus;
  is_featured?: boolean;
  version?: string;
  last_reviewed_at?: Date | null;
  published_at?: Date | null;
}

export interface CreateGuideSectionInput {
  title: string;
  slug?: string;
  content?: string;
  estimated_time?: number;
}

export interface UpdateGuideSectionInput {
  title?: string;
  slug?: string;
  content?: string;
  estimated_time?: number;
  sort_order?: number;
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export interface GuideFilters {
  listing_id?: number;
  status?: GuideStatus;
  is_featured?: boolean;
  category_id?: number;
  difficulty_level?: GuideDifficultyLevel;
  searchQuery?: string;
  followedListingIds?: number[];
}

export type GuideSortOption = 'recent' | 'popular' | 'alphabetical' | 'difficulty' | 'estimated_time';
