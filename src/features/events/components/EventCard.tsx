/**
 * EventCard - Grid view event card for Events page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Event Card Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Grid variant of event card extending homepage EventCard pattern.
 * Displays event information with image, badges, and key details.
 * Includes days until badge, capacity indicator, and event type.
 *
 * @see docs/pages/layouts/events/phases/PHASE_4_BRAIN_PLAN.md
 * @see src/features/homepage/components/EventCard.tsx - Base pattern reference
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Calendar, MapPin, Users, RefreshCw } from 'lucide-react';
import type { EventWithCoordinates } from '@/features/events/types';
import { useLCPImagePriority } from '@core/hooks/useLCPImagePriority';

interface EventCardProps {
  /** Event data with coordinates */
  event: EventWithCoordinates;
  /** Additional CSS classes */
  className?: string;
  /** Index in grid for LCP optimization */
  index?: number;
}

/**
 * Calculate days until event
 */
function getDaysUntil(date: Date): number {
  const now = new Date();
  const eventDate = new Date(date);
  const diffTime = eventDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Format date for display
 */
function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date));
}

/**
 * EventCard component
 * Displays event information in a card format for grid view
 */
export function EventCard({ event, className = '', index = 0 }: EventCardProps) {
  const { priority } = useLCPImagePriority({ layout: 'grid', index });
  const daysUntil = getDaysUntil(event.start_date);
  const location = event.venue_name
    ? event.venue_name
    : [event.city, event.state].filter(Boolean).join(', ');

  return (
    <Link
      href={`/events/${event.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Event Image */}
        <div className="relative h-40 w-full bg-gray-100">
          {event.banner_image ? (
            <Image
              src={event.banner_image}
              alt={event.title}
              fill
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500 to-green-700">
              <Calendar className="w-12 h-12 text-white" />
            </div>
          )}

          {/* Days Until Badge */}
          <span className="absolute top-3 left-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
          </span>

          {/* Recurring Badge — Phase 3B */}
          {event.is_recurring && !event.parent_event_id && (
            <span className="absolute bottom-3 left-3 bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Recurring
            </span>
          )}

          {/* Part of Series Badge (child instance) — Phase 3B */}
          {event.parent_event_id && (
            <span className="absolute bottom-3 left-3 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Series
            </span>
          )}

          {/* Capacity Badge */}
          {event.remaining_capacity !== undefined && event.remaining_capacity > 0 && (
            <span className="absolute top-3 right-3 bg-white text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Users className="w-3 h-3" />
              {event.remaining_capacity} spots
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Listing Name */}
          {event.listing_name && (
            <span className="text-xs font-medium uppercase text-biz-orange tracking-wide">
              {event.listing_name}
            </span>
          )}

          {/* Title */}
          <h3 className="font-semibold text-biz-navy mt-1 line-clamp-2 group-hover:text-biz-orange transition-colors">
            {event.title}
          </h3>

          {/* Date */}
          <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatEventDate(event.start_date)}</span>
          </p>

          {/* Location */}
          {location && (
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="line-clamp-1">{location}</span>
            </p>
          )}

          {/* Ticket Price */}
          {event.is_ticketed && event.ticket_price !== undefined && (
            <p className="text-sm font-medium text-biz-navy mt-2">
              ${Number(event.ticket_price).toFixed(2)}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

export default EventCard;
