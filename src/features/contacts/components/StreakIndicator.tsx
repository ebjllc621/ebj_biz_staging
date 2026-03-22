/**
 * StreakIndicator Component
 * Displays streak count with fire icon
 *
 * Phase 7: Streaks & Tier Progression
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import React from 'react';
import { Flame } from 'lucide-react';

export interface StreakIndicatorProps {
  streakCount: number;
  size?: 'small' | 'medium' | 'large';
  isActive?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-xl'
};

const ICON_SIZES = {
  small: { wrapper: 'w-5 h-5', icon: 'w-3 h-3' },
  medium: { wrapper: 'w-6 h-6', icon: 'w-4 h-4' },
  large: { wrapper: 'w-8 h-8', icon: 'w-5 h-5' }
};

export function StreakIndicator({
  streakCount,
  size = 'medium',
  isActive = true,
  className = ''
}: StreakIndicatorProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 font-semibold';
  const sizeClass = SIZE_CLASSES[size];
  const iconSize = ICON_SIZES[size];
  const activeClass = isActive ? 'text-orange-600' : 'text-gray-400';
  const bgClass = isActive ? 'bg-orange-100' : 'bg-gray-100';

  return (
    <span className={`${baseClasses} ${sizeClass} ${activeClass} ${className}`}>
      <span className={`${iconSize.wrapper} rounded ${bgClass} flex items-center justify-center`}>
        <Flame className={iconSize.icon} />
      </span>
      <span>{streakCount}</span>
    </span>
  );
}

export default StreakIndicator;
