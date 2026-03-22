/**
 * JobSidebarFollowButton - Follow Business CTA
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Jobs Phase R2
 */
'use client';

import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface JobSidebarFollowButtonProps {
  listing: Listing;
}

export function JobSidebarFollowButton({ listing }: JobSidebarFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowToggle = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await fetch(`/api/listings/${listing.id}/follow`, {
          method: 'DELETE',
          credentials: 'include'
        });
        setIsFollowing(false);
      } else {
        await fetch(`/api/listings/${listing.id}/follow`, {
          method: 'POST',
          credentials: 'include'
        });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Failed to update follow status:', error);
      alert('Please sign in to follow businesses');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <button
        onClick={handleFollowToggle}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
          isFollowing
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-biz-navy text-white hover:bg-biz-navy/90'
        }`}
      >
        {isFollowing ? (
          <>
            <BellOff className="w-4 h-4" />
            Following
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            Follow Business
          </>
        )}
      </button>
      <p className="text-xs text-gray-500 text-center mt-2">
        Get notified about new jobs and updates
      </p>
    </div>
  );
}

export default JobSidebarFollowButton;
