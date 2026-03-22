/**
 * ContentSubscribeCard - Sidebar widget for following/subscribing to content
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Content Subscribe Card
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier4_Phases/PHASE_4_CONTENT_SUBSCRIBE_CARD.md
 * @reference src/features/events/components/EventSidebarFollowButton.tsx
 */

'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { ContentFollowButton } from './ContentFollowButton';
import type { ContentFollowType } from '@core/types/content-follow';

interface ContentSubscribeCardProps {
  /** Type of follow — determines card heading and description text */
  followType: ContentFollowType;
  /** Target entity ID (null for all_content) */
  targetId: number | null;
  /** Display name for the target (business name, category name, etc.) */
  targetName: string;
  /** Optional content type filter (e.g., 'articles', 'podcasts') */
  contentTypeFilter?: string | null;
  /** Callback when follow state changes */
  onFollowChange?: (_isFollowing: boolean) => void;
  /** Additional CSS classes for outer card container */
  className?: string;
}

function getHeading(followType: ContentFollowType, contentTypeFilter?: string | null): string {
  switch (followType) {
    case 'business':
      return 'Stay Updated';
    case 'newsletter':
      return 'Subscribe';
    case 'podcast_show':
      return 'Follow Podcast';
    case 'content_type':
      return `Follow ${contentTypeFilter ?? 'Content'}`;
    case 'all_content':
      return 'Follow All Content';
    case 'category':
      return 'Follow Category';
    case 'marketer_profile':
      return 'Follow Marketer';
    case 'personality_profile':
      return 'Follow Creator';
    case 'podcaster_profile':
      return 'Follow Podcaster';
  }
}

function getDescription(
  followType: ContentFollowType,
  targetName: string,
  contentTypeFilter?: string | null
): string {
  switch (followType) {
    case 'business':
      return `Follow ${targetName} to get notified when they publish new content.`;
    case 'newsletter':
      return `Subscribe to ${targetName}'s newsletter for updates delivered to your inbox.`;
    case 'podcast_show':
      return 'Follow this podcast to get notified about new episodes.';
    case 'content_type':
      return `Get notified when new ${contentTypeFilter ?? 'content'} are published.`;
    case 'all_content':
      return 'Get notified about all new content published on the platform.';
    case 'category':
      return `Follow this category to discover new content in ${targetName}.`;
    case 'marketer_profile':
      return `Follow ${targetName} to see their latest campaigns and recommendations.`;
    case 'personality_profile':
      return `Follow ${targetName} to stay updated on their latest content.`;
    case 'podcaster_profile':
      return `Follow ${targetName} to get notified about new episodes and updates.`;
  }
}

function formatFollowerCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export function ContentSubscribeCard({
  followType,
  targetId,
  targetName,
  contentTypeFilter = null,
  onFollowChange,
  className
}: ContentSubscribeCardProps) {
  const [followerCount, setFollowerCount] = useState<number | null>(null);

  useEffect(() => {
    if (targetId === null && followType !== 'all_content') return;

    const params = new URLSearchParams({ follow_type: followType });
    if (targetId !== null) params.set('target_id', String(targetId));

    fetch(`/api/content/follow/count?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setFollowerCount(data.data.count);
      })
      .catch(() => {
        // silently fail — count is optional enhancement
      });
  }, [followType, targetId]);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5${className ? ` ${className}` : ''}`}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {getHeading(followType, contentTypeFilter)}
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        {getDescription(followType, targetName, contentTypeFilter)}
      </p>

      <div className="w-full">
        <ContentFollowButton
          followType={followType}
          targetId={targetId}
          targetName={targetName}
          contentTypeFilter={contentTypeFilter}
          onFollowChange={onFollowChange}
          size="md"
        />
      </div>

      {followerCount !== null && followerCount > 0 && (
        <p className="text-xs text-gray-400 text-center mt-3">
          <Users className="w-3 h-3 inline mr-1" />
          {formatFollowerCount(followerCount)} {followerCount === 1 ? 'follower' : 'followers'}
        </p>
      )}
    </div>
  );
}

export default ContentSubscribeCard;
