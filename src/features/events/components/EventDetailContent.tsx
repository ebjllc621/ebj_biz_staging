/**
 * EventDetailContent - Main content section for event detail page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1 - Event Detail Page Core
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * XSS Prevention: Uses whitespace-pre-wrap for plain text, NOT dangerouslySetInnerHTML
 */
'use client';

import Link from 'next/link';
import { MapPin, Video, Building2, AlertCircle, Car, CloudRain } from 'lucide-react';
import { useEventAnalytics } from '@features/events/hooks/useEventAnalytics';
import type { EventDetailData } from '@features/events/types';

interface EventDetailContentProps {
  event: EventDetailData;
  className?: string;
  eventId?: number;
  rsvpStatus?: string;
}

export function EventDetailContent({ event, className = '', eventId, rsvpStatus }: EventDetailContentProps) {
  const { trackEvent } = useEventAnalytics(eventId ?? event.id);

  const hasPhysicalLocation =
    event.location_type === 'physical' || event.location_type === 'hybrid';

  const hasVirtualLink =
    event.location_type === 'virtual' || event.location_type === 'hybrid';

  const fullAddress = [
    event.venue_name,
    event.address,
    event.city && event.state
      ? `${event.city}, ${event.state}${event.zip ? ` ${event.zip}` : ''}`
      : event.city || event.state
  ]
    .filter(Boolean)
    .join(', ');

  const googleMapsUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Description Section */}
      {event.description && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-biz-navy mb-4">About This Event</h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {event.description}
          </div>
        </section>
      )}

      {/* Event Type Badge Section */}
      {event.event_type && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-biz-navy mb-4">Event Details</h2>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 bg-biz-orange/10 text-biz-orange rounded-full text-sm font-medium">
              {event.event_type}
            </span>
          </div>
        </section>
      )}

      {/* Phase 1C: Additional Event Details (age restrictions, parking, weather) */}
      {(event.age_restrictions || event.parking_notes || event.weather_contingency) && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-biz-navy mb-4">Additional Information</h2>

          {/* Age Restrictions */}
          {event.age_restrictions && (
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900">Age Requirement:</span>{' '}
                {event.age_restrictions}
              </div>
            </div>
          )}

          {/* Parking Notes */}
          {event.parking_notes && (
            <div className={`flex items-start gap-2 text-sm text-gray-700${event.age_restrictions ? ' mt-4' : ''}`}>
              <Car className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900">Parking & Access</span>
                <p className="text-gray-600 mt-1 whitespace-pre-wrap">{event.parking_notes}</p>
              </div>
            </div>
          )}

          {/* Weather Contingency */}
          {event.weather_contingency && (
            <div className={`flex items-start gap-2 text-sm text-gray-700${(event.age_restrictions || event.parking_notes) ? ' mt-4' : ''}`}>
              <CloudRain className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900">Weather Plan</span>
                <p className="text-gray-600 mt-1 whitespace-pre-wrap">{event.weather_contingency}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Physical Location Section */}
      {hasPhysicalLocation && fullAddress && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-biz-navy mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </h2>

          <p className="text-gray-700 mb-4">{fullAddress}</p>

          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('external_click')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white rounded-lg text-sm font-medium hover:bg-biz-navy/90 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Get Directions
            </a>
          )}
        </section>
      )}

      {/* Virtual Event Section */}
      {hasVirtualLink && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-biz-navy mb-4 flex items-center gap-2">
            <Video className="w-5 h-5" />
            {event.location_type === 'hybrid' ? 'Online Access' : 'Virtual Event'}
          </h2>
          {rsvpStatus === 'confirmed' && event.virtual_link ? (
            <div>
              <p className="text-gray-600 text-sm mb-3">
                You&apos;re RSVP&apos;d! Here&apos;s your join link:
              </p>
              <a
                href={event.virtual_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('external_click')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-biz-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                <Video className="w-4 h-4" />
                Join Virtual Event
              </a>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">
              Join link will be available after RSVP. Sign in and RSVP to receive event access details.
            </p>
          )}
        </section>
      )}

      {/* Hosting Business Section */}
      {event.listing_name && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-biz-navy mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Hosted By
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {event.listing_slug ? (
                <Link
                  href={`/listings/${event.listing_slug}`}
                  className="text-lg font-semibold text-gray-900 hover:text-biz-orange transition-colors"
                >
                  {event.listing_name}
                </Link>
              ) : (
                <span className="text-lg font-semibold text-gray-900">
                  {event.listing_name}
                </span>
              )}
              {event.listing_city && event.listing_state && (
                <p className="text-sm text-gray-500 mt-1">
                  {event.listing_city}, {event.listing_state}
                </p>
              )}
            </div>
            {event.listing_slug && (
              <Link
                href={`/listings/${event.listing_slug}`}
                onClick={() => trackEvent('external_click')}
                className="text-sm text-biz-orange hover:text-orange-600 font-medium whitespace-nowrap"
              >
                View Business
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default EventDetailContent;
