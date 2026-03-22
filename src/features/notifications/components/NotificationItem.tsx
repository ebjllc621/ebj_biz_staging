/**
 * NotificationItem - Individual notification card
 *
 * @authority docs/notificationService/phases/PHASE_5_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/connections/components/ConnectionCard.tsx
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  Users,
  MessageCircle,
  Star,
  AtSign,
  Bell,
  MoreVertical,
  Check,
  Trash2,
  ExternalLink,
  BadgeCheck
} from 'lucide-react';
import type { NotificationItem as NotificationItemType, NotificationTypeKey } from '../types/notification-ui';
import { NOTIFICATION_TYPE_META } from '../types/notification-ui';

interface NotificationItemProps {
  notification: NotificationItemType;
  onMarkRead?: (id: number) => void;
  onDelete?: (id: number) => void;
}

/**
 * Get icon component for notification type
 */
function getNotificationIcon(type: NotificationTypeKey) {
  const icons = {
    connection_request: Users,
    message: MessageCircle,
    review: Star,
    mention: AtSign,
    system: Bell,
    recommendation: BadgeCheck
  };
  return icons[type] || Bell;
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDelete
}: NotificationItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const typeMeta = NOTIFICATION_TYPE_META[notification.notification_type] || NOTIFICATION_TYPE_META.system;
  const Icon = getNotificationIcon(notification.notification_type);

  const handleMarkRead = () => {
    setIsMenuOpen(false);
    onMarkRead?.(notification.id);
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    onDelete?.(notification.id);
  };

  const handleClick = () => {
    // Mark as read when clicking to navigate
    if (!notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  const content = (
    <article
      className={`relative p-4 rounded-lg border transition-all ${
        notification.is_read
          ? 'bg-white border-gray-200'
          : 'bg-orange-50 border-orange-200 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${typeMeta.bgColor}`}>
          <Icon className={`w-5 h-5 ${typeMeta.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className={`font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
            {notification.title}
          </h3>

          {/* Message */}
          {notification.message && (
            <p className={`text-sm mt-1 line-clamp-2 ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
              {notification.message}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className={`px-2 py-0.5 rounded ${typeMeta.bgColor} ${typeMeta.color}`}>
              {typeMeta.label}
            </span>
            <span>{formatRelativeTime(notification.created_at)}</span>
            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-orange-500" title="Unread" />
            )}
          </div>
        </div>

        {/* Action Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Notification actions"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 z-20 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {!notification.is_read && onMarkRead && (
                  <button
                    onClick={handleMarkRead}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Mark as read
                  </button>
                )}

                {notification.action_url && (
                  <Link
                    href={notification.action_url as Route}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View details
                  </Link>
                )}

                {onDelete && (
                  <>
                    <div className="h-px bg-gray-200 my-1" />
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );

  // Wrap in link if action_url exists
  if (notification.action_url) {
    return (
      <Link
        href={notification.action_url as Route}
        onClick={handleClick}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default NotificationItem;
