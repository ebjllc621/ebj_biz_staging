/**
 * Entity Type Registry
 * Phase 0 - Foundation Migration
 *
 * GOVERNANCE COMPLIANCE:
 * - Extensible configuration system for entity types
 * - Phase-based enablement of entity types
 * - Import paths: Uses @features/ aliases
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier SIMPLE
 * @phase Unified Sharing & Recommendations - Phase 0
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_0_BRAIN_PLAN.md
 */

import type { EntityType, Phase1EntityType, ContentEntityType } from '../types/sharing';

// ============================================================================
// ENTITY TYPE CONFIGURATION
// ============================================================================

/**
 * Configuration for a single entity type
 */
export interface EntityTypeConfig {
  /** Display name (singular) */
  displayName: string;

  /** Display name (plural) */
  displayNamePlural: string;

  /** Lucide icon name */
  icon: string;

  /** URL pattern for entity (use {id} placeholder - replaced with slug, username, or ID as appropriate) */
  urlPattern: string;

  /** Points awarded for sharing this entity type */
  points: number;

  /** Whether this entity type is currently enabled */
  enabled: boolean;

  /** Minimum phase required for this entity type */
  minPhase: number;

  /** Badge requirements for sharing this entity type (Phase 4+) */
  badges?: string[];
}

// ============================================================================
// ENTITY TYPE REGISTRY
// ============================================================================

/**
 * Master registry of all entity types
 * Phase 0: All types defined but not all enabled
 */
