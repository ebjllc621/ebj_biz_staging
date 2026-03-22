/**
 * Layout Migration Utility
 * Handles version upgrades when layout schema changes
 *
 * @tier STANDARD
 * @phase Phase 9 - API & Route Consolidation
 * @authority Phase 9 Brain Plan
 *
 * FEATURES:
 * - Version-based schema migration
 * - Non-destructive feature addition
 * - Layout structure validation
 * - Corrupted layout repair
 * - Backwards compatibility with null layouts
 *
 * USAGE:
 * - migrateLayout(): Apply version upgrades automatically
 * - addMissingFeatures(): Add new features to existing layouts
 * - validateLayout(): Check structural integrity
 * - repairLayout(): Fix corrupted data
 */

import {
  ListingSectionLayout,
  SectionConfig,
  FeatureConfig,
  DEFAULT_LISTING_SECTION_LAYOUT,
  FEATURE_METADATA
} from '@features/listings/types/listing-section-layout';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Current layout schema version
 * Increment this when making breaking changes to layout structure
 */
export const CURRENT_LAYOUT_VERSION = 2;

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Migration map: version -> migration function
 * Each function upgrades layout from version N to N+1
 */
type MigrationFn = (layout: ListingSectionLayout) => ListingSectionLayout;

const MIGRATIONS: Record<number, MigrationFn> = {
  /**
   * v0 -> v1: Initial migration (no-op if version missing)
   * Handles layouts created before versioning system
   */
  0: (layout) => ({
    ...layout,
    version: 1,
    updatedAt: new Date().toISOString()
  }),

  /**
   * v1 -> v2: Feature ID updates (v1 legacy IDs -> v2 current IDs)
   * Maps old feature IDs to new feature IDs per v2 schema
   */
  1: (layout) => {
    const featureIdMap: Record<string, string> = {
      'basic-info': 'quick-facts',
      'tags': 'keywords',
      'business-hours': 'hours',
      'social-media': 'social-links',
      'map': 'sidebar-location',
      'media-gallery': 'gallery',
      'quick-actions': 'sidebar-contact',
      'related-listings': 'affiliated',
      'messaging': 'messages',
      'locations': 'other-locations'
    };

    return {
      ...layout,
      sections: layout.sections.map(s => ({
        ...s,
        features: s.features.map(f => ({
          ...f,
          id: (featureIdMap[f.id] || f.id) as any
        }))
      })),
      version: 2,
      updatedAt: new Date().toISOString()
    };
  }
};

/**
 * Migrate layout to current version
 * Applies sequential migrations from layout.version to CURRENT_LAYOUT_VERSION
 *
 * @param layout - Layout to migrate (may be outdated or null)
 * @returns Migrated layout at current version
 *
 * @example
 * // Migrate v0 layout to v1
 * const oldLayout = { sections: [...], version: 0, updatedAt: '2025-01-01' };
 * const newLayout = migrateLayout(oldLayout);
 * // newLayout.version === 1
 *
 * @example
 * // Null layout returns default
 * const layout = migrateLayout(null);
 * // layout === DEFAULT_LISTING_SECTION_LAYOUT
 */
export function migrateLayout(layout: ListingSectionLayout | null): ListingSectionLayout {
  // Null or undefined layout returns default
  if (!layout) {
    return { ...DEFAULT_LISTING_SECTION_LAYOUT };
  }

  // Already at current version - return as-is
  if (layout.version === CURRENT_LAYOUT_VERSION) {
    return layout;
  }

  // Apply migrations sequentially
  let migratedLayout = { ...layout };
  const startVersion = layout.version || 0;

  for (let v = startVersion; v < CURRENT_LAYOUT_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (migration) {
      migratedLayout = migration(migratedLayout);
    }
  }

  return migratedLayout;
}

// ============================================================================
// FEATURE MANAGEMENT
// ============================================================================

/**
 * Add missing features to layout (non-destructive merge)
 * Called when new features are added to FEATURE_METADATA
 * Preserves user customizations while adding new features
 *
 * @param layout - Existing layout to enhance
 * @returns Layout with missing features added
 *
 * @example
 * // Add 'announcements' feature to existing layouts
 * const enhanced = addMissingFeatures(userLayout);
 * // All existing features preserved, 'announcements' added to 'advanced' section
 */
