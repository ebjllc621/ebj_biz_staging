/**
 * ListingEvents - Hosted Events Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Related Content
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Display up to 4 upcoming events
 * - Date/time prominent display
 * - Location type badges (Physical/Virtual/Hybrid)
 * - Attendee count with capacity
 * - RSVP button (auth-gated)
 * - "View All Events" link
 * - Empty state when no events
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Video, Users, Clock, ExternalLink, Settings } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { Listing } from '@core/services/ListingService';

interface Event {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  location_type: 'physical' | 'virtual' | 'hybrid';
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  virtual_link: string | null;
  banner_image: string | null;
  thumbnail: string | null;
  total_capacity: number | null;
  remaining_capacity: number | null;
  rsvp_count: number;
  ticket_price: number | null;
  is_ticketed: boolean;
  status: 'upcoming' | 'ongoing' | 'ended' | 'cancelled';
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ListingEventsProps {
  /** Listing data */
  listing: Listing;
  isEditMode?: boolean;
}

/**
 * Format event date range
 */
function formatEventDate(start: Date, end: Date): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  const startStr = startDate.toLocaleDateString('en-US', options);

  // If same day, only show time for end
  if (startDate.toDateString() === endDate.toDateString()) {
    const endTime = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${startStr} - ${endTime}`;
  }

  return `${startStr} - ${endDate.toLocaleDateString('en-US', options)}`;
}

/**
 * Format price
 */
function formatPrice(price: number | null, isTicketed: boolean): string {
  if (!isTicketed) return 'RSVP';
  if (price === null || price === 0) return 'Free';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(price);
}

export function ListingEvents({ listing, isEditMode }: ListingEventsProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvpingId, setRsvpingId] = useState<number | null>(null);

  // Fetch events
  useEffect(() => {
    let isMounted = true;

    async function fetchEvents() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/events?listingId=${listing.id}&isUpcoming=true&limit=4`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setEvents(result.data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load events');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Handle RSVP
  const handleRsvp = useCallback(async (eventId: number) => {
    if (!user || user.role === 'visitor') {
      alert('Please sign in to RSVP');
      return;
    }

    setRsvpingId(eventId);

    try {
      const response = await fetchWithCsrf(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to RSVP');
      }

      // Refresh events to update attendee count
      setEvents(prev => prev.map(event =>
        event.id === eventId
          ? { ...event, rsvp_count: event.rsvp_count + 1, remaining_capacity: event.remaining_capacity ? event.remaining_capacity - 1 : null }
          : event
      ));

      alert('RSVP confirmed! Check your email for details.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to RSVP');
    } finally {
      setRsvpingId(null);
    }
  }, [user]);

  // Show empty state in edit mode when no events
  if (isEditMode && !isLoading && events.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Upcoming Events
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No events yet. Create and promote your upcoming events.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/events` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no events
  if (!isLoading && events.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <Calendar className="w-5 h-5 text-biz-orange" />
          Upcoming Events
          {events.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({events.length})
            </span>
          )}
        </h2>

        {events.length > 0 && (
          <a
            href={`/listings/${listing.slug}/events`}
            className="text-sm text-biz-orange hover:text-biz-orange/80 flex items-center gap-1"
          >
            View All
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-32" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
        </div>
      )}

      {/* Events List */}
      {!isLoading && events.length > 0 && (
        <div className="space-y-4">
          {events.map((event) => {
            const isFull = event.total_capacity !== null && event.remaining_capacity !== null && event.remaining_capacity <= 0;
            const locationIcon = {
              physical: MapPin,
              virtual: Video,
              hybrid: MapPin
            }[event.location_type];
            const Icon = locationIcon;

            // Get cover image (prefer thumbnail, fallback to banner)
            const coverImage = event.thumbnail || event.banner_image;

            return (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Cover Image */}
                {coverImage && (
                  <a
                    href={`/events/${event.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative w-full aspect-[16/9] bg-gray-100"
                  >
                    <img
                      src={coverImage}
                      alt={event.title}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                    />
                    {/* Gradient overlay for better badge visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    {/* Date Badge Overlay */}
                    <div className="absolute top-3 left-3 bg-white rounded-lg px-3 py-2 shadow-md">
                      <div className="text-xl font-bold text-biz-orange leading-none">
                        {new Date(event.start_date).getDate()}
                      </div>
                      <div className="text-xs font-semibold text-gray-600 uppercase mt-0.5">
                        {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    {/* Location Type Badge */}
                    <div className="absolute top-3 right-3 bg-white rounded-full px-3 py-1.5 shadow-md">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="capitalize">{event.location_type}</span>
                      </div>
                    </div>
                    {/* Event title overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-semibold text-white text-lg line-clamp-2 drop-shadow-md">
                        {event.title}
                      </h3>
                    </div>
                  </a>
                )}

                <div className={`p-4 ${!coverImage ? 'flex gap-4' : ''}`}>
                  {/* Date Badge (only when no cover image) */}
                  {!coverImage && (
                    <div className="flex-shrink-0 w-16 text-center bg-biz-orange/10 rounded-lg p-2">
                      <div className="text-2xl font-bold text-biz-orange">
                        {new Date(event.start_date).getDate()}
                      </div>
                      <div className="text-xs font-medium text-gray-600 uppercase">
                        {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                  )}

                  {/* Event Details */}
                  <div className={!coverImage ? 'flex-1 min-w-0' : ''}>
                    {/* Title (only when no cover image - title shown on image when present) */}
                    {!coverImage && (
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                        <a
                          href={`/events/${event.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-biz-orange transition-colors"
                        >
                          {event.title}
                        </a>
                      </h3>
                    )}

                    {/* Date/Time */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatEventDate(event.start_date, event.end_date)}</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Icon className="w-4 h-4" />
                      <span>
                        {event.location_type === 'physical' && event.venue_name}
                        {event.location_type === 'virtual' && 'Virtual Event'}
                        {event.location_type === 'hybrid' && `${event.venue_name} + Virtual`}
                      </span>
                    </div>

                    {/* Attendees & Price */}
                    <div className="flex items-center justify-between mt-3">
                      {/* Attendees */}
                      {event.total_capacity !== null && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Users className="w-4 h-4" />
                          <span>
                            {event.rsvp_count} / {event.total_capacity}
                            {isFull && <span className="text-red-600 ml-1">(Full)</span>}
                          </span>
                        </div>
                      )}

                      {/* Price */}
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(event.ticket_price, event.is_ticketed)}
                      </div>
                    </div>

                    {/* RSVP Button */}
                    <button
                      onClick={() => handleRsvp(event.id)}
                      disabled={isFull || rsvpingId === event.id}
                      className="mt-3 w-full px-4 py-2 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {rsvpingId === event.id ? 'Processing...' : isFull ? 'Event Full' : 'RSVP Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ListingEvents;
