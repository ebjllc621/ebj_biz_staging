/**
 * EventSidebarOtherEvents - Other Upcoming Events at This Business
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1 - Event Detail Page Core
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, ArrowRight } from 'lucide-react';
import type { Event } from '@core/services/EventService';

interface EventSidebarOtherEventsProps {
  listingId: number;
  currentEventId: number;
}

export function EventSidebarOtherEvents({ listingId, currentEventId }: EventSidebarOtherEventsProps) {
  const [otherEvents, setOtherEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOtherEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, currentEventId]);

  const fetchOtherEvents = async () => {
    try {
      const response = await fetch(
        `/api/events?listingId=${listingId}&status=published&isUpcoming=true`,
        {
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        const events = data.data?.data || [];
        // Filter out current event and limit to 3
        setOtherEvents(
          events
            .filter((e: Event) => e.id !== currentEventId)
            .slice(0, 3)
        );
      }
    } catch (error) {
      console.error('Failed to fetch other events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if still loading or no other events
  if (isLoading || otherEvents.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-biz-orange" />
        Other Upcoming Events
      </h4>

      <div className="space-y-2">
        {otherEvents.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.slug}`}
            className="block p-2 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-biz-orange">
                  {event.title}
                </p>
                <p className="text-xs text-gray-500">
                  {new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }).format(new Date(event.start_date))}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-biz-orange flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default EventSidebarOtherEvents;
