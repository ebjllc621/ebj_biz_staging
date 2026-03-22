/**
 * EventCardHorizontal - Horizontal event card for list view
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Event Card Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Horizontal variant of EventCard for list view display.
 * Shows thumbnail on left, content on right with event details.
 * Maintains visual consistency with grid EventCard.
 *
 * @see docs/pages/layouts/events/phases/PHASE_4_BRAIN_PLAN.md
 * @see src/features/listings/components/ListingCardHorizontal.tsx - Layout reference
 * @see docs/pages/layouts/events/UX/MobileSearchResultsEvents.jpg - UX reference
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Calendar, MapPin, Star } from 'lucide-react';
import type { EventWithCoordinates } from '@/features/events/types';

interface EventCardHorizontalProps {
  /** Event data with coordinates */
  event: EventWithCoordinates;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format date range for display
 * Returns single date or date range depending on start/end dates
 */
function formatDateRange(startDate: Date, endDate?: Date): string {
  const start = new Date(startDate);
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  };

  const startStr = new Intl.DateTimeFormat('en-US', formatOptions).format(start);

  if (!endDate) {
    return startStr;
  }

  const end = new Date(endDate);

  // If same day, return single date
  if (start.toDateString() === end.toDateString()) {
    return startStr;
  }

  const endStr = new Intl.DateTimeFormat('en-US', formatOptions).format(end);
  return `${startStr} - ${endStr}`;
}

/**
 * EventCardHorizontal component
 * Displays event information in horizontal card format for list view
 */
export function EventCardHorizontal({ event, className = '' }: EventCardHorizontalProps) {
  const location = event.venue_name
    ? event.venue_name
    : [event.city, event.state].filter(Boolean).join(', ');

  const dateRange = formatDateRange(event.start_date, event.end_date);

  return (
    <Link
      href={`/events/${event.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="flex flex-col sm:flex-row bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
        {/* Thumbnail Container */}
        <div className="relative w-full sm:w-32 md:w-40 h-32 sm:h-auto sm:min-h-[120px] flex-shrink-0 bg-gray-100">
          {event.banner_image ? (
            <Image
              src={event.banner_image}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, 160px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500 to-green-700">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          )}

          {/* Rating Badge (placeholder - events don't have ratings yet) */}
          <span className="absolute top-2 right-2 bg-white text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            0.0
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between">
          <div>
            {/* Listing Name */}
            {event.listing_name && (
              <span className="text-xs font-medium uppercase text-biz-orange tracking-wide">
                {event.listing_name}
              </span>
            )}

            {/* Event Title */}
            <h3 className="font-semibold text-biz-navy text-base sm:text-lg mt-1 group-hover:text-biz-orange transition-colors line-clamp-2">
              {event.title}
            </h3>

            {/* Date Range */}
            <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="line-clamp-1">{dateRange}</span>
            </p>

            {/* Location */}
            {location && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="line-clamp-1">{location}</span>
              </p>
            )}
          </div>

          {/* Footer - Ticket Price */}
          {event.is_ticketed && event.ticket_price !== undefined && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-biz-navy">
                ${Number(event.ticket_price).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

export default EventCardHorizontal;
