/**
 * Listings Utilities - Barrel Export
 *
 * @phase Phase 9 - API & Route Consolidation
 * @purpose Central export point for all listing utility functions
 *
 * EXPORTS:
 * - Layout Migration: Version upgrades and feature management
 * - Tier Enforcement: Tier-based feature access control
 * - Completeness Calculation: Listing profile completion scoring
 */

// ============================================================================
// LAYOUT MIGRATION (Phase 9)
// ============================================================================

/**
 * Layout version migration and management utilities
 * @see src/features/listings/utils/layoutMigration.ts
 */
export {
  migrateLayout,
  addMissingFeatures,
  validateLayout,
  repairLayout,
  CURRENT_LAYOUT_VERSION
} from './layoutMigration';

// ============================================================================
// TIER ENFORCEMENT
// ============================================================================

/**
 * Listing tier-based feature access control
 * @see src/features/listings/utils/ListingTierEnforcer.ts
 */
export { ListingTierEnforcer } from './ListingTierEnforcer';

// ============================================================================
// COMPLETENESS CALCULATION
// ============================================================================

/**
 * Calculate listing profile completion percentage
 * @see src/features/listings/utils/calculateListingCompleteness.ts
 */
export { calculateListingCompleteness } from './calculateListingCompleteness';
