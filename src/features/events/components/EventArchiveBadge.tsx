/**
 * EventArchiveBadge - Banner displayed for past or cancelled events
 *
 * Shows a contextual banner when an event has ended or been cancelled.
 * Purely presentational — no status change logic.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4 - Task 4.8: EventArchiveBadge
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { Clock, XCircle, Users, Star } from 'lucide-react';
import type { EventDetailData } from '@features/events/types';

interface EventArchiveBadgeProps {
  event: EventDetailData;
  reviewCount?: number;
  className?: string;
}

export function EventArchiveBadge({ event, reviewCount, className = '' }: EventArchiveBadgeProps) {
  const isCancelled = event.status === 'cancelled';
  const isPast = !isCancelled && (new Date(event.end_date) < new Date() || event.status === 'completed');

  // Only render for past or cancelled events
  if (!isPast && !isCancelled) {
    return null;
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isCancelled) {
    return (
      <div
        className={`flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg ${className}`}
        role="alert"
      >
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-800">This event was cancelled</p>
          <p className="text-sm text-red-600 mt-0.5">
            We apologize for any inconvenience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg ${className}`}
      role="status"
    >
      <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-yellow-800">This event has ended</p>
        <p className="text-sm text-yellow-700 mt-0.5">
          Ended on {formatDate(event.end_date)}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-2">
          {event.rsvp_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-700">
              <Users className="w-3.5 h-3.5" />
              {event.rsvp_count} {event.rsvp_count === 1 ? 'person' : 'people'} attended
            </span>
          )}
          {reviewCount !== undefined && reviewCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-700">
              <Star className="w-3.5 h-3.5" />
              {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
