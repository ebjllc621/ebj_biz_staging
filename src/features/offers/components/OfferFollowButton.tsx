/**
 * OfferFollowButton - Follow button for business/category from offer context
 *
 * @tier SIMPLE
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 * @reference src/features/connections/components/FollowButton.tsx
 */

'use client';

import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';
import type { NotificationFrequency } from '@features/offers/types';

interface OfferFollowButtonProps {
  /** Type of follow (business or category) */
  followType: 'business' | 'category';
  /** Target ID (listing_id or category_id) */
  targetId: number;
  /** Display name for the target */
  targetName: string;
  /** Initial follow state */
  initialIsFollowing: boolean;
  /** Initial notification frequency */
  initialFrequency?: NotificationFrequency;
  /** Callback when follow state changes */
  onFollowChange?: (_isFollowing: boolean) => void;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
}

export function OfferFollowButton({
  followType,
  targetId,
  targetName,
  initialIsFollowing,
  initialFrequency = 'realtime',
  onFollowChange,
  size = 'md'
}: OfferFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [frequency, setFrequency] = useState<NotificationFrequency>(initialFrequency);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showFrequencyMenu, setShowFrequencyMenu] = useState(false);

  const handleFollow = async () => {
    try {
      setIsLoading(true);

      const response = await fetchWithCsrf('/api/user/offer-follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_type: followType,
          target_id: targetId,
          frequency
        })
      });

      if (response.ok) {
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      ErrorService.capture('Failed to follow for offers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    try {
      setIsLoading(true);

      // First, get the follow ID
      const checkResponse = await fetchWithCsrf(
        `/api/user/offer-follows/check?type=${followType}&target=${targetId}`,
        { method: 'GET' }
      );

      if (checkResponse.ok) {
        const data = await checkResponse.json();
        const followId = data.data?.follow?.id;

        if (followId) {
          const deleteResponse = await fetchWithCsrf(`/api/user/offer-follows/${followId}`, {
            method: 'DELETE'
          });

          if (deleteResponse.ok) {
            setIsFollowing(false);
            onFollowChange?.(false);
          }
        }
      }
    } catch (error) {
      ErrorService.capture('Failed to unfollow for offers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFrequencyChange = async (newFrequency: NotificationFrequency) => {
    try {
      setIsLoading(true);
      setShowFrequencyMenu(false);

      const response = await fetchWithCsrf('/api/user/offer-follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_type: followType,
          target_id: targetId,
          frequency: newFrequency
        })
      });

      if (response.ok) {
        setFrequency(newFrequency);
      }
    } catch (error) {
      ErrorService.capture('Failed to update frequency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg'
  }[size];

  if (!isFollowing) {
    // Not following - show "Follow" button
    return (
      <div className="relative">
        <button
          onClick={handleFollow}
          disabled={isLoading}
          className={`${sizeClasses} flex items-center gap-2 bg-[#ed6437] text-white rounded-md hover:bg-[#d55830] disabled:opacity-50 font-medium transition-colors`}
        >
          <Bell className="w-4 h-4" />
          <span>{isLoading ? 'Following...' : `Follow ${followType === 'business' ? targetName : 'Category'}`}</span>
        </button>
      </div>
    );
  }

  // Following - show "Following" with frequency dropdown
  return (
    <div className="relative">
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
          <span>{isLoading ? '...' : isHovered ? 'Unfollow' : 'Following'}</span>
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
                frequency === 'realtime'
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
                frequency === 'daily'
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
                frequency === 'weekly'
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

export default OfferFollowButton;
