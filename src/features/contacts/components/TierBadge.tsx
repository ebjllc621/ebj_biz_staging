/**
 * TierBadge Component
 * Displays user tier with icon and color
 *
 * Phase 7: Streaks & Tier Progression
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import React from 'react';
import { Medal, Award, Crown, Gem } from 'lucide-react';
import type { Tier } from '../types/reward';
import { TIER_DEFINITIONS } from '../types/reward';

export interface TierBadgeProps {
  tier: Tier;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  small: 'text-sm px-2 py-1',
  medium: 'text-base px-3 py-1.5',
  large: 'text-lg px-4 py-2'
};

const ICON_SIZES = {
  small: 'w-4 h-4',
  medium: 'w-5 h-5',
  large: 'w-6 h-6'
};

// Lucide icon mapping per tier (replaces emoji)
const TIER_ICONS: Record<Tier, typeof Medal> = {
  bronze: Medal,
  silver: Medal,
  gold: Crown,
  platinum: Gem
};

export function TierBadge({
  tier,
  size = 'medium',
  showName = true,
  className = ''
}: TierBadgeProps) {
  const tierInfo = TIER_DEFINITIONS[tier];
  const baseClasses = 'inline-flex items-center gap-2 rounded-full font-semibold';
  const sizeClass = SIZE_CLASSES[size];
  const iconSizeClass = ICON_SIZES[size];
  const TierIcon = TIER_ICONS[tier];

  // Tier-specific styling
  const tierStyles: Record<Tier, string> = {
    bronze: 'bg-orange-100 text-orange-900 border-2 border-orange-300',
    silver: 'bg-gray-100 text-gray-900 border-2 border-gray-400',
    gold: 'bg-yellow-100 text-yellow-900 border-2 border-yellow-400',
    platinum: 'bg-purple-100 text-purple-900 border-2 border-purple-400'
  };

  const tierStyle = tierStyles[tier];

  return (
    <span className={`${baseClasses} ${sizeClass} ${tierStyle} ${className}`}>
      <TierIcon className={iconSizeClass} />
      {showName && <span>{tierInfo.name}</span>}
    </span>
  );
}

export default TierBadge;
