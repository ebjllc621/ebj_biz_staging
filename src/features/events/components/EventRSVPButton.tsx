/**
 * EventRSVPButton - State-aware RSVP button component
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 2 - RSVP & Engagement UI
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { Check, Clock } from 'lucide-react';
import type { EventDetailData, EventRSVPStatus } from '@features/events/types';

interface EventRSVPButtonProps {
  event: EventDetailData;
  rsvpStatus: EventRSVPStatus;
  onRSVPClick: () => void;
  onCancelClick: () => void;
  className?: string;
}

export function EventRSVPButton({
  event,
  rsvpStatus,
  onRSVPClick,
  onCancelClick,
  className = ''
}: EventRSVPButtonProps) {
  const isPastEvent = new Date() > new Date(event.end_date);
  const isCancelled = event.status === 'cancelled';
  const isAtCapacity = event.remaining_capacity !== null && event.remaining_capacity <= 0;

  // Past event — disabled gray
  if (isPastEvent) {
    return (
      <button
        disabled
        className={`flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed ${className}`}
      >
        Event Ended
      </button>
    );
  }

  // Cancelled event — disabled red
  if (isCancelled) {
    return (
      <button
        disabled
        className={`flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg bg-red-100 text-red-600 cursor-not-allowed ${className}`}
      >
        Event Cancelled
      </button>
    );
  }

  // RSVP confirmed — green with cancel option
  if (rsvpStatus === 'confirmed') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          disabled
          className="flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white cursor-default"
        >
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>Going</span>
        </button>
        <button
          onClick={onCancelClick}
          className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded underline"
        >
          Cancel RSVP
        </button>
      </div>
    );
  }

  // At capacity — join waitlist
  if (isAtCapacity) {
    return (
      <button
        onClick={onRSVPClick}
        className={`flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors ${className}`}
      >
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span>Join Waitlist</span>
      </button>
    );
  }

  // Default — RSVP Now or Get Tickets
  return (
    <button
      onClick={onRSVPClick}
      className={`flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm bg-biz-orange text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors ${className}`}
    >
      {event.is_ticketed ? 'Get Tickets' : 'RSVP Now'}
    </button>
  );
}

export default EventRSVPButton;
