/**
 * FeatureLockOverlay - Lock overlay for unavailable features
 *
 * @tier STANDARD
 * @phase Phase 4 - Tier-Based Feature Enforcement
 * @generated DNA v11.4.0
 * @authority docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_4_BRAIN_PLAN.md
 *
 * Displays a semi-transparent overlay with lock icon, tier requirement badge,
 * and upgrade CTA button. Appears over features that are locked due to tier restrictions.
 */

'use client';

import { Lock, Crown } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { ListingTierEnforcer } from '@features/listings/utils/ListingTierEnforcer';
import type { ListingTier } from '@features/listings/types/listing-section-layout';

export interface FeatureLockOverlayProps {
  /** Required tier to unlock */
  requiredTier: ListingTier;
  /** Click handler for upgrade action */
  onUpgradeClick?: () => void;
  /** Feature label for accessibility */
  featureLabel: string;
}

/**
 * FeatureLockOverlay - Semi-transparent lock overlay component
 *
 * Overlays locked features in edit mode, showing tier requirement and upgrade path.
 * Uses Bizconekt orange (#ed6437) for the CTA button matching TierLimitBanner pattern.
 *
 * @param requiredTier - The minimum tier required to unlock this feature
 * @param onUpgradeClick - Optional callback when upgrade is clicked (overrides default link)
 * @param featureLabel - Feature name for accessibility announcements
 * @returns Lock overlay with upgrade CTA
 *
 * @example
 * ```tsx
 * <FeatureLockOverlay
 *   requiredTier="preferred"
 *   featureLabel="Analytics"
 *   onUpgradeClick={() => console.log('Upgrade clicked')}
 * />
 * ```
 */
export function FeatureLockOverlay({
  requiredTier,
  onUpgradeClick,
  featureLabel
}: FeatureLockOverlayProps) {
  const tierDisplay = ListingTierEnforcer.getTierDisplayName(requiredTier);
  const tierColors = ListingTierEnforcer.getTierColorClasses(requiredTier);

  return (
    <div
      className="absolute inset-0 bg-gray-900/60 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center z-10"
      role="status"
      aria-label={`${featureLabel} requires ${tierDisplay} tier or higher`}
    >
      <Lock className="w-6 h-6 text-white mb-2" />
      <span className={`px-2 py-1 rounded text-xs font-semibold border ${tierColors}`}>
        Requires {tierDisplay}+
      </span>
      <Link
        href={"/dashboard/subscription" as Route}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ed6437] text-white rounded text-xs font-medium hover:bg-[#d55a31] transition-colors"
        onClick={(e) => {
          if (onUpgradeClick) {
            e.preventDefault();
            onUpgradeClick();
          }
        }}
      >
        <Crown className="w-3 h-3" />
        Upgrade
      </Link>
    </div>
  );
}

export default FeatureLockOverlay;
