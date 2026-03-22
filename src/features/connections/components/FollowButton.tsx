/**
 * FollowButton - Toggle button for following/unfollowing users
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

interface FollowButtonProps {
  targetUserId: number;
  initialIsFollowing: boolean;
  allowFollows?: boolean; // From target user's privacy settings
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'sm' | 'md';
}

export function FollowButton({
  targetUserId,
  initialIsFollowing,
  allowFollows = true,
  onFollowChange,
  size = 'md'
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // If target doesn't allow follows, don't render
  if (!allowFollows) {
    return null;
  }

  const handleClick = async () => {
    try {
      setIsLoading(true);

      const endpoint = '/api/users/follows';
      const method = isFollowing ? 'DELETE' : 'POST';

      const response = await fetchWithCsrf(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: targetUserId })
      });

      if (response.ok) {
        const newState = !isFollowing;
        setIsFollowing(newState);
        onFollowChange?.(newState);
      }
    } catch (error) {
      ErrorService.capture('Failed to update follow status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1 text-sm'
    : 'px-4 py-2';

  if (isFollowing) {
    // Show "Following" with "Unfollow" on hover
    return (
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
        className={`${sizeClasses} rounded-md border font-medium transition-colors disabled:opacity-50 ${
          isHovered
            ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {isLoading ? '...' : isHovered ? 'Unfollow' : 'Following'}
      </button>
    );
  }

  // Not following - show "Follow" button
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`${sizeClasses} bg-[#ed6437] text-white rounded-md hover:bg-[#d55830] disabled:opacity-50 font-medium`}
    >
      {isLoading ? '...' : 'Follow'}
    </button>
  );
}

export default FollowButton;