export function addMissingFeatures(layout: ListingSectionLayout): ListingSectionLayout {
  const updatedSections = layout.sections.map(section => {
    // Get all features that belong to this section
    const sectionFeatures = Object.entries(FEATURE_METADATA)
      .filter(([_, meta]) => meta.section === section.id)
      .map(([id, meta]) => ({ id, ...meta }));

    // Find missing features
    const existingIds = new Set(section.features.map(f => f.id));
    const missing = sectionFeatures.filter(f => !existingIds.has(f.id as any));

    if (missing.length === 0) {
      return section;
    }

    // Add missing features at the end with sequential order
    const maxOrder = Math.max(...section.features.map(f => f.order), -1);
    const newFeatures: FeatureConfig[] = missing.map((f, i) => ({
      id: f.id as any,
      order: maxOrder + 1 + i,
      visible: f.defaultVisible,
      collapsed: f.defaultCollapsed
    }));

    return {
      ...section,
      features: [...section.features, ...newFeatures]
    };
  });

  return {
    ...layout,
    sections: updatedSections,
    updatedAt: new Date().toISOString()
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate layout structure integrity
 * Checks for required fields and valid data types
 *
 * @param layout - Layout to validate
 * @returns Array of validation errors (empty if valid)
 *
 * @example
 * const errors = validateLayout(userLayout);
 * if (errors.length > 0) {
 *   console.error('Layout validation failed:', errors);
 *   // Use repairLayout() to fix
 * }
 */
export function validateLayout(layout: ListingSectionLayout): string[] {
  const errors: string[] = [];

  if (!layout.sections || !Array.isArray(layout.sections)) {
    errors.push('Layout must have sections array');
    return errors; // Cannot continue validation without sections
  }

  if (typeof layout.version !== 'number') {
    errors.push('Layout must have numeric version');
  }

  if (!layout.updatedAt) {
    errors.push('Layout must have updatedAt timestamp');
  }

  // Validate each section
  layout.sections.forEach((section, sIndex) => {
    if (!section.id) {
      errors.push(`Section ${sIndex} missing id`);
    }
    if (typeof section.order !== 'number') {
      errors.push(`Section ${section.id || sIndex} missing order`);
    }
    if (typeof section.visible !== 'boolean') {
      errors.push(`Section ${section.id || sIndex} missing visible flag`);
    }
    if (!Array.isArray(section.features)) {
      errors.push(`Section ${section.id || sIndex} missing features array`);
    } else {
      // Validate features within section
      section.features.forEach((feature, fIndex) => {
        if (!feature.id) {
          errors.push(`Feature ${fIndex} in section ${section.id} missing id`);
        }
        if (typeof feature.order !== 'number') {
          errors.push(`Feature ${feature.id || fIndex} missing order`);
        }
        if (typeof feature.visible !== 'boolean') {
          errors.push(`Feature ${feature.id || fIndex} missing visible flag`);
        }
      });
    }
  });

  return errors;
}

// ============================================================================
// REPAIR
// ============================================================================

/**
 * Create a complete valid layout from partial data
 * Useful for fixing corrupted layouts or handling malformed data
 *
 * @param layout - Partial or corrupted layout
 * @returns Valid, complete layout
 *
 * @example
 * // Fix corrupted layout with missing fields
 * const corrupted = { sections: [...], version: 'invalid' };
 * const fixed = repairLayout(corrupted);
 * // fixed has all required fields with valid types
 */
export function repairLayout(layout: Partial<ListingSectionLayout> | null): ListingSectionLayout {
  if (!layout) {
    return { ...DEFAULT_LISTING_SECTION_LAYOUT };
  }

  // Start with defaults and overlay valid parts
  const repaired: ListingSectionLayout = {
    sections: layout.sections && Array.isArray(layout.sections)
      ? layout.sections
      : DEFAULT_LISTING_SECTION_LAYOUT.sections,
    version: typeof layout.version === 'number'
      ? layout.version
      : CURRENT_LAYOUT_VERSION,
    updatedAt: layout.updatedAt || new Date().toISOString()
  };

  // Apply migration and feature addition to ensure completeness
  return migrateLayout(addMissingFeatures(repaired));
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Export all utilities for use in other components
 * - migrateLayout: Version upgrades
 * - addMissingFeatures: Feature additions
 * - validateLayout: Structure validation
 * - repairLayout: Corrupted data repair
 * - CURRENT_LAYOUT_VERSION: Version constant
 */
