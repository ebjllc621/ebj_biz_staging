/**
 * ListingTierEnforcer - Tier validation and enforcement utilities
 *
 * @tier STANDARD
 * @phase Phase 4 - Tier-Based Feature Enforcement
 * @generated DNA v11.4.0
 * @authority docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_4_BRAIN_PLAN.md
 *
 * Provides static utility methods for tier-based feature availability checking,
 * upgrade recommendations, and tier display metadata.
 */

import {
  ListingTier,
  FeatureId,
  FEATURE_METADATA,
  getTierLevel
} from '@features/listings/types/listing-section-layout';

/**
 * ListingTierEnforcer - Static utility class for tier enforcement
 *
 * Centralizes all tier-related business logic for feature availability,
 * upgrade recommendations, and tier display information.
 */
export class ListingTierEnforcer {
  /**
   * Check if a feature is available for a given tier
   *
   * @param featureId - The feature to check
   * @param tier - The listing tier
   * @returns True if feature is available, false otherwise
   *
   * @example
   * ```typescript
   * const canUseFeature = ListingTierEnforcer.isFeatureAvailable('analytics', 'plus');
   * // Returns false (analytics requires 'preferred')
   * ```
   */
  static isFeatureAvailable(featureId: FeatureId, tier: ListingTier): boolean {
    const metadata = FEATURE_METADATA[featureId];
    if (!metadata) return false;

    return getTierLevel(tier) >= getTierLevel(metadata.minTier);
  }

  /**
   * Get all features locked for a given tier
   *
   * @param tier - The listing tier
   * @returns Array of locked feature IDs
   *
   * @example
   * ```typescript
   * const locked = ListingTierEnforcer.getLockedFeatures('essentials');
   * // Returns ['tags', 'amenities', 'social-media', ...]
   * ```
   */
  static getLockedFeatures(tier: ListingTier): FeatureId[] {
    const allFeatures = Object.keys(FEATURE_METADATA) as FeatureId[];
    return allFeatures.filter(featureId => !this.isFeatureAvailable(featureId, tier));
  }

  /**
   * Get all features available for a given tier
   *
   * @param tier - The listing tier
   * @returns Array of available feature IDs
   *
   * @example
   * ```typescript
   * const available = ListingTierEnforcer.getAvailableFeatures('plus');
   * // Returns ['basic-info', 'description', 'tags', ...]
   * ```
   */
  static getAvailableFeatures(tier: ListingTier): FeatureId[] {
    const allFeatures = Object.keys(FEATURE_METADATA) as FeatureId[];
    return allFeatures.filter(featureId => this.isFeatureAvailable(featureId, tier));
  }

  /**
   * Get the required tier for a feature
   *
   * @param featureId - The feature to check
   * @returns The minimum tier required, or 'essentials' if not found
   *
   * @example
   * ```typescript
   * const requiredTier = ListingTierEnforcer.getRequiredTier('analytics');
   * // Returns 'preferred'
   * ```
   */
  static getRequiredTier(featureId: FeatureId): ListingTier {
    const metadata = FEATURE_METADATA[featureId];
    return metadata?.minTier || 'essentials';
  }

  /**
   * Get upgrade recommendation (next tier that unlocks features)
   *
   * @param currentTier - The current listing tier
   * @returns Upgrade recommendation or null if already at highest tier
   *
   * @example
   * ```typescript
   * const recommendation = ListingTierEnforcer.getUpgradeRecommendation('plus');
   * // Returns { tier: 'preferred', unlockedFeatures: ['seo-settings', 'analytics', 'messaging'] }
   * ```
   */
  static getUpgradeRecommendation(
    currentTier: ListingTier
  ): { tier: ListingTier; unlockedFeatures: FeatureId[] } | null {
    const tierOrder: ListingTier[] = ['essentials', 'plus', 'preferred', 'premium'];
    const currentIndex = tierOrder.indexOf(currentTier);

    // Already at highest tier or invalid tier
    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) return null;

    const nextTier = tierOrder[currentIndex + 1];

    // Type guard: nextTier should always exist based on the check above, but TypeScript needs assurance
    if (!nextTier) return null;

    const currentAvailable = this.getAvailableFeatures(currentTier);
    const nextAvailable = this.getAvailableFeatures(nextTier);

    const unlockedFeatures = nextAvailable.filter(
      featureId => !currentAvailable.includes(featureId)
    );

    return {
      tier: nextTier,
      unlockedFeatures
    };
  }

  /**
   * Get tier display name
   *
   * @param tier - The listing tier
   * @returns Display name for the tier
   *
   * @example
   * ```typescript
   * const displayName = ListingTierEnforcer.getTierDisplayName('plus');
   * // Returns 'Plus'
   * ```
   */
  static getTierDisplayName(tier: ListingTier): string {
    const displayNames: Record<ListingTier, string> = {
      essentials: 'Essentials',
      plus: 'Plus',
      preferred: 'Preferred',
      premium: 'Premium'
    };

    return displayNames[tier] || tier;
  }

  /**
   * Get tier color classes (matches TierBadge.tsx pattern)
   *
   * @param tier - The listing tier
   * @returns Tailwind CSS classes for tier badge styling
   *
   * @example
   * ```typescript
   * const colorClasses = ListingTierEnforcer.getTierColorClasses('preferred');
   * // Returns 'bg-green-100 text-green-800 border-green-300'
   * ```
   */
  static getTierColorClasses(tier: ListingTier): string {
    const colorClasses: Record<ListingTier, string> = {
      essentials: 'bg-gray-100 text-gray-800 border-gray-300',
      plus: 'bg-blue-100 text-blue-800 border-blue-300',
      preferred: 'bg-green-100 text-green-800 border-green-300',
      premium: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };

    return colorClasses[tier] || colorClasses.essentials;
  }
}

// Export standalone functions for functional programming style
export const {
  isFeatureAvailable,
  getLockedFeatures,
  getAvailableFeatures,
  getRequiredTier,
  getUpgradeRecommendation,
  getTierDisplayName,
  getTierColorClasses
} = ListingTierEnforcer;
