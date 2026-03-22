/**
 * WantMoreFeaturesBox - Non-hideable upsell box for sidebar
 *
 * @tier STANDARD
 * @phase Phase 4 - Tier-Based Feature Enforcement
 * @generated DNA v11.4.0
 * @authority docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_4_BRAIN_PLAN.md
 *
 * Displays an upsell box in the sidebar for listings below 'preferred' tier.
 * Shows count of locked features and upgrade CTA. Non-hideable, always visible
 * in edit mode to encourage tier upgrades.
 */

'use client';

import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { ListingTierEnforcer } from '@features/listings/utils/ListingTierEnforcer';
import type { ListingTier } from '@features/listings/types/listing-section-layout';

export interface WantMoreFeaturesBoxProps {
  /** Current listing tier */
  currentTier: ListingTier;
  /** Listing ID for upgrade context */
  listingId: number;
  /** Optional custom CTA text */
  ctaText?: string;
}

/**
 * WantMoreFeaturesBox - Sidebar upsell component
 *
 * Non-hideable upgrade prompt that appears in the sidebar for listings
 * below 'preferred' tier. Encourages users to unlock additional features.
 *
 * @param currentTier - Current subscription tier of the listing
 * @param listingId - Listing ID (for potential context tracking)
 * @param ctaText - Optional custom text for the upgrade button
 * @returns Upsell box or null if tier is 'preferred' or higher
 *
 * @example
 * ```tsx
 * <WantMoreFeaturesBox
 *   currentTier="essentials"
 *   listingId={123}
 *   ctaText="Unlock Premium Features"
 * />
 * ```
 */
export function WantMoreFeaturesBox({
  currentTier,
  listingId,
  ctaText = 'Upgrade Plan'
}: WantMoreFeaturesBoxProps) {
  // Accept listingId for potential future use (Phase 5 context tracking)
  void listingId;

  // Don't show for Preferred or Premium tiers
  if (currentTier === 'preferred' || currentTier === 'premium') {
    return null;
  }

  const lockedFeatures = ListingTierEnforcer.getLockedFeatures(currentTier);
  const recommendation = ListingTierEnforcer.getUpgradeRecommendation(currentTier);

  if (lockedFeatures.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#ed6437] rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Want more features?
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Unlock {lockedFeatures.length} additional feature{lockedFeatures.length !== 1 ? 's' : ''}
            {recommendation && ` with ${ListingTierEnforcer.getTierDisplayName(recommendation.tier)}`}
          </p>
          <Link
            href={"/dashboard/subscription" as Route}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
          >
            <Crown className="w-4 h-4" />
            {ctaText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default WantMoreFeaturesBox;
