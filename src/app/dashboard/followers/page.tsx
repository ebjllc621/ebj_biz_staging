/**
 * Dashboard Followers Page
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useState, useEffect } from 'react';
import { FollowRelationship } from '@features/connections/types';
import Link from 'next/link';
import { ErrorService } from '@core/services/ErrorService';

function FollowersPageContent() {
  const [followers, setFollowers] = useState<FollowRelationship[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadFollowers();
  }, [offset]);

  const loadFollowers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/users/followers?limit=${limit}&offset=${offset}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        if (offset === 0) {
          setFollowers(data.followers);
        } else {
          setFollowers((prev) => [...prev, ...data.followers]);
        }
        setTotal(data.total);
      }
    } catch (error) {
      ErrorService.capture('Failed to load followers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  const hasMore = followers.length < total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Followers</h1>
        <p className="text-gray-600 mt-1">
          {total} {total === 1 ? 'person' : 'people'} following you
        </p>
      </div>

      {/* Followers List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {isLoading && followers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : followers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No followers yet. Share your profile to get followers!
          </div>
        ) : (
          followers.map((follower) => (
            <div key={follower.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <Link
                href={`/profile/${follower.follower_username}`}
                className="flex items-center gap-3 flex-1"
              >
                {follower.follower_avatar_url ? (
                  <img
                    src={follower.follower_avatar_url}
                    alt={follower.follower_display_name || follower.follower_username || ''}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-biz-navy to-biz-orange flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {follower.follower_username?.substring(0, 2).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {follower.follower_display_name || follower.follower_username}
                  </p>
                  <p className="text-sm text-gray-500">@{follower.follower_username}</p>
                </div>
              </Link>
              <Link
                href={`/profile/${follower.follower_username}`}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                View Profile
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && !isLoading && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Load More
          </button>
        </div>
      )}
      {isLoading && followers.length > 0 && (
        <div className="text-center text-gray-500">Loading more...</div>
      )}
    </div>
  );
}

export default function FollowersPage() {
  return (
    <ErrorBoundary componentName="DashboardFollowersPage">
      <FollowersPageContent />
    </ErrorBoundary>
  );
}
