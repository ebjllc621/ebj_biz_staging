/**
 * FeatureUpgradeBadge - Small badge indicating tier requirement
 *
 * @tier STANDARD
 * @phase Phase 4 - Tier-Based Feature Enforcement
 * @generated DNA v11.4.0
 * @authority docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_4_BRAIN_PLAN.md
 *
 * Displays a small lock badge showing the required tier for locked features.
 * Used in feature headers to indicate tier restrictions.
 */

'use client';

import { Lock } from 'lucide-react';
import { ListingTierEnforcer } from '@features/listings/utils/ListingTierEnforcer';
import type { ListingTier } from '@features/listings/types/listing-section-layout';

export interface FeatureUpgradeBadgeProps {
  /** Required tier */
  requiredTier: ListingTier;
  /** Size variant */
  size?: 'small' | 'medium';
}

/**
 * FeatureUpgradeBadge - Tier requirement indicator badge
 *
 * Shows a compact badge with lock icon and tier name.
 * Appears in feature headers when a feature is tier-locked.
 *
 * @param requiredTier - The minimum tier required to unlock this feature
 * @param size - Size variant (small or medium)
 * @returns Tier requirement badge
 *
 * @example
 * ```tsx
 * <FeatureUpgradeBadge requiredTier="preferred" size="small" />
 * ```
 */
export function FeatureUpgradeBadge({
  requiredTier,
  size = 'small'
}: FeatureUpgradeBadgeProps) {
  const tierDisplay = ListingTierEnforcer.getTierDisplayName(requiredTier);

  const sizeClasses = {
    small: 'px-1.5 py-0.5 text-[10px]',
    medium: 'px-2 py-1 text-xs'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded font-medium ${sizeClasses[size]}`}
      title={`Requires ${tierDisplay} tier or higher`}
    >
      <Lock className={size === 'small' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {tierDisplay}+
    </span>
  );
}

export default FeatureUpgradeBadge;
