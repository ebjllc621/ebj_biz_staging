/**
 * ContentFollowButton - Follow/subscribe button for content entities
 *
 * @tier SIMPLE
 * @phase Phase 3 - Follow Button and Hook
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier4_Phases/PHASE_3_FOLLOW_BUTTON_AND_HOOK.md
 * @reference src/features/offers/components/OfferFollowButton.tsx
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useContentFollow } from '@features/content/hooks/useContentFollow';
import type { ContentFollowType, ContentNotificationFrequency } from '@core/types/content-follow';

interface ContentFollowButtonProps {
  /** Type of follow (business, category, content_type, all_content, newsletter, etc.) */
  followType: ContentFollowType;
  /** Target ID (null for all_content) */
  targetId: number | null;
  /** Display name for the target */
  targetName: string;
  /** Optional content type filter */
  contentTypeFilter?: string | null;
  /** Initial follow state */
  initialIsFollowing?: boolean;
  /** Initial notification frequency */
  initialFrequency?: ContentNotificationFrequency;
  /** Callback when follow state changes */
  onFollowChange?: (_isFollowing: boolean) => void;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
}

export function ContentFollowButton({
  followType,
  targetId,
  targetName,
  contentTypeFilter = null,
  initialIsFollowing = false,
  initialFrequency = 'daily',
  onFollowChange,
  size = 'md'
}: ContentFollowButtonProps) {
  const { follows, follow, isLoading, toggleFollow, updateFrequency } = useContentFollow(
    followType,
    targetId,
    contentTypeFilter
  );

  const [isHovered, setIsHovered] = useState(false);
  const [showFrequencyMenu, setShowFrequencyMenu] = useState(false);
  const [localFrequency, setLocalFrequency] = useState<ContentNotificationFrequency>(initialFrequency);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync frequency from hook once follow is loaded
  useEffect(() => {
    if (follow?.notificationFrequency) {
      setLocalFrequency(follow.notificationFrequency);
    }
  }, [follow?.notificationFrequency]);

  // Notify parent on follow state change (skip initial render)
  const prevFollowsRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevFollowsRef.current !== null && prevFollowsRef.current !== follows) {
      onFollowChange?.(follows);
    }
    prevFollowsRef.current = follows;
  }, [follows, onFollowChange]);

  // Sync initial state if hook hasn't loaded yet
  const isFollowing = isLoading && prevFollowsRef.current === null
    ? initialIsFollowing
    : follows;

  const handleFollow = async () => {
    await toggleFollow(localFrequency);
  };

  const handleUnfollow = async () => {
    await toggleFollow();
  };

  const handleFrequencyChange = async (newFrequency: ContentNotificationFrequency) => {
    setShowFrequencyMenu(false);
    setLocalFrequency(newFrequency);
    if (isFollowing) {
      await updateFrequency(newFrequency);
    }
  };

  const getFollowLabel = () => {
    if (followType === 'newsletter') return `Subscribe to ${targetName}`;
    if (followType === 'all_content') return 'Follow All Content';
    return `Follow ${targetName}`;
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg'
  }[size];

  if (!isFollowing) {
    // Not following - show single orange button
    return (
      <div className="relative">
        <button
          onClick={handleFollow}
          disabled={isLoading}
          className={`${sizeClasses} flex items-center gap-2 bg-[#ed6437] text-white rounded-md hover:bg-[#d55830] disabled:opacity-50 font-medium transition-colors`}
        >
          <Bell className="w-4 h-4" />
          <span>
            {isLoading
              ? followType === 'newsletter' ? 'Subscribing...' : 'Following...'
              : getFollowLabel()}
          </span>
        </button>
      </div>
    );
  }

  // Following - show split button (toggle + frequency dropdown)
  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-2">
        <button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleUnfollow}
          disabled={isLoading}
          className={`${sizeClasses} flex items-center gap-2 rounded-l-md border font-medium transition-colors disabled:opacity-50 ${
            isHovered
              ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {isHovered ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          <span>
            {isLoading
              ? '...'
              : isHovered
                ? followType === 'newsletter' ? 'Unsubscribe' : 'Unfollow'
                : followType === 'newsletter' ? 'Subscribed' : 'Following'}
          </span>
        </button>

        <button
          onClick={() => setShowFrequencyMenu(!showFrequencyMenu)}
          disabled={isLoading}
          className={`${sizeClasses} rounded-r-md border border-l-0 font-medium transition-colors disabled:opacity-50 ${
            isHovered
              ? 'bg-red-50 border-red-300 text-red-600'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          ▼
        </button>
      </div>

      {showFrequencyMenu && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 px-2 py-1">Notification Frequency</div>
            <button
              onClick={() => handleFrequencyChange('realtime')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                localFrequency === 'realtime'
                  ? 'bg-[#ed6437] text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="font-medium">Realtime</div>
              <div className="text-xs opacity-80">Notify immediately</div>
            </button>
            <button
              onClick={() => handleFrequencyChange('daily')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                localFrequency === 'daily'
                  ? 'bg-[#ed6437] text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="font-medium">Daily</div>
              <div className="text-xs opacity-80">Once per day digest</div>
            </button>
            <button
              onClick={() => handleFrequencyChange('weekly')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                localFrequency === 'weekly'
                  ? 'bg-[#ed6437] text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="font-medium">Weekly</div>
              <div className="text-xs opacity-80">Once per week digest</div>
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showFrequencyMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowFrequencyMenu(false)}
        />
      )}
    </div>
  );
}

export default ContentFollowButton;
