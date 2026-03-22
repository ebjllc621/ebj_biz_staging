/**
 * LoyaltyProgressBar - Progress bar showing advancement to next loyalty tier
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { Star, Target } from 'lucide-react';
import type { LoyaltyTier } from '@features/offers/types';

interface LoyaltyProgressBarProps {
  currentClaims: number;
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  claimsToNextTier: number;
  className?: string;
}

const TIER_THRESHOLDS = {
  bronze: 3,
  silver: 10,
  gold: 25,
  platinum: 50,
};

const TIER_COLORS: Record<LoyaltyTier, string> = {
  new: 'bg-gray-400',
  bronze: 'bg-amber-500',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-purple-500',
};

export function LoyaltyProgressBar({
  currentClaims,
  currentTier,
  nextTier,
  claimsToNextTier,
  className = '',
}: LoyaltyProgressBarProps) {
  const calculateProgress = (): number => {
    if (!nextTier || currentTier === 'platinum') return 100;

    const currentThreshold = currentTier === 'new' ? 0 : TIER_THRESHOLDS[currentTier as keyof typeof TIER_THRESHOLDS];
    const nextThreshold = TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS];
    const range = nextThreshold - currentThreshold;
    const progress = currentClaims - currentThreshold;

    return Math.min(Math.round((progress / range) * 100), 100);
  };

  const progress = calculateProgress();
  const tierColor = nextTier ? TIER_COLORS[nextTier] : TIER_COLORS[currentTier];

  const getTierLabel = (tier: LoyaltyTier): string => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Target className="w-4 h-4" />
          {nextTier ? (
            <span>
              <strong>{claimsToNextTier}</strong> more to {getTierLabel(nextTier)}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              Max tier reached!
            </span>
          )}
        </div>
        <span className="font-medium text-gray-900">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${tierColor} transition-all duration-500 rounded-full`}
          style={{ width: `${progress}%` }}
        />
        {/* Sparkle effect at the end */}
        {progress > 0 && progress < 100 && (
          <div
            className="absolute top-0 h-full w-1 bg-white opacity-50 animate-pulse"
            style={{ left: `${progress}%` }}
          />
        )}
      </div>

      {/* Tier Markers */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>{getTierLabel(currentTier)}</span>
        {nextTier && <span>{getTierLabel(nextTier)}</span>}
      </div>
    </div>
  );
}
