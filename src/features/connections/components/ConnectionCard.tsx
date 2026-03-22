/**
 * ConnectionCard - User connection card for Connections page
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Connect System Remediation
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @avatar-governance AVATAR_DISPLAY_GOVERNANCE.md
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Displays user connection information with avatar, profile details,
 * connection metadata, and action menu for managing connections.
 *
 * @see docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECT_SYSTEM_REMEDIATION_BRAIN_PLAN.md
 * @see src/features/events/components/EventCard.tsx - Card pattern reference
 * @reference src/features/profile/components/ProfileHeroBanner.tsx:135-150 - Avatar display pattern
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { MoreVertical, MessageCircle, UserMinus, ExternalLink, Users, Send } from 'lucide-react';
import type { UserConnection } from '../types';
import { getAvatarInitials } from '@/core/utils/avatar';
import { FollowButton } from './FollowButton';

interface ConnectionCardProps {
  /** Connection data with user profile information */
  connection: UserConnection;
  /** Callback when remove connection is triggered */
  onRemove?: () => void;
  /** Callback when send message is triggered (future feature) */
  onMessage?: () => void;
  /** Callback when recommend is triggered - recommend this connection to others */
  onRecommend?: () => void;
  /** Whether to show action menu */
  showActions?: boolean;
  /** Whether to show follow button (optional - for receiving updates from connected users) */
  showFollowButton?: boolean;
  /** Initial follow state (required if showFollowButton is true) */
  initialIsFollowing?: boolean;
  /** Callback when follow state changes */
  onFollowChange?: (isFollowing: boolean) => void;
}

/**
 * Format date for "connected since" display
 */
function formatConnectedDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(date));
}

/**
 * ConnectionCard component
 * Displays connection information in a card format
 */
export function ConnectionCard({
  connection,
  onRemove,
  onMessage,
  onRecommend,
  showActions = true,
  showFollowButton = false,
  initialIsFollowing = false,
  onFollowChange
}: ConnectionCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const displayName = connection.display_name || connection.username;

  const handleRemoveClick = () => {
    setIsMenuOpen(false);
    onRemove?.();
  };

  const handleMessageClick = () => {
    setIsMenuOpen(false);
    onMessage?.();
  };

  const handleRecommendClick = () => {
    setIsMenuOpen(false);
    onRecommend?.();
  };

  return (
    <article className="relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Link
          href={`/profile/${connection.username}` as Route}
          className="flex-shrink-0"
        >
          {connection.avatar_url && !imageError ? (
            <img
              src={connection.avatar_url}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
              style={{ backgroundColor: connection.avatar_bg_color || '#022641' }}
            >
              <span className="text-white font-semibold text-lg">
                {getAvatarInitials(connection.display_name, connection.username)}
              </span>
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and Username */}
          <Link
            href={`/profile/${connection.username}` as Route}
            className="group"
          >
            <h3 className="font-semibold text-biz-navy group-hover:text-biz-orange transition-colors">
              {displayName}
            </h3>
            <p className="text-sm text-gray-500">@{connection.username}</p>
          </Link>

          {/* Connection Type Badge */}
          {connection.connection_type && (
            <span className="inline-block mt-2 text-xs font-medium uppercase text-biz-orange bg-orange-50 px-2 py-1 rounded">
              {connection.connection_type}
            </span>
          )}

          {/* Connection Metadata */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
            {/* Connected Since */}
            <span>
              Connected since {formatConnectedDate(connection.connected_since)}
            </span>

            {/* Mutual Connections */}
            {connection.mutual_connections > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {connection.mutual_connections} mutual
              </span>
            )}
          </div>

          {/* Follow Button (optional - for receiving updates from connected users) */}
          {showFollowButton && (
            <div className="mt-3">
              <FollowButton
                targetUserId={connection.user_id}
                initialIsFollowing={initialIsFollowing}
                onFollowChange={onFollowChange}
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Action Menu */}
        {showActions && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Connection actions"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsMenuOpen(false)}
                />

                {/* Menu Items */}
                <div className="absolute right-0 top-10 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  {/* View Profile */}
                  <Link
                    href={`/profile/${connection.username}` as Route}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Profile
                  </Link>

                  {/* Send Message */}
                  <button
                    onClick={handleMessageClick}
                    disabled={!onMessage}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${
                      onMessage
                        ? 'text-gray-700 hover:bg-gray-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    title={onMessage ? 'Send a message' : 'Messaging feature coming soon'}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send Message
                  </button>

                  {/* Recommend Connection */}
                  <button
                    onClick={handleRecommendClick}
                    disabled={!onRecommend}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${
                      onRecommend
                        ? 'text-gray-700 hover:bg-gray-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    title={onRecommend ? 'Recommend this connection to others' : 'Recommend feature'}
                  >
                    <Send className="w-4 h-4" />
                    Recommend
                  </button>

                  {/* Divider */}
                  <div className="h-px bg-gray-200 my-1" />

                  {/* Remove Connection */}
                  {onRemove && (
                    <button
                      onClick={handleRemoveClick}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                      Remove Connection
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default ConnectionCard;
