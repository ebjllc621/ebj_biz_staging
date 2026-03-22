/**
 * EventCard - Event Display Card for Homepage
 *
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Calendar, MapPin, Users } from 'lucide-react';
import { EventCardData } from '../types';
import { useLCPImagePriority } from '@core/hooks/useLCPImagePriority';

interface EventCardProps {
  /** Event data */
  event: EventCardData;
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
 * Displays event information in a card format for homepage sliders
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
      className={`flex-shrink-0 w-80 snap-start group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Event Image */}
        <div className="relative h-36 w-full bg-gray-100">
          {event.banner_image ? (
            <Image
              src={event.banner_image}
              alt={event.title}
              fill
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 320px"
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
          {/* Event Type */}
          {event.event_type && (
            <span className="text-xs font-medium uppercase text-green-600 tracking-wide">
              {event.event_type}
            </span>
          )}

          {/* Title */}
          <h3 className="font-semibold text-biz-navy mt-1 line-clamp-1 group-hover:text-biz-orange transition-colors">
            {event.title}
          </h3>

          {/* Date */}
          <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatEventDate(event.start_date)}</span>
          </p>

          {/* Location or Host */}
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
