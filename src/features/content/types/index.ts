/**
 * Content Feature Types
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 4 - Content Page Components
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/content/phases/PHASE_4_COMPONENTS.md
 *
 * Type definitions for content feature display components.
 * Re-exports service types for convenience and adds display-specific types.
 */

// ============================================================================
// Sort Options
// ============================================================================

/** Sort options for content list */
export type ContentSortOption = 'category_featured' | 'recent' | 'popular' | 'alphabetical';

/** Content type filter */
export type ContentTypeFilter = 'all' | 'article' | 'video' | 'podcast' | 'newsletter' | 'guide';

/** Sort dropdown option */
export interface ContentSortDropdownOption {
  value: ContentSortOption;
  label: string;
}

/** Type filter dropdown option */
export interface ContentTypeDropdownOption {
  value: ContentTypeFilter;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// ============================================================================
// Re-export Service Types for Convenience
// ============================================================================

export type {
  ContentArticle,
  ContentVideo,
  ContentPodcast,
  ContentItem,
  ContentType,
  ContentStatus,
  VideoType
} from '@core/services/ContentService';

export type { SubscriptionAnalytics, SubscriptionListItem } from './subscription-analytics';
