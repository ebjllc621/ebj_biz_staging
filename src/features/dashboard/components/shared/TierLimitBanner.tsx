/**
 * TierLimitBanner - Tier Limit Warning Banner
 *
 * @description Displays tier limit warnings when approaching or at limit
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme for upgrade button (#ed6437)
 * - Shows when approaching limit (80%+) or at limit
 * - Link to upgrade page
 */
'use client';

import React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { AlertCircle, Crown } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface TierLimitBannerProps {
  /** Current count */
  current: number;
  /** Maximum allowed */
  limit: number;
  /** Item type (e.g., "events", "offers") */
  itemType: string;
  /** Current tier (e.g., "essentials") */
  tier: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TierLimitBanner - Tier limit warning banner
 *
 * Shows warning when at 80%+ of limit or at limit.
 *
 * @param current - Current count
 * @param limit - Maximum allowed
 * @param itemType - Item type (e.g., "events")
 * @param tier - Current tier
 * @returns Tier limit banner or null
 *
 * @example
 * ```tsx
 * <TierLimitBanner
 *   current={8}
 *   limit={10}
 *   itemType="events"
 *   tier="plus"
 * />
 * ```
 */
export function TierLimitBanner({
  current,
  limit,
  itemType,
  tier
}: TierLimitBannerProps) {
  const percentage = (current / limit) * 100;
  const remaining = limit - current;

  // Don't show banner if below 80%
  if (percentage < 80) {
    return null;
  }

  // At limit (100%)
  if (current >= limit) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-900 mb-1">
              {itemType.charAt(0).toUpperCase() + itemType.slice(1)} Limit Reached
            </h3>
            <p className="text-sm text-red-700 mb-3">
              You've reached your {tier} tier limit of {limit} {itemType}. Upgrade to add more.
            </p>
            <Link
              href={"/account/subscription" as Route}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
            >
              <Crown className="w-4 h-4" />
              Upgrade Plan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Approaching limit (80-99%)
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-900 mb-1">
            Approaching {itemType.charAt(0).toUpperCase() + itemType.slice(1)} Limit
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            You have {remaining} of {limit} {itemType} remaining in your {tier} tier.
          </p>
          <Link
            href={"/account/subscription" as Route}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
          >
            <Crown className="w-4 h-4" />
            Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TierLimitBanner;
