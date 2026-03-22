/**
 * EventWaitlistButton - Functional waitlist join/leave with position display
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 8C - Feature Completion
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, Loader2 } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { EventDetailData } from '@features/events/types';

interface EventWaitlistButtonProps {
  event: EventDetailData;
  onJoinWaitlist: () => void;
  className?: string;
}

export function EventWaitlistButton({
  event,
  onJoinWaitlist,
  className = ''
}: EventWaitlistButtonProps) {
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check waitlist status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/events/${event.id}/waitlist`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const d = data?.data || data;
        setIsOnWaitlist(!!d.on_waitlist);
        setPosition(d.position ?? null);
        setTotal(d.total ?? 0);
      } catch {
        // Silently fail
      } finally {
        setIsChecking(false);
      }
    };
    checkStatus();
  }, [event.id]);

  const handleJoin = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/events/${event.id}/waitlist`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      const d = data?.data || data;
      setIsOnWaitlist(true);
      setPosition(d.position ?? null);
      onJoinWaitlist();
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [event.id, onJoinWaitlist]);

  const handleLeave = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/events/${event.id}/waitlist`, { method: 'DELETE' });
      if (!res.ok) return;
      setIsOnWaitlist(false);
      setPosition(null);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [event.id]);

  if (isChecking) {
    return (
      <button
        disabled
        className={`inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-gray-300 text-gray-500 cursor-not-allowed ${className}`}
      >
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
        <span>Checking...</span>
      </button>
    );
  }

  if (isOnWaitlist) {
    return (
      <div className={className}>
        <button
          disabled
          className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white w-full"
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>On Waitlist{position != null ? ` • #${position} of ${total}` : ''}</span>
        </button>
        <button
          onClick={handleLeave}
          disabled={isLoading}
          className="mt-1 text-xs text-gray-500 hover:text-red-500 transition-colors w-full text-center"
        >
          {isLoading ? 'Leaving...' : 'Leave Waitlist'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={isLoading}
      className={`inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors disabled:opacity-50 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
      ) : (
        <Clock className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{isLoading ? 'Joining...' : 'Join Waitlist'}</span>
    </button>
  );
}

export default EventWaitlistButton;
