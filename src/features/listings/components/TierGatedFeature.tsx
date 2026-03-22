/**
 * TierGatedFeature - Universal Tier Gate Wrapper
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Listing Details Tier-Gating Architecture
 * @governance Build Map v2.1 ENHANCED
 *
 * Purpose:
 * - Prevents child components from rendering (and making API calls) if feature unavailable
 * - In edit mode: shows tier-gate placeholder with upgrade prompt
 * - In published mode: returns null (feature hidden)
 *
 * Usage:
 * ```tsx
 * <TierGatedFeature featureId="announcements" listing={listing} isEditing={isEditing}>
 *   <ListingAnnouncements listing={listing} isEditing={isEditing} />
 * </TierGatedFeature>
 * ```
 */
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import {
  isFeatureAvailable,
  FEATURE_METADATA,
  FEATURE_ICONS,
  FEATURE_TITLES,
  type FeatureId,
  type ListingTier
} from '@features/listings/types/listing-section-layout';

interface TierGatedFeatureProps {
  /** Feature ID to check tier availability */
  featureId: FeatureId;
  /** Listing data (contains tier) */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
  /** Children to render if feature is available */
  children: ReactNode;
  /** Optional: Override the placeholder style */
  variant?: 'card' | 'inline' | 'minimal';
}

/**
 * Get tier display name
 */
function getTierDisplayName(tier: ListingTier): string {
  const names: Record<ListingTier, string> = {
    essentials: 'Essentials',
    plus: 'Plus',
    preferred: 'Preferred',
    premium: 'Premium'
  };
  return names[tier];
}

/**
 * TierGatedFeature - Wrapper that prevents rendering if feature unavailable
 */
export function TierGatedFeature({
  featureId,
  listing,
  isEditing = false,
  children,
  variant = 'card'
}: TierGatedFeatureProps) {
  const currentTier = listing.tier || 'essentials';
  const featureAvailable = isFeatureAvailable(featureId, currentTier);

  // Feature is available - render children normally
  if (featureAvailable) {
    return <>{children}</>;
  }

  // Feature NOT available

  // In published mode: hide completely (no placeholder)
  if (!isEditing) {
    return null;
  }

  // In edit mode: show tier-gate placeholder
  const metadata = FEATURE_METADATA[featureId];
  const requiredTier = metadata?.minTier || 'plus';
  const FeatureIcon = FEATURE_ICONS[featureId] || Lock;
  const featureTitle = FEATURE_TITLES[featureId] || 'Feature';

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <Lock className="w-4 h-4" />
        <span>Requires {getTierDisplayName(requiredTier)}+</span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm text-gray-500">{featureTitle}</span>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-200 px-2 py-1 rounded">
          Requires {getTierDisplayName(requiredTier)}+
        </span>
      </div>
    );
  }

  // Default: card variant
  return (
    <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300 relative overflow-hidden">
      {/* Lock overlay */}
      <div className="absolute inset-0 bg-gray-50/50 pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <FeatureIcon className="w-6 h-6 text-gray-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-500">
              {featureTitle}
            </h3>
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-sm text-gray-400 mb-3">
            This feature requires {getTierDisplayName(requiredTier)} tier or higher.
          </p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-biz-orange/10 text-biz-orange text-sm font-medium rounded-md border border-biz-orange/20">
              <Lock className="w-3.5 h-3.5" />
              Requires {getTierDisplayName(requiredTier)}+
            </span>
            <Link
              href="/dashboard/subscription"
              className="text-sm text-biz-navy hover:text-biz-orange transition-colors"
            >
              Upgrade
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TierGatedFeature;
