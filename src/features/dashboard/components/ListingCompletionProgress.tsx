/**
 * ListingCompletionProgress - Listing Profile Completion Progress Bar
 *
 * @description Displays listing completeness percentage with styled progress bar
 * @component Client Component
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 6 - Listing Manager Dashboard
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_6_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - White on transparent design for use in orange gradient hero
 * - Simple progress bar with percentage display
 *
 * USAGE:
 * Used in ListingManagerDashboard hero section to show profile completeness.
 */
'use client';

import React from 'react';

export interface ListingCompletionProgressProps {
  /** Completion percentage (0-100) */
  percentage: number;
}

/**
 * ListingCompletionProgress Component
 *
 * Simple progress bar designed for dark backgrounds (orange gradient hero).
 * Shows "Profile Completion" label with percentage.
 *
 * @param percentage - Completion percentage (0-100)
 * @returns Progress bar component
 *
 * @example
 * ```tsx
 * <ListingCompletionProgress percentage={75} />
 * ```
 */
export function ListingCompletionProgress({
  percentage
}: ListingCompletionProgressProps) {
  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between text-white text-sm">
        <span className="font-medium">Profile Completion</span>
        <span className="font-bold">{percentage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-white h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Profile completion: ${percentage}%`}
        />
      </div>
    </div>
  );
}

export default ListingCompletionProgress;