export const ENTITY_TYPE_REGISTRY: Record<EntityType, EntityTypeConfig> = {
  // Platform invites (legacy referrals) - Always enabled
  platform_invite: {
    displayName: 'Platform Invite',
    displayNamePlural: 'Platform Invites',
    icon: 'UserPlus',
    urlPattern: '/join?ref={id}',
    points: 5,
    enabled: true,
    minPhase: 0
  },

  // Phase 1: User recommendations
  user: {
    displayName: 'User Recommendation',
    displayNamePlural: 'User Recommendations',
    icon: 'Users',
    urlPattern: '/profile/{id}',  // {id} = username (route: /profile/[username])
    points: 10,
    enabled: true,  // Phase 1 - ENABLED
    minPhase: 1
  },

  // Phase 1: Listing recommendations
  listing: {
    displayName: 'Business Recommendation',
    displayNamePlural: 'Business Recommendations',
    icon: 'Building',
    urlPattern: '/listings/{id}',  // {id} = slug (route: /listings/[slug])
    points: 5,
    enabled: true,  // Phase 1 - ENABLED
    minPhase: 1
  },

  // Phase 1: Event recommendations
  event: {
    displayName: 'Event Recommendation',
    displayNamePlural: 'Event Recommendations',
    icon: 'Calendar',
    urlPattern: '/events/{id}',  // {id} = slug (route: /events/[slug])
    points: 5,
    enabled: true,  // Phase 1 - ENABLED
    minPhase: 1
  },

  // Phase 2: Offer sharing
  offer: {
    displayName: 'Special Offer',
    displayNamePlural: 'Special Offers',
    icon: 'Tag',
    urlPattern: '/offers/{id}',  // {id} = slug (route: /offers/[slug])
    points: 8,
    enabled: true,  // ENABLED - Offers Recommendation Integration
    minPhase: 2
  },

  // Phase 2: Product recommendations
  product: {
    displayName: 'Product Recommendation',
    displayNamePlural: 'Product Recommendations',
    icon: 'Package',
    urlPattern: '/products/{id}',
    points: 5,
    enabled: false,  // Phase 2
    minPhase: 2
  },

  // Phase 2: Service recommendations
  service: {
    displayName: 'Service Recommendation',
    displayNamePlural: 'Service Recommendations',
    icon: 'Briefcase',
    urlPattern: '/services/{id}',
    points: 5,
    enabled: false,  // Phase 2
    minPhase: 2
  },

  // Phase 8: Article sharing
  article: {
    displayName: 'Article',
    displayNamePlural: 'Articles',
    icon: 'FileText',
    urlPattern: '/articles/{id}',
    points: 3,
    enabled: true,  // Phase 8 - ENABLED
    minPhase: 8,
    badges: ['content_curator_10', 'knowledge_sharer_25']
  },

  // Phase 8: Newsletter sharing
  newsletter: {
    displayName: 'Newsletter',
    displayNamePlural: 'Newsletters',
    icon: 'Mail',
    urlPattern: '/newsletters/{id}',
    points: 3,
    enabled: true,  // Phase 8 - ENABLED
    minPhase: 8,
    badges: ['content_curator_10', 'knowledge_sharer_25']
  },

  // Phase 8: Podcast sharing
  podcast: {
    displayName: 'Podcast Episode',
    displayNamePlural: 'Podcast Episodes',
    icon: 'Mic',
    urlPattern: '/podcasts/{id}',
    points: 3,
    enabled: true,  // Phase 8 - ENABLED
    minPhase: 8,
    badges: ['podcast_promoter_10', 'knowledge_sharer_25']
  },

  // Phase 8: Video sharing
  video: {
    displayName: 'Video',
    displayNamePlural: 'Videos',
    icon: 'Video',
    urlPattern: '/videos/{id}',
    points: 3,
    enabled: true,  // Phase 8 - ENABLED
    minPhase: 8,
    badges: ['video_advocate_10', 'knowledge_sharer_25']
  },

  // Phase 8: Guide sharing
  guide: {
    displayName: 'Guide',
    displayNamePlural: 'Guides',
    icon: 'BookOpen',
    urlPattern: '/guides/{id}',
    points: 3,
    enabled: true,
    minPhase: 8,
    badges: ['content_curator_10', 'knowledge_sharer_25']
  },

  // Phase 4: Job posting recommendations
  job_posting: {
    displayName: 'Job Posting',
    displayNamePlural: 'Job Postings',
    icon: 'BriefcaseBusiness',
    urlPattern: '/jobs/{id}',  // {id} = slug (route: /jobs/[slug])
    points: 10,
    enabled: true,  // ENABLED - Jobs Recommendation Integration
    minPhase: 4,
    badges: ['job_scout_10', 'job_pro_25', 'job_master_50', 'job_ambassador_100']
  },

  // Tier 3: Affiliate Marketer profiles
  affiliate_marketer: {
    displayName: 'Affiliate Marketer',
    displayNamePlural: 'Affiliate Marketers',
    icon: 'TrendingUp',
    urlPattern: '/affiliate-marketers/{id}',
    points: 5,
    enabled: true,
    minPhase: 8,
    badges: ['content_curator_10', 'knowledge_sharer_25']
  },

  // Tier 3: Internet Personality profiles
  internet_personality: {
    displayName: 'Internet Personality',
    displayNamePlural: 'Internet Personalities',
    icon: 'Star',
    urlPattern: '/internet-personalities/{id}',
    points: 5,
    enabled: true,
    minPhase: 8,
    badges: ['content_curator_10', 'knowledge_sharer_25']
  },

  podcaster: {
    displayName: 'Podcaster',
    displayNamePlural: 'Podcasters',
    icon: 'Mic',
    urlPattern: '/podcasters/{id}',
    points: 5,
    enabled: true,
    minPhase: 8,
    badges: ['content_curator_10', 'knowledge_sharer_25']
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get configuration for an entity type
 */
export function getEntityConfig(entityType: EntityType): EntityTypeConfig {
  return ENTITY_TYPE_REGISTRY[entityType];
}

/**
 * Get full URL for an entity
 */
export function getEntityUrl(
  entityType: EntityType,
  entityId: string,
  baseUrl?: string
): string {
  const config = getEntityConfig(entityType);
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
  const path = config.urlPattern.replace('{id}', entityId);
  return `${base}${path}`;
}

/**
 * Get all enabled entity types
 */
export function getEnabledEntityTypes(): EntityType[] {
  return (Object.keys(ENTITY_TYPE_REGISTRY) as EntityType[]).filter(
    type => ENTITY_TYPE_REGISTRY[type].enabled
  );
}

/**
 * Get entity types available for a specific phase
 */
export function getEntityTypesForPhase(phase: number): EntityType[] {
  return (Object.keys(ENTITY_TYPE_REGISTRY) as EntityType[]).filter(
    type => ENTITY_TYPE_REGISTRY[type].minPhase <= phase
  );
}

/**
 * Check if entity type is a recommendation (not platform invite)
 */
export function isRecommendationType(entityType: EntityType): boolean {
  return entityType !== 'platform_invite';
}

/**
 * Register or update an entity type configuration
 * Used for dynamic extension in future phases
 */
export function registerEntityType(
  entityType: EntityType,
  config: Partial<EntityTypeConfig>
): void {
  ENTITY_TYPE_REGISTRY[entityType] = {
    ...ENTITY_TYPE_REGISTRY[entityType],
    ...config
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if value is a valid EntityType
 */
export function isEntityType(value: unknown): value is EntityType {
  return typeof value === 'string' && value in ENTITY_TYPE_REGISTRY;
}

/**
 * Check if value is a Phase 1 entity type
 */
export function isPhase1EntityType(value: unknown): value is Phase1EntityType {
  return value === 'user' || value === 'listing' || value === 'event';
}

/**
 * Check if value is a content entity type
 */
export function isContentEntityType(value: unknown): value is ContentEntityType {
  return (
    value === 'article' ||
    value === 'newsletter' ||
    value === 'podcast' ||
    value === 'video' ||
    value === 'guide' ||
    value === 'affiliate_marketer' ||
    value === 'internet_personality'
  );
}
