/**
 * Profile Completion Indicator Component
 *
 * Displays profile completion percentage with progress bar.
 * Supports compact and detailed variants.
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/PHASE_4_REMEDIATION_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated DNA v11.4.0
 */

'use client';

import React from 'react';
import { ProfileCompletionResult } from '../utils/calculateProfileCompletion';

// ============================================================================
// TYPES
// ============================================================================

export interface ProfileCompletionIndicatorProps {
  /** Profile completion result */
  completion: ProfileCompletionResult;
  /** Handler to open edit modal */
  onEditClick?: () => void;
  /** Visual variant */
  variant?: 'compact' | 'detailed';
  /** Whether this is the profile owner viewing */
  isOwner: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProfileCompletionIndicator({
  completion,
  onEditClick,
  variant = 'compact',
  isOwner
}: ProfileCompletionIndicatorProps): React.ReactElement | null {
  // Don't show if profile is complete
  if (completion.percentage >= 100) {
    return null;
  }

  // Don't show if not owner (only owner can edit)
  if (!isOwner) {
    return null;
  }

  // Compact variant (for hero banner)
  if (variant === 'compact') {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Profile Completion</span>
          <span className="text-sm font-bold text-white">{completion.percentage}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-500"
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
        {onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            className="text-xs text-white/80 hover:text-white mt-1 underline transition-colors"
          >
            Improve your profile →
          </button>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-base font-semibold text-[#022641]">Profile Completion</h4>
        <span className="text-lg font-bold text-[#022641]">{completion.percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full h-3 transition-all duration-500"
          style={{ width: `${completion.percentage}%` }}
        />
      </div>
      <div className="text-sm text-gray-600 mb-2">
        {completion.completedRequired}/{completion.totalRequired} required fields completed
      </div>
      <div className="text-sm text-gray-600 mb-3">
        {completion.completedOptional}/{completion.totalOptional} optional fields completed
      </div>
      {onEditClick && (
        <button
          type="button"
          onClick={onEditClick}
          className="w-full px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a2f] transition-colors font-medium text-sm"
        >
          Complete Your Profile
        </button>
      )}
    </div>
  );
}
