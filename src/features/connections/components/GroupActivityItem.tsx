/**
 * GroupActivityItem Component
 * Single activity item display in group activity feed
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component (<100 lines)
 * - Uses avatar utilities from @core/utils/avatar
 * - Client Component ('use client')
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 2, Phase 4C Performance Optimization
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 */

'use client';

import React from 'react';
import Image from 'next/image';
import {
  MessageCircle,
  UserPlus,
  UserMinus,
  BadgeCheck,
  Settings,
  LogIn,
  LogOut
} from 'lucide-react';
import { getAvatarInitials, getAvatarBgColor } from '@core/utils/avatar';
import type { GroupActivity, GroupActivityType } from '../types/group-actions';

export interface GroupActivityItemProps {
  activity: GroupActivity;
  className?: string;
}

const ACTIVITY_ICONS: Record<GroupActivityType, React.ElementType> = {
  message_posted: MessageCircle,
  member_added: UserPlus,
  member_removed: UserMinus,
  listing_recommended: BadgeCheck,
  group_updated: Settings,
  member_joined: LogIn,
  member_left: LogOut,
  member_suggested: UserPlus
};

const ACTIVITY_COLORS: Record<GroupActivityType, string> = {
  message_posted: 'bg-blue-100 text-blue-600',
  member_added: 'bg-green-100 text-green-600',
  member_removed: 'bg-red-100 text-red-600',
  listing_recommended: 'bg-purple-100 text-purple-600',
  group_updated: 'bg-gray-100 text-gray-600',
  member_joined: 'bg-emerald-100 text-emerald-600',
  member_left: 'bg-orange-100 text-orange-600',
  member_suggested: 'bg-indigo-100 text-indigo-600'
};

function formatActivityTime(date: Date): string {
  const now = new Date();
  const activityDate = new Date(date);
  const diffMs = now.getTime() - activityDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return activityDate.toLocaleDateString();
}

function GroupActivityItemComponent({ activity, className = '' }: GroupActivityItemProps) {
  const Icon = ACTIVITY_ICONS[activity.activityType] || MessageCircle;
  const colorClass = ACTIVITY_COLORS[activity.activityType] || 'bg-gray-100 text-gray-600';
  const initials = getAvatarInitials(activity.actorDisplayName, activity.actorUsername);
  const bgColor = getAvatarBgColor(activity.actorAvatarUrl);

  return (
    <div className={`flex gap-3 py-3 ${className}`}>
      {/* Activity Icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {/* Actor Avatar */}
          {activity.actorAvatarUrl ? (
            <Image
              src={activity.actorAvatarUrl}
              alt={activity.actorDisplayName || activity.actorUsername}
              width={20}
              height={20}
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
              style={{ backgroundColor: bgColor }}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              <span className="font-medium">
                {activity.actorDisplayName || activity.actorUsername}
              </span>{' '}
              {activity.title}
            </p>
            {activity.description && (
              <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
            )}
          </div>

          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatActivityTime(activity.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export const GroupActivityItem = React.memo(GroupActivityItemComponent);
GroupActivityItem.displayName = 'GroupActivityItem';
