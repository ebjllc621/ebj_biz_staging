/**
 * BadgeDisplay - Achievement badge display component
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 4
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/subscription/components/TierBadge.tsx - Badge pattern
 *
 * Features:
 * - Color-coded by category
 * - Earned/unearned states
 * - Progress indicator for unearned
 * - Tooltip with description
 * - Multiple size variants
 */

'use client';

import React, { memo } from 'react';
import type { BadgeWithStatus, BadgeCategory } from '../types/reward';

interface BadgeDisplayProps {
  badge: BadgeWithStatus;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  className?: string;
}

const categoryColors: Record<BadgeCategory, { earned: string; unearned: string }> = {
  referral: {
    earned: 'bg-blue-100 border-blue-300 text-blue-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  },
  conversion: {
    earned: 'bg-green-100 border-green-300 text-green-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  },
  points: {
    earned: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  },
  special: {
    earned: 'bg-purple-100 border-purple-300 text-purple-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  },
  recommendation: {
    earned: 'bg-orange-100 border-orange-300 text-orange-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  },
  quality: {
    earned: 'bg-pink-100 border-pink-300 text-pink-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  },
  // Phase 6: Category expert badges
  category_expert: {
    earned: 'bg-indigo-100 border-indigo-300 text-indigo-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  },
  // Phase 7: Streak badges
  streak: {
    earned: 'bg-orange-100 border-orange-300 text-orange-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  },
  // Phase 8: Content badges
  content: {
    earned: 'bg-teal-100 border-teal-300 text-teal-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  },
  // Review badges
  review: {
    earned: 'bg-amber-100 border-amber-300 text-amber-800',
    unearned: 'bg-gray-50 border-gray-200 text-gray-400'
  }
};

const sizeClasses = {
  small: 'w-12 h-12 text-lg',
  medium: 'w-16 h-16 text-2xl',
  large: 'w-20 h-20 text-3xl'
};

const textSizeClasses = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base'
};

export const BadgeDisplay = memo(function BadgeDisplay({
  badge,
  size = 'medium',
  showProgress = true,
  className = ''
}: BadgeDisplayProps) {
  const colorClass = badge.earned
    ? categoryColors[badge.category].earned
    : categoryColors[badge.category].unearned;

  return (
    <div
      className={`flex flex-col items-center gap-1 ${className}`}
      title={`${badge.name}: ${badge.description}`}
    >
      {/* Badge Icon Circle */}
      <div
        className={`
          ${sizeClasses[size]} ${colorClass}
          flex items-center justify-center
          rounded-full border-2
          transition-all duration-200
          ${badge.earned ? 'shadow-md' : 'opacity-60'}
        `}
      >
        <span role="img" aria-label={badge.name}>
          {badge.icon}
        </span>
      </div>

      {/* Badge Name */}
      <span
        className={`
          ${textSizeClasses[size]} font-medium text-center
          ${badge.earned ? 'text-gray-900' : 'text-gray-400'}
        `}
      >
        {badge.name}
      </span>

      {/* Progress Bar (for unearned badges) */}
      {!badge.earned && showProgress && badge.progress && (
        <div className="w-full max-w-[60px]">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ed6437] transition-all duration-300"
              style={{ width: `${badge.progress.percentage}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 block text-center mt-0.5">
            {badge.progress.current}/{badge.progress.target}
          </span>
        </div>
      )}

      {/* Earned Date */}
      {badge.earned && badge.earned_at && (
        <span className="text-[10px] text-gray-400">
          {new Date(badge.earned_at).toLocaleDateString()}
        </span>
      )}
    </div>
  );
});

export default BadgeDisplay;
