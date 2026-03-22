/**
 * EventRSVPModal - RSVP confirmation modal with optional ticket selection
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 2 - RSVP & Engagement UI
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState } from 'react';
import { CalendarDays, MapPin, DollarSign } from 'lucide-react';
import { BizModal } from '@/components/ui/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { EventCapacityBar } from './EventCapacityBar';
import { EventTicketSelector } from './EventTicketSelector';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { EventDetailData } from '@features/events/types';

interface EventRSVPModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDetailData;
  onRSVPSuccess: (_rsvp: { id: number; rsvp_status: string }) => void;
  /** Phase 5A: When true, shows "Buy Ticket" button for Stripe checkout */
  allowPurchase?: boolean;
}

/**
 * Format event date for modal display
 */
function formatModalDate(date: Date): string {
  const d = new Date(date);
  const datePart = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
  return `${datePart} at ${timePart}`;
}

/**
 * Format location for display in modal
 */
function formatModalLocation(event: EventDetailData): string {
  if (event.location_type === 'virtual') return 'Virtual Event';
  if (event.location_type === 'hybrid') {
    const physical = event.venue_name || [event.city, event.state].filter(Boolean).join(', ');
    return physical ? `Hybrid — ${physical}` : 'Hybrid Event';
  }
  return event.venue_name || [event.city, event.state].filter(Boolean).join(', ') || 'Location TBD';
}

function EventRSVPModalInner({
  isOpen,
  onClose,
  event,
  onRSVPSuccess,
  allowPurchase = false,
}: EventRSVPModalProps) {
  const { user } = useAuth();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState(false);

  const handleConfirmRSVP = async () => {
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/events/${event.id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: parseInt(user.id), // user.id from useAuth is STRING — must parseInt
          ticket_id: selectedTicketId || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // Map known error codes to user-friendly messages
        const code = data.code || '';
        if (code === 'EVENT_FULL' || data.message?.includes('full') || data.message?.includes('capacity')) {
          setError('This event is at full capacity. Consider joining the waitlist.');
        } else if (code === 'DUPLICATE_RSVP' || data.message?.includes('already')) {
          setError("You've already RSVP'd to this event.");
        } else if (code === 'EVENT_PAST' || data.message?.includes('ended')) {
          setError('This event has already ended.');
        } else if (code === 'EVENT_CANCELLED' || data.message?.includes('cancelled')) {
          setError('This event has been cancelled.');
        } else {
          setError(data.message || 'Failed to complete RSVP. Please try again.');
        }
        return;
      }

      // Success
      setSuccessState(true);
      const rsvp = data.data?.rsvp || { id: 0, rsvp_status: 'confirmed' };
      onRSVPSuccess(rsvp);

      // Auto-close after brief success display
      setTimeout(() => {
        setSuccessState(false);
        onClose();
      }, 1500);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const location = formatModalLocation(event);
  const price = event.is_ticketed
    ? (event.ticket_price ? `$${Number(event.ticket_price).toFixed(2)}` : 'Ticketed')
    : 'Free';

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="RSVP to Event"
      subtitle={event.title}
      size="medium"
    >
      <div className="space-y-5">
        {/* Unauthenticated state */}
        {!user && (
          <div className="text-center py-4">
            <p className="text-gray-700 mb-3">Sign in to RSVP to this event.</p>
            <a
              href={`/auth/sign-in?returnUrl=/events/${event.slug}`}
              className="inline-block px-5 py-2 bg-biz-orange text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Sign In to RSVP
            </a>
          </div>
        )}

        {/* Authenticated state */}
        {user && (
          <>
            {/* Success state */}
            {successState && (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-green-700 font-semibold">You&apos;re going!</p>
                <p className="text-sm text-gray-600 mt-1">RSVP confirmed</p>
              </div>
            )}

            {!successState && (
              <>
                {/* Event summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{formatModalDate(event.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{price}</span>
                  </div>
                </div>

                {/* Ticket selector for ticketed events */}
                {event.is_ticketed && (
                  <EventTicketSelector
                    eventId={event.id}
                    onTicketSelect={setSelectedTicketId}
                    selectedTicketId={selectedTicketId}
                    allowPurchase={allowPurchase}
                    eventSlug={event.slug}
                  />
                )}

                {/* Capacity bar */}
                {event.total_capacity && event.remaining_capacity !== null && (
                  <EventCapacityBar
                    totalCapacity={event.total_capacity}
                    remainingCapacity={event.remaining_capacity}
                    showLabel
                  />
                )}

                {/* Error message */}
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {error}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleConfirmRSVP}
                    disabled={isSubmitting || (event.is_ticketed && !selectedTicketId)}
                    className="w-full py-2.5 px-4 bg-biz-orange text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm RSVP'}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </BizModal>
  );
}

export function EventRSVPModal(props: EventRSVPModalProps) {
  return (
    <ErrorBoundary componentName="EventRSVPModal">
      <EventRSVPModalInner {...props} />
    </ErrorBoundary>
  );
}

export default EventRSVPModal;
