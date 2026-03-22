/**
 * Listing Completion Indicator Component
 *
 * Displays listing completion percentage with progress bar.
 * Supports compact and detailed variants.
 *
 * @authority docs/pages/layouts/listings/details/claim/phases/PHASE_6_BRAIN_PLAN.md
 * @tier SIMPLE
 * @phase Phase 6 - Listing Completeness Indicator
 * @reference src/features/profile/components/ProfileCompletionIndicator.tsx
 */

'use client';

import React from 'react';
import type { ListingCompletionResult } from '../../utils/calculateListingCompleteness';

// ============================================================================
// TYPES
// ============================================================================

export interface ListingCompletionIndicatorProps {
  /** Listing completion result */
  completion: ListingCompletionResult;
  /** Handler to open edit modal */
  onEditClick?: () => void;
  /** Visual variant */
  variant?: 'compact' | 'detailed';
  /** Whether this is the listing owner viewing */
  isOwner: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get progress bar color based on completion percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-yellow-500';
  if (percentage >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ListingCompletionIndicator({
  completion,
  onEditClick,
  variant = 'compact',
  isOwner
}: ListingCompletionIndicatorProps): React.ReactElement | null {
  // Don't show if listing is complete
  if (completion.percentage >= 100) {
    return null;
  }

  // Don't show if not owner (only owner can edit)
  if (!isOwner) {
    return null;
  }

  const progressColor = getProgressColor(completion.percentage);

  // Compact variant (for hero banner overlay)
  if (variant === 'compact') {
    const missingRequiredCount = completion.missingRequired.length;
    const missingMessage = missingRequiredCount > 0
      ? `Complete your listing (${missingRequiredCount} required field${missingRequiredCount > 1 ? 's' : ''} missing)`
      : 'Complete your listing';

    return (
      <div className="bg-gray-100 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#022641]">Listing Completion</span>
          <span className="text-sm font-bold text-[#022641]">{completion.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className={`${progressColor} rounded-full h-2 transition-all duration-500`}
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
        {onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            className="text-xs text-[#022641]/80 hover:text-[#022641] underline transition-colors"
          >
            {missingMessage} →
          </button>
        )}
      </div>
    );
  }

  // Detailed variant (for dashboard/management pages)
  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-base font-semibold text-[#022641]">Listing Completion</h4>
        <span className="text-lg font-bold text-[#022641]">{completion.percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div
          className={`${progressColor} rounded-full h-3 transition-all duration-500`}
          style={{ width: `${completion.percentage}%` }}
        />
      </div>
      <div className="text-sm text-gray-600 mb-2">
        {completion.completedRequired}/{completion.totalRequired} required fields completed
      </div>
      <div className="text-sm text-gray-600 mb-3">
        {completion.completedOptional}/{completion.totalOptional} optional fields completed
      </div>
      {completion.missingRequired.length > 0 && (
        <div className="bg-white/60 rounded-lg p-3 mb-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Missing Required Fields:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            {completion.missingRequired.slice(0, 3).map((field) => (
              <li key={field.key} className="flex items-center gap-2">
                <span className="w-1 h-1 bg-orange-500 rounded-full" />
                {field.label}
              </li>
            ))}
            {completion.missingRequired.length > 3 && (
              <li className="text-gray-500 italic">
                +{completion.missingRequired.length - 3} more...
              </li>
            )}
          </ul>
        </div>
      )}
      {onEditClick && (
        <button
          type="button"
          onClick={onEditClick}
          className="w-full px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a2f] transition-colors font-medium text-sm"
        >
          Complete Your Listing
        </button>
      )}
    </div>
  );
}
