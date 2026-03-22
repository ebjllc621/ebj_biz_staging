/**
 * ThreadItem - Individual thread row component
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_4_DASHBOARD_MESSAGES_BRAIN_PLAN.md
 * @reference src/app/dashboard/connections/page.tsx - Connection item pattern
 *
 * FEATURES:
 * - Avatar display with fallback
 * - Display name / username
 * - Last message preview (truncated)
 * - Relative timestamp
 * - Unread badge indicator
 * - Selected state styling
 * - Hover effects
 */

'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { MessageThread } from '../types';

interface ThreadItemProps {
  thread: MessageThread;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Format timestamp as relative time
 * @param date - Date to format
 * @returns Formatted time string
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const messageDate = new Date(date);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Truncate text to max length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function ThreadItem({ thread, isSelected, onSelect }: ThreadItemProps) {
  const isGroup = thread.is_group_thread === true;
  const displayName = isGroup
    ? (thread.group_name || thread.other_display_name || thread.other_username)
    : (thread.other_display_name || thread.other_username);
  const avatarUrl = thread.other_avatar_url;
  const hasUnread = thread.unread_count > 0;
  const groupColor = thread.group_color || '#3B82F6';

  return (
    <div
      onClick={onSelect}
      className={`p-4 cursor-pointer transition-colors border-l-4 ${
        isSelected
          ? 'bg-orange-50 border-orange-500'
          : hasUnread
          ? 'hover:bg-orange-50'
          : 'bg-white border-transparent hover:bg-gray-50'
      }`}
      style={hasUnread && !isSelected ? { borderLeftColor: '#ed6437' } : undefined}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isGroup ? (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: groupColor + '20' }}
            >
              <Users className="w-6 h-6" style={{ color: groupColor }} />
            </div>
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isSelected ? 'bg-orange-200' : 'bg-orange-100'
            }`}>
              <span className="text-lg font-semibold text-orange-600">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Thread info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={`font-medium truncate ${hasUnread ? 'font-bold text-gray-900' : 'text-gray-900'}`}>
              {displayName}
            </p>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {formatTimestamp(thread.last_message_at)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <p className={`text-sm truncate ${hasUnread ? 'font-medium text-gray-700' : 'text-gray-500'}`}>
              {truncate(thread.last_message_content, 50)}
            </p>

            {/* Unread badge */}
            {hasUnread && (
              <span className="flex-shrink-0 ml-2 min-w-[24px] h-5 px-2 text-white text-xs font-bold rounded-full flex items-center justify-center" style={{ backgroundColor: '#ed6437' }}>
                {thread.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
