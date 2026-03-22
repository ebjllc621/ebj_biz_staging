/**
 * FeatureVisibilityBanner - Feature Visibility Status Banner
 *
 * @description Info banner shown in manager pages when feature is hidden or locked
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6 - Dashboard Synchronization
 * @authority docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_6_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme (#ed6437) for listing manager
 * - Shows upgrade CTA for locked features
 * - Shows visibility toggle for hidden features
 * - Route typing with 'next' Route type
 *
 * USAGE:
 * ```tsx
 * <FeatureVisibilityBanner
 *   featureLabel="Contact Info"
 *   isHidden={true}
 *   isLocked={false}
 *   listingId={123}
 *   listingSlug="my-business"
 *   onToggleVisibility={() => toggleFeatureVisibility('contact-info')}
 * />
 * ```
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Eye, EyeOff, Lock, ExternalLink, Crown } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureVisibilityBannerProps {
  /** Feature label */
  featureLabel: string;
  /** Whether feature is hidden in layout */
  isHidden: boolean;
  /** Whether feature is locked by tier */
  isLocked: boolean;
  /** Required tier for locked features */
  requiredTier?: string;
  /** Listing ID for edit link */
  listingId: number;
  /** Listing slug for details page link */
  listingSlug?: string;
  /** Callback to toggle visibility */
  onToggleVisibility?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FeatureVisibilityBanner - Shows visibility status in manager pages
 *
 * Informs users when a feature is hidden or locked, with links to
 * edit visibility settings or upgrade subscription.
 *
 * @param featureLabel - Feature label
 * @param isHidden - Whether feature is hidden
 * @param isLocked - Whether feature is locked
 * @param requiredTier - Required tier for locked features
 * @param listingId - Listing ID for edit link
 * @param listingSlug - Listing slug for details page link
 * @param onToggleVisibility - Callback to toggle visibility
 * @returns Visibility status banner
 *
 * @example
 * ```tsx
 * <FeatureVisibilityBanner
 *   featureLabel="Analytics"
 *   isLocked={true}
 *   requiredTier="professional"
 *   listingId={123}
 * />
 * ```
 */
export function FeatureVisibilityBanner({
  featureLabel,
  isHidden,
  isLocked,
  requiredTier,
  listingSlug,
  onToggleVisibility
}: FeatureVisibilityBannerProps) {
  // Don't show banner if feature is visible and unlocked
  if (!isHidden && !isLocked) return null;

  // Locked by tier
  if (isLocked) {
    return (
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-800">
              Feature Locked
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {featureLabel} requires a <strong>{requiredTier}</strong> subscription or higher.
              This feature won&apos;t be visible on your listing page.
            </p>
            <Link
              href={"/dashboard/subscription" as Route}
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
            >
              <Crown className="w-4 h-4" />
              Upgrade Plan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Hidden by user preference
  return (
    <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-start gap-3">
        <EyeOff className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-800">
            Feature Hidden
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {featureLabel} is currently hidden on your listing page.
            You can still edit it here, but visitors won&apos;t see it.
          </p>
          <div className="flex items-center gap-3 mt-3">
            {onToggleVisibility && (
              <button
                onClick={onToggleVisibility}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Eye className="w-4 h-4" />
                Make Visible
              </button>
            )}
            {listingSlug && (
              <Link
                href={`/listings/${listingSlug}` as Route}
                className="inline-flex items-center gap-2 text-sm text-[#ed6437] hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Edit Layout
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureVisibilityBanner;
