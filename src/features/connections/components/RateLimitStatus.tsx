/**
 * RateLimitStatus - Display current rate limit status for connection requests
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Connect P2 Phase 1
 * @reference src/features/profile/components/ProfileCompletionIndicator.tsx - Pattern source
 *
 * GOVERNANCE:
 * - Client Component ('use client')
 * - Tailwind CSS styling
 * - Compact and full variants
 */

'use client';

import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { RateLimitStatus as RateLimitStatusType } from '../types';

interface RateLimitStatusProps {
  status: RateLimitStatusType;
  variant?: 'compact' | 'full';
}

/**
 * Format time remaining until next available request
 */
function formatTimeRemaining(nextAvailableAt: string | null): string {
  if (!nextAvailableAt) return '';

  const next = new Date(nextAvailableAt);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();

  if (diffMs <= 0) return 'Available now';

  const diffMins = Math.ceil(diffMs / (1000 * 60));
  if (diffMins < 60) return `${diffMins} min`;

  const diffHours = Math.ceil(diffMins / 60);
  return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
}

/**
 * RateLimitStatus component
 * Displays remaining requests and cooldown status
 */
export function RateLimitStatus({
  status,
  variant = 'compact'
}: RateLimitStatusProps) {
  const { canSend, remainingToday, remainingThisWeek, nextAvailableAt, limits } = status;

  // Calculate percentages for progress bars
  const dailyPercent = (remainingToday / limits.perDay) * 100;
  const weeklyPercent = (remainingThisWeek / limits.perWeek) * 100;

  // Determine status color
  const getStatusColor = (percent: number) => {
    if (percent > 50) return 'bg-green-500';
    if (percent > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (variant === 'compact') {
    return (
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm
        ${canSend
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
        }
      `}>
        {canSend ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>{remainingToday} requests remaining today</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4" />
            <span>Available in {formatTimeRemaining(nextAvailableAt)}</span>
          </>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Connection Request Limits</h4>
        {!canSend && (
          <span className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            Rate Limited
          </span>
        )}
      </div>

      {/* Daily Limit */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Today</span>
          <span className="font-medium text-gray-900">
            {remainingToday} / {limits.perDay}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStatusColor(dailyPercent)}`}
            style={{ width: `${dailyPercent}%` }}
          />
        </div>
      </div>

      {/* Weekly Limit */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">This Week</span>
          <span className="font-medium text-gray-900">
            {remainingThisWeek} / {limits.perWeek}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStatusColor(weeklyPercent)}`}
            style={{ width: `${weeklyPercent}%` }}
          />
        </div>
      </div>

      {/* Cooldown Notice */}
      {!canSend && nextAvailableAt && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700 border border-amber-200">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            You can send another request in {formatTimeRemaining(nextAvailableAt)}
          </span>
        </div>
      )}
    </div>
  );
}

export default RateLimitStatus;
