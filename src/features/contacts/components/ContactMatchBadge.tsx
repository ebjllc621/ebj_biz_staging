/**
 * ContactMatchBadge - Badge showing contact match status
 *
 * Displays whether a contact matches a Bizconekt user with
 * appropriate actions (Connect, Pending, Connected).
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 5
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/subscription/components/TierBadge.tsx - Badge pattern
 */

'use client';

import React, { memo } from 'react';
import { UserCheck, UserPlus, Clock, Users, Loader2 } from 'lucide-react';
import type { ContactMatchResult, MatchStatusDisplay } from '../types/matching';
import { getAvatarInitials } from '@core/utils/avatar';

interface ContactMatchBadgeProps {
  /** Match result for the contact */
  matchResult: ContactMatchResult | null;
  /** Callback when Connect button is clicked */
  onConnect?: (userId: number) => void;
  /** Whether a connection request is being sent */
  isConnecting?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show detailed info */
  showDetails?: boolean;
}

/**
 * Get display status from match result
 */
function getDisplayStatus(result: ContactMatchResult | null): MatchStatusDisplay {
  if (!result || !result.isMatched) return 'none';

  if (result.matchedUser?.isAlreadyConnected) return 'connected';
  if (result.matchedUser?.hasPendingRequest) return 'pending';
  if (result.confidence === 'high') return 'member';
  if (result.confidence === 'medium') return 'may_know';

  return 'none';
}

const statusConfig: Record<MatchStatusDisplay, {
  label: string;
  icon: React.ElementType;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  member: {
    label: 'Bizconekt Member',
    icon: UserCheck,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  may_know: {
    label: 'May Know',
    icon: Users,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  connected: {
    label: 'Connected',
    icon: UserCheck,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200'
  },
  pending: {
    label: 'Request Pending',
    icon: Clock,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200'
  },
  none: {
    label: '',
    icon: Users,
    bgColor: '',
    textColor: '',
    borderColor: ''
  }
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

export const ContactMatchBadge = memo(function ContactMatchBadge({
  matchResult,
  onConnect,
  isConnecting = false,
  size = 'sm',
  showDetails = false
}: ContactMatchBadgeProps) {
  const status = getDisplayStatus(matchResult);

  // Don't render if no match
  if (status === 'none' || !matchResult?.isMatched) {
    return null;
  }

  const config = statusConfig[status];
  const Icon = config.icon;
  const user = matchResult.matchedUser;

  const canConnect = status === 'member' || status === 'may_know';

  return (
    <div className="flex items-center gap-2">
      {/* Status Badge */}
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full border
          ${config.bgColor} ${config.textColor} ${config.borderColor}
          ${sizeClasses[size]}
        `}
      >
        <Icon className={iconSizes[size]} />
        <span className="font-medium">{config.label}</span>
      </span>

      {/* Connect Button (for member/may_know status) */}
      {canConnect && onConnect && user && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConnect(user.id);
          }}
          disabled={isConnecting}
          className={`
            inline-flex items-center gap-1.5 rounded-full
            bg-[#ed6437] text-white hover:bg-[#d5582f]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors min-h-[32px] min-w-[32px]
            ${sizeClasses[size]}
          `}
          title={`Connect with ${user.display_name || user.username}`}
        >
          {isConnecting ? (
            <Loader2 className={`${iconSizes[size]} animate-spin`} />
          ) : (
            <>
              <UserPlus className={iconSizes[size]} />
              <span>Connect</span>
            </>
          )}
        </button>
      )}

      {/* Detailed User Info (optional) */}
      {showDetails && user && (
        <div className="flex items-center gap-2 ml-2 text-xs text-gray-500">
          {/* Mini Avatar */}
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name || user.username}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-medium"
              style={{ backgroundColor: user.avatar_bg_color || '#022641' }}
            >
              {getAvatarInitials(user.display_name, user.username)}
            </div>
          )}
          <span>@{user.username}</span>
        </div>
      )}
    </div>
  );
});

export default ContactMatchBadge;
