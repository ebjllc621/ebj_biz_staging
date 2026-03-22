/**
 * BizWireThreadItem - Individual thread row in the thread list
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.4
 * @tier SIMPLE
 */

'use client';

import { getAvatarInitials } from '@core/utils/avatar';
import type { BizWireThread } from '../types';

interface BizWireThreadItemProps {
  thread: BizWireThread;
  isSelected: boolean;
  onClick: () => void;
  /** 'listing' shows sender info, 'user' shows listing info */
  variant: 'listing' | 'user';
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function BizWireThreadItem({ thread, isSelected, onClick, variant }: BizWireThreadItemProps) {
  const hasUnread = Number(thread.unread_count) > 0;
  const subject = thread.subject || 'No subject';
  const preview = thread.last_message_content.length > 80
    ? `${thread.last_message_content.substring(0, 80)}...`
    : thread.last_message_content;

  // listing variant: show sender name + avatar initials
  // user variant: show listing name + listing logo
  const displayName = variant === 'listing'
    ? thread.last_message_sender_name
    : thread.listing_name;

  const avatarInitials = variant === 'listing'
    ? getAvatarInitials(thread.last_message_sender_name)
    : getAvatarInitials(thread.listing_name);

  const avatarContent = variant === 'user' && thread.listing_logo ? (
    <img
      src={thread.listing_logo}
      alt={thread.listing_name}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
    />
  ) : (
    <div className="w-10 h-10 rounded-full bg-[#022641] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-semibold">{avatarInitials}</span>
    </div>
  );

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
        isSelected ? 'bg-orange-50 border-l-2 border-l-orange-400' : ''
      }`}
    >
      {/* Unread dot + Avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        {hasUnread && (
          <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full z-10 border-2 border-white" />
        )}
        {avatarContent}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
            {displayName}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatRelativeDate(thread.last_message_date)}
          </span>
        </div>
        <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
          {subject}
        </p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{preview}</p>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
            thread.status === 'new' ? 'bg-blue-100 text-blue-700' :
            thread.status === 'replied' ? 'bg-green-100 text-green-700' :
            thread.status === 'archived' ? 'bg-gray-100 text-gray-500' :
            'bg-gray-100 text-gray-600'
          }`}>
            {thread.status}
          </span>
          <span className="text-xs text-gray-400">{Number(thread.message_count)} msg{Number(thread.message_count) !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </button>
  );
}
