/**
 * LoyaltyTierBadge Component
 * Displays user's loyalty tier (Bronze, Silver, Gold, Platinum)
 *
 * @tier SIMPLE
 * @phase Phase 4 - Advanced Features
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import React from 'react';
import type { LoyaltyTier } from '@features/offers/types';

interface LoyaltyTierBadgeProps {
  tier: LoyaltyTier;
  className?: string;
}

/**
 * Loyalty tier badge with tier-specific styling
 * @component
 */
export default function LoyaltyTierBadge({ tier, className = '' }: LoyaltyTierBadgeProps) {
  if (tier === 'new') {
    return null; // Don't show badge for new users
  }

  const tierConfig = {
    bronze: {
      label: 'Bronze',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-300',
      icon: '🥉'
    },
    silver: {
      label: 'Silver',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-400',
      icon: '🥈'
    },
    gold: {
      label: 'Gold',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-400',
      icon: '🥇'
    },
    platinum: {
      label: 'Platinum',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-400',
      icon: '💎'
    },
    new: {
      label: 'New',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-500',
      borderColor: 'border-gray-300',
      icon: ''
    }
  };

  const config = tierConfig[tier];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
      role="status"
      aria-label={`${config.label} loyalty tier`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label} Member</span>
    </div>
  );
}
