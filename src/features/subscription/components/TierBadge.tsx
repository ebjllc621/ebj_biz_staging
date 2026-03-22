/**
 * TierBadge - Visual tier indicator component
 *
 * Displays color-coded badge for subscription tiers:
 * - Essentials: Gray
 * - Plus: Blue
 * - Preferred: Green
 * - Premium: Gold
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

import { ListingTier } from '@core/types/subscription';

export interface TierBadgeProps {
  tier: ListingTier | string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * TierBadge - Color-coded subscription tier indicator
 *
 * @param {TierBadgeProps} props - Component props
 * @returns {JSX.Element} Rendered tier badge
 *
 * @example
 * ```tsx
 * <TierBadge tier="premium" size="medium" />
 * ```
 */
export function TierBadge({ tier, size = 'medium', className = '' }: TierBadgeProps) {
  const tierLower = String(tier).toLowerCase();

  // Color mapping
  const colorClasses = {
    essentials: 'bg-gray-100 text-gray-800 border-gray-300',
    plus: 'bg-blue-100 text-blue-800 border-blue-300',
    preferred: 'bg-green-100 text-green-800 border-green-300',
    premium: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };

  // Size mapping
  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base'
  };

  // Display names
  const displayNames = {
    essentials: 'Essentials',
    plus: 'Plus',
    preferred: 'Preferred',
    premium: 'Premium'
  };

  const colorClass = colorClasses[tierLower as keyof typeof colorClasses] || colorClasses.essentials;
  const sizeClass = sizeClasses[size];
  const displayName = displayNames[tierLower as keyof typeof displayNames] || tier;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded border ${colorClass} ${sizeClass} ${className}`}
    >
      {displayName}
    </span>
  );
}
