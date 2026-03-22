/**
 * EventSidebarFollowButton - Follow Business CTA with notification frequency
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 3 - Event Analytics & Social Sharing
 * @governance Build Map v2.1 ENHANCED
 *
 * Uses event_follows table via /api/events/[id]/follow endpoint.
 * Supports realtime/daily/weekly notification frequency.
 */
'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import type { EventNotificationFrequency } from '@features/events/types';

interface EventSidebarFollowButtonProps {
  listing: Listing;
  eventId: number;
}

const frequencyOptions: { value: EventNotificationFrequency; label: string }[] = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
];

export function EventSidebarFollowButton({ listing, eventId }: EventSidebarFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<EventNotificationFrequency>('realtime');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showFrequency, setShowFrequency] = useState(false);

  // Check follow status on mount
  useEffect(() => {
    fetch(
      `/api/events/${eventId}/follow?follow_type=business&target_id=${listing.id}`,
      { credentials: 'include' }
    )
      .then(res => res.json())
      .then(data => {
        if (data.data?.isFollowing) {
          setIsFollowing(true);
          setFollowId(data.data.followId);
          setFrequency(data.data.frequency || 'realtime');
          setShowFrequency(true);
        }
      })
      .catch(() => { /* silently fail — user may not be authenticated */ });
  }, [eventId, listing.id]);

  const handleFollowToggle = async () => {
    setIsLoading(true);
    try {
      if (isFollowing && followId !== null) {
        await fetch(`/api/events/${eventId}/follow?followId=${followId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        setIsFollowing(false);
        setFollowId(null);
        setShowFrequency(false);
      } else {
        const res = await fetch(`/api/events/${eventId}/follow`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            follow_type: 'business',
            target_id: listing.id,
            frequency
          })
        });
        const data = await res.json();
        if (res.ok && data.data?.followId) {
          setIsFollowing(true);
          setFollowId(data.data.followId);
          setShowFrequency(true);
        } else {
          alert('Please sign in to follow businesses');
        }
      }
    } catch {
      alert('Please sign in to follow businesses');
    } finally {
      setIsLoading(false);
      setIsHovering(false);
    }
  };

  const handleFrequencyChange = async (newFrequency: EventNotificationFrequency) => {
    setFrequency(newFrequency);
    if (!followId) return;

    // Update via follow then re-upsert with new frequency
    try {
      await fetch(`/api/events/${eventId}/follow`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_type: 'business',
          target_id: listing.id,
          frequency: newFrequency
        })
      });
    } catch {
      /* silently fail */
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <button
        onClick={handleFollowToggle}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
          isFollowing
            ? isHovering
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-biz-navy text-white hover:bg-biz-navy/90'
        }`}
      >
        {isFollowing ? (
          <>
            <BellOff className="w-4 h-4" />
            {isHovering ? 'Unfollow?' : 'Following'}
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            Follow Business
          </>
        )}
      </button>

      {/* Notification frequency selector — shown when following */}
      {showFrequency && isFollowing && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">Notification frequency:</p>
          <div className="flex gap-1">
            {frequencyOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleFrequencyChange(option.value)}
                className={`flex-1 text-xs px-2 py-1.5 rounded border transition-colors ${
                  frequency === option.value
                    ? 'bg-biz-navy text-white border-biz-navy'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-biz-navy hover:text-biz-navy'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-2">
        Get notified about new events and updates
      </p>
    </div>
  );
}

export default EventSidebarFollowButton;
