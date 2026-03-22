/**
 * BusinessEventsPreview - Cross-feature component showing upcoming events from a business
 *
 * Used on Job and Offer detail pages to cross-sell upcoming events from the hosting business.
 * Silent fail — returns null when no data so cross-sell is optional.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 7 - Cross-Feature Integration
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Calendar, MapPin, Video, ExternalLink } from 'lucide-react';

interface UpcomingEventPreview {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  location_type: 'physical' | 'virtual' | 'hybrid';
  venue_name: string | null;
}

interface BusinessEventsPreviewProps {
  listingId: number;
  listingName: string | null;
  listingSlug: string | null;
  className?: string;
}

/**
 * Format event date as day number + short month (e.g. "14 Mar")
 */
function formatDateBadge(dateStr: string): { day: string; month: string } {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString('en-US', { day: 'numeric' }),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
  };
}

/**
 * Location icon based on event location_type
 */
function LocationIcon({ type }: { type: 'physical' | 'virtual' | 'hybrid' }) {
  if (type === 'virtual') return <Video className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
  return <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
}

export function BusinessEventsPreview({
  listingId,
  listingName,
  listingSlug,
  className = '',
}: BusinessEventsPreviewProps) {
  const [events, setEvents] = useState<UpcomingEventPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchEvents() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/events?listingId=${listingId}&isUpcoming=true&limit=3`,
          { credentials: 'include' }
        );

        if (!res.ok) {
          if (isMounted) setIsLoading(false);
          return;
        }

        const result = await res.json();
        const eventsArr: UpcomingEventPreview[] =
          result?.data?.data || result?.data?.items || result?.data || [];

        if (isMounted) {
          setEvents(Array.isArray(eventsArr) ? eventsArr.slice(0, 3) : []);
          setIsLoading(false);
        }
      } catch {
        // Silently fail — cross-sell is optional
        if (isMounted) setIsLoading(false);
      }
    }

    fetchEvents();

    return () => {
      isMounted = false;
    };
  }, [listingId]);

  // Return null while loading or when no data
  if (isLoading || events.length === 0) {
    return null;
  }

  return (
    <section className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-biz-navy flex items-center gap-2">
          <Calendar className="w-5 h-5 text-biz-orange" />
          Upcoming Events from {listingName || 'this business'}
        </h2>
        {listingSlug && (
          <Link
            href={`/listings/${listingSlug}/events` as Route}
            className="text-sm text-biz-orange hover:text-orange-600 flex items-center gap-1 transition-colors"
          >
            View All Events <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Event list */}
      <div className="space-y-3">
        {events.map((event) => {
          const { day, month } = formatDateBadge(event.start_date);
          return (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:border-biz-orange hover:shadow-sm transition-all bg-white"
            >
              {/* Date badge */}
              <div className="flex-shrink-0 w-12 h-12 bg-biz-orange/10 rounded-lg flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-biz-orange leading-none">{day}</span>
                <span className="text-xs font-medium text-biz-orange uppercase leading-none mt-0.5">{month}</span>
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <LocationIcon type={event.location_type} />
                  <span className="text-xs text-gray-500 truncate">
                    {event.location_type === 'virtual'
                      ? 'Virtual Event'
                      : event.venue_name || 'Location TBD'}
                  </span>
                </div>
              </div>

              <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
