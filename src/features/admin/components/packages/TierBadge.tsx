/**
 * TierBadge - Display tier with color coding
 *
 * GOVERNANCE COMPLIANCE:
 * - Visual tier indicator
 * - Color-coded by tier level
 * - TIER: SIMPLE
 *
 * @authority docs/packages/phases/PHASE_2_BRAIN_PLAN.md - Section 2.3
 * @component
 */

'use client';

import type { ListingTier } from '@core/types/subscription';

// ============================================================================
// TYPES
// ============================================================================

export interface TierBadgeProps {
  tier: ListingTier;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  const getTierStyles = () => {
    switch (tier) {
      case 'essentials':
        return 'bg-gray-100 text-gray-800';
      case 'plus':
        return 'bg-blue-100 text-blue-800';
      case 'preferred':
        return 'bg-purple-100 text-purple-800';
      case 'premium':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${getTierStyles()} ${className}`}
    >
      {tier}
    </span>
  );
}
