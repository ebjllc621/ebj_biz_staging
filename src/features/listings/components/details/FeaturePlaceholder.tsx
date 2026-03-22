/**
 * FeaturePlaceholder - Placeholder Component for Unimplemented Features
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase R2 - Main Content Edit Mode Integration
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Displays placeholder UI for features that:
 * - Don't have data yet (e.g., testimonials, projects)
 * - Are dashboard-only (e.g., messages, followers)
 * - Haven't been implemented yet
 *
 * In edit mode: Shows feature icon + title + "Configure" button
 * In published mode: Returns null (nothing to show)
 */
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { FeatureId } from '@features/listings/types/listing-section-layout';
import { FEATURE_ICONS, FEATURE_TITLES, FEATURE_METADATA } from '@features/listings/types/listing-section-layout';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FeaturePlaceholderProps {
  /** Feature ID for this placeholder */
  featureId: FeatureId;
  /** Whether the page is in edit mode */
  isEditMode: boolean;
  /** Optional callback when Configure button is clicked */
  onConfigureClick?: () => void;
}

// ============================================================================
// FEATUREPLACEHOLDER COMPONENT
// ============================================================================

/**
 * FeaturePlaceholder - Shows placeholder UI for unimplemented features
 *
 * @example
 * ```tsx
 * <FeaturePlaceholder
 *   featureId="testimonials"
 *   isEditMode={viewMode === 'edit'}
 * />
 * ```
 */
export function FeaturePlaceholder({
  featureId,
  isEditMode,
  onConfigureClick
}: FeaturePlaceholderProps) {
  const router = useRouter();

  // Get feature metadata
  const Icon = FEATURE_ICONS[featureId];
  const title = FEATURE_TITLES[featureId];
  const metadata = FEATURE_METADATA[featureId];

  // Handle configure click
  const handleConfigureClick = useCallback(() => {
    if (onConfigureClick) {
      onConfigureClick();
    } else {
      // Default: Navigate to dashboard settings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push('/dashboard/settings' as any);
    }
  }, [onConfigureClick, router]);

  // In published mode, render nothing
  if (!isEditMode) {
    return null;
  }

  // In edit mode, show placeholder card
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
      <div className="flex items-start gap-4">
        {/* Feature Icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
          {Icon && <Icon className="w-6 h-6 text-gray-400" />}
        </div>

        {/* Feature Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {metadata?.description || 'This feature is not yet configured.'}
          </p>

          {/* Configure Button */}
          <button
            type="button"
            onClick={handleConfigureClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Configure {title}
          </button>
        </div>
      </div>

      {/* Tier Badge (if restricted) */}
      {metadata && metadata.minTier !== 'essentials' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Requires{' '}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
              {metadata.minTier.charAt(0).toUpperCase() + metadata.minTier.slice(1)} Tier
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default FeaturePlaceholder;
