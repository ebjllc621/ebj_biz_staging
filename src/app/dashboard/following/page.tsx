/**
 * Dashboard Following Page
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useState, useEffect } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { FollowRelationship } from '@features/connections/types';
import Link from 'next/link';
import { ErrorService } from '@core/services/ErrorService';

function FollowingPageContent() {
  const [following, setFollowing] = useState<FollowRelationship[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadFollowing();
  }, [offset]);

  const loadFollowing = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/users/following?limit=${limit}&offset=${offset}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        if (offset === 0) {
          setFollowing(data.following);
        } else {
          setFollowing((prev) => [...prev, ...data.following]);
        }
        setTotal(data.total);
      }
    } catch (error) {
      ErrorService.capture('Failed to load following:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async (followingId: number) => {
    try {
      const response = await fetchWithCsrf('/api/users/follows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: followingId })
      });

      if (response.ok) {
        setFollowing((prev) => prev.filter((f) => f.following_id !== followingId));
        setTotal((prev) => prev - 1);
      }
    } catch (error) {
      ErrorService.capture('Failed to unfollow:', error);
    }
  };

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  const hasMore = following.length < total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Following</h1>
        <p className="text-gray-600 mt-1">
          You are following {total} {total === 1 ? 'person' : 'people'}
        </p>
      </div>

      {/* Following List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {isLoading && following.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : following.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            You are not following anyone yet. Discover people to follow!
          </div>
        ) : (
          following.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <Link
                href={`/profile/${user.following_username}`}
                className="flex items-center gap-3 flex-1"
              >
                {user.following_avatar_url ? (
                  <img
                    src={user.following_avatar_url}
                    alt={user.following_display_name || user.following_username || ''}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-biz-navy to-biz-orange flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user.following_username?.substring(0, 2).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {user.following_display_name || user.following_username}
                  </p>
                  <p className="text-sm text-gray-500">@{user.following_username}</p>
                </div>
              </Link>
              <button
                onClick={() => handleUnfollow(user.following_id)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 hover:text-red-600 hover:border-red-300"
              >
                Unfollow
              </button>
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
      {isLoading && following.length > 0 && (
        <div className="text-center text-gray-500">Loading more...</div>
      )}
    </div>
  );
}

export default function FollowingPage() {
  return (
    <ErrorBoundary componentName="DashboardFollowingPage">
      <FollowingPageContent />
    </ErrorBoundary>
  );
}
