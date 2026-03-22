/**
 * StreakCard Component
 * Full streak status display with freeze functionality
 *
 * Phase 7: Streaks & Tier Progression
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority CLAUDE.md - ErrorBoundary for STANDARD+ components
 */

'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { StreakIndicator } from './StreakIndicator';
import type { StreakStatus } from '../types/reward';

export interface StreakCardProps {
  streakStatus: StreakStatus;
  onFreezeUsed?: () => void;
}

function StreakCardInner({ streakStatus, onFreezeUsed }: StreakCardProps) {
  const [isUsingFreeze, setIsUsingFreeze] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUseFreeze = async () => {
    if (isUsingFreeze) return;

    setIsUsingFreeze(true);
    setError(null);

    try {
      const response = await fetch('/api/contacts/rewards/streak/freeze', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to use streak freeze');
      }

      // Success - trigger refresh
      if (onFreezeUsed) {
        onFreezeUsed();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to use streak freeze');
    } finally {
      setIsUsingFreeze(false);
    }
  };

  const { currentStreak, longestStreak, freezesAvailable, daysUntilReset, nextStreakBonus } = streakStatus;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate">Recommendation Streak</h3>
        <StreakIndicator
          streakCount={currentStreak}
          size="large"
          isActive={currentStreak > 0}
        />
      </div>

      <div className="space-y-4">
        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Current Streak</p>
            <p className="text-2xl font-bold text-gray-900">{currentStreak} weeks</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Longest Streak</p>
            <p className="text-2xl font-bold text-gray-900">{longestStreak} weeks</p>
          </div>
        </div>

        {/* Next Streak Bonus */}
        {nextStreakBonus && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm font-medium text-orange-900">Next Bonus</p>
            <p className="text-sm text-orange-800">
              Reach {nextStreakBonus.weeks} weeks for {nextStreakBonus.multiplier}x points!
            </p>
          </div>
        )}

        {/* Streak Freezes */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Streak Freezes</p>
              <p className="text-xs text-gray-600">
                {freezesAvailable} available • Resets in {daysUntilReset} days
              </p>
            </div>
            <button
              onClick={handleUseFreeze}
              disabled={freezesAvailable === 0 || isUsingFreeze}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                freezesAvailable === 0 || isUsingFreeze
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isUsingFreeze ? 'Using...' : 'Use Freeze'}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}

          {freezesAvailable === 0 && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </span>
              No freezes available. They reset monthly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function StreakCard(props: StreakCardProps) {
  return (
    <ErrorBoundary>
      <StreakCardInner {...props} />
    </ErrorBoundary>
  );
}

export default StreakCard;
