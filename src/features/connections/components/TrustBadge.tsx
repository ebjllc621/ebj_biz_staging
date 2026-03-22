/**
 * TrustBadge - Visual indicator for user trust score tier
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Connect P2 Phase 3
 * @reference src/features/connections/components/IntentBadge.tsx - Pattern source
 *
 * GOVERNANCE:
 * - Client Component ('use client')
 * - Lucide icons only
 * - Tailwind CSS styling
 */

'use client';

import React from 'react';
import {
  ShieldCheck,
  Shield,
  ShieldAlert
} from 'lucide-react';

interface TrustBadgeProps {
  tier: 'gold' | 'silver' | 'bronze' | 'none';
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

/**
 * Trust badge configuration with icons and colors
 */
const TRUST_BADGE_CONFIG: Record<'gold' | 'silver' | 'bronze', {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  gold: {
    label: 'Trusted',
    icon: ShieldCheck,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
  silver: {
    label: 'Verified',
    icon: Shield,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200'
  },
  bronze: {
    label: 'Active',
    icon: ShieldAlert,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  }
};

/**
 * TrustBadge component
 * Displays user trust tier with icon and optional label
 * Returns null for 'none' tier
 */
export function TrustBadge({
  tier,
  size = 'sm',
  showLabel = true
}: TrustBadgeProps) {
  // Return null for 'none' tier (no badge shown)
  if (tier === 'none') {
    return null;
  }

  const config = TRUST_BADGE_CONFIG[tier];
  const Icon = config.icon;
  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses}
      `}
      title={config.label}
    >
      <Icon className={iconSize} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Export trust badge configuration for use in other components
 */
export { TRUST_BADGE_CONFIG };
export default TrustBadge;
