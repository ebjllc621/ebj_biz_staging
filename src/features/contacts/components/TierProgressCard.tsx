/**
 * TierProgressCard Component
 * Display current tier with progress to next tier
 *
 * Phase 7: Streaks & Tier Progression
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority CLAUDE.md - ErrorBoundary for STANDARD+ components
 */

'use client';

import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { TierBadge } from './TierBadge';
import type { TierStatus } from '../types/reward';

export interface TierProgressCardProps {
  tierStatus: TierStatus;
}

function TierProgressCardInner({ tierStatus }: TierProgressCardProps) {
  const { currentTier, tierInfo, points, nextTier, nextTierInfo, pointsToNextTier, progressPercentage } = tierStatus;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate">Your Tier</h3>
        <TierBadge tier={currentTier} size="medium" />
      </div>

      <div className="space-y-4">
        {/* Current Points */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">Total Points</p>
          <p className="text-2xl font-bold text-gray-900">{points.toLocaleString()}</p>
        </div>

        {/* Progress to Next Tier */}
        {nextTier && nextTierInfo && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">
                Progress to {nextTierInfo.name}
              </p>
              <p className="text-sm text-gray-600">{progressPercentage}%</p>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <p className="text-xs text-gray-600">
              {pointsToNextTier && pointsToNextTier > 0
                ? `${pointsToNextTier.toLocaleString()} points to ${nextTierInfo.name}`
                : `You&apos;ve reached ${nextTierInfo.name}!`}
            </p>
          </div>
        )}

        {/* No Next Tier (Platinum) */}
        {!nextTier && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm font-medium text-purple-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              </span>
              Maximum Tier Reached!
            </p>
            <p className="text-xs text-purple-800 mt-1">You&apos;re at the highest tier level</p>
          </div>
        )}

        {/* Active Perks */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm font-medium text-gray-900 mb-2">Active Perks</p>
          <ul className="space-y-1.5">
            {tierInfo.perks.map((perk, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-5 h-5 rounded bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function TierProgressCard(props: TierProgressCardProps) {
  return (
    <ErrorBoundary>
      <TierProgressCardInner {...props} />
    </ErrorBoundary>
  );
}

export default TierProgressCard;
