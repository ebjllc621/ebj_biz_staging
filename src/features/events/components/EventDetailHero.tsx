/**
 * EventDetailHero - Hero section for event detail page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1 - Event Detail Page Core
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, DollarSign, Clock, CalendarDays, Share2, Star, CalendarPlus, ExternalLink, Flag } from 'lucide-react';
import type { EventDetailData, EventRSVPStatus, EventSponsor } from '@features/events/types';
import { RecommendButton } from '@features/sharing/components/RecommendButton';
import { useEventAnalytics } from '@features/events/hooks/useEventAnalytics';
import { GalleryDisplay } from '@features/media/gallery';
import type { GalleryItem } from '@features/media/gallery';
import { EventCapacityBar } from './EventCapacityBar';
import { EventRSVPButton } from './EventRSVPButton';
import { EventSaveButton } from './EventSaveButton';
import { EventSponsorBadge } from './EventSponsorBadge';

interface EventDetailHeroProps {
  event: EventDetailData;
  onRSVPClick: () => void;
  onSaveClick: () => void;
  onShareClick: () => void;
  isSaved?: boolean;
  initialSaved?: boolean;
  rsvpStatus?: EventRSVPStatus;
  onCancelRSVP?: () => void;
  className?: string;
  onRecommendSuccess?: () => void;
  /** Phase 5: Title sponsor for badge display below event title */
  titleSponsor?: EventSponsor | null;
  /** Phase 5 Gap-Fill: Callback to open the report modal */
  onReportClick?: () => void;
  /** Media items for hero carousel (from event_media table) */
  mediaItems?: GalleryItem[];
}

/**
 * Format event date and time for display
 * e.g. "Sat, Jun 8, 2026 at 7:00 PM"
 */
function formatEventDate(date: Date): string {
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
 * Calculate event duration as human-readable string
 * e.g. "3 hours", "2 days", "1 hour 30 min"
 */
function formatEventDuration(start: Date, end: Date): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diffMs = endMs - startMs;

  if (diffMs <= 0) return 'TBD';

  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (diffDays > 0) {
    return remainingHours > 0
      ? `${diffDays} day${diffDays !== 1 ? 's' : ''} ${remainingHours}h`
      : `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    return remainingMinutes > 0
      ? `${diffHours}h ${remainingMinutes}min`
      : `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  return `${diffMinutes} min`;
}

/**
 * Calculate days until event
 */
function getDaysUntil(date: Date): number {
  const now = new Date();
  const eventDate = new Date(date);
  const diffMs = eventDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format price for display
 */
function formatPrice(isTicketed: boolean, price: number | string | null): string {
  if (!isTicketed) return 'Free';
  if (price === null || price === 0) return 'Free';
  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice === 0) return 'Free';
  return `$${numPrice.toFixed(2)}`;
}

/**
 * Format location text based on location_type
 */
function formatLocation(
  locationType: EventDetailData['location_type'],
  venueName: string | null,
  city: string | null,
  state: string | null
): string {
  if (locationType === 'virtual') return 'Virtual Event';
  if (locationType === 'hybrid') {
    const physical = venueName || [city, state].filter(Boolean).join(', ');
    return physical ? `Hybrid — ${physical}` : 'Hybrid Event';
  }
  return venueName || [city, state].filter(Boolean).join(', ') || 'Location TBD';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function EventDetailHero({
  event,
  onRSVPClick,
  onSaveClick,
  onShareClick,
  isSaved = false,
  initialSaved,
  rsvpStatus = 'none',
  onCancelRSVP,
  className = '',
  onRecommendSuccess,
  titleSponsor = null,
  onReportClick,
  mediaItems = [],
}: EventDetailHeroProps) {
  void onSaveClick; // onSaveClick kept in interface for backward compat; EventSaveButton handles saves directly
  const daysUntil = getDaysUntil(event.start_date);
  const location = formatLocation(
    event.location_type,
    event.venue_name,
    event.city,
    event.state
  );

  // Capacity badge color
  let capacityBadgeClass = 'bg-green-100 text-green-800';
  if (event.total_capacity && event.remaining_capacity !== null) {
    const ratio = event.remaining_capacity / event.total_capacity;
    if (ratio < 0.2) capacityBadgeClass = 'bg-red-100 text-red-800';
    else if (ratio < 0.5) capacityBadgeClass = 'bg-yellow-100 text-yellow-800';
  }

  // Days until badge text
  let daysUntilText = '';
  if (daysUntil < 0) {
    daysUntilText = 'Past Event';
  } else if (daysUntil === 0) {
    daysUntilText = 'Today!';
  } else if (daysUntil === 1) {
    daysUntilText = 'Tomorrow';
  } else {
    daysUntilText = `In ${daysUntil} days`;
  }

  const { trackEvent } = useEventAnalytics(event.id);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Banner: Carousel (multiple media) or single image fallback */}
      {mediaItems.length > 0 ? (
        <div className="relative w-full">
          <GalleryDisplay
            items={mediaItems}
            layout="carousel"
            enableLightbox={true}
            showFeaturedBadge={false}
            entityName={event.title}
          />

          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-20 pointer-events-none">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${
              daysUntil === 0
                ? 'bg-biz-orange text-white'
                : daysUntil < 0
                  ? 'bg-gray-600 text-white'
                  : 'bg-white text-biz-navy'
            }`}>
              {daysUntilText}
            </span>
            {event.is_featured && (
              <span className="flex items-center gap-1 px-2 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-semibold shadow-sm">
                <Star className="w-3 h-3 fill-yellow-900" />
                Featured
              </span>
            )}
          </div>

          {/* Capacity badge (bottom right) */}
          {event.total_capacity && event.remaining_capacity !== null && (
            <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${capacityBadgeClass}`}>
                {event.remaining_capacity} spots left
              </span>
            </div>
          )}
        </div>
      ) : event.banner_image ? (
        <div className="relative h-48 lg:h-64 w-full">
          <Image
            src={event.banner_image}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 66vw"
            priority
          />

          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${
              daysUntil === 0
                ? 'bg-biz-orange text-white'
                : daysUntil < 0
                  ? 'bg-gray-600 text-white'
                  : 'bg-white text-biz-navy'
            }`}>
              {daysUntilText}
            </span>
            {event.is_featured && (
              <span className="flex items-center gap-1 px-2 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-semibold shadow-sm">
                <Star className="w-3 h-3 fill-yellow-900" />
                Featured
              </span>
            )}
          </div>

          {/* Capacity badge (bottom right) */}
          {event.total_capacity && event.remaining_capacity !== null && (
            <div className="absolute bottom-3 right-3">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${capacityBadgeClass}`}>
                {event.remaining_capacity} spots left
              </span>
            </div>
          )}
        </div>
      ) : null}

      {/* Capacity Bar — below banner, above content */}
      {event.total_capacity && event.remaining_capacity !== null && (
        <EventCapacityBar
          totalCapacity={event.total_capacity}
          remainingCapacity={event.remaining_capacity}
          showLabel
          className="mx-6 mt-4"
        />
      )}

      <div className="p-6 lg:p-8">
        {/* Listing name link */}
        {event.listing_name && event.listing_slug && (
          <Link
            href={`/listings/${event.listing_slug}`}
            className="text-sm font-medium uppercase text-biz-orange tracking-wide hover:text-orange-600 transition-colors"
          >
            {event.listing_name}
          </Link>
        )}
        {event.listing_name && !event.listing_slug && (
          <span className="text-sm font-medium uppercase text-biz-orange tracking-wide">
            {event.listing_name}
          </span>
        )}

        {/* Event Title */}
        <h1 className="text-2xl lg:text-3xl font-bold text-biz-navy mt-2">
          {event.title}
        </h1>

        {/* Phase 5: Title Sponsor Badge */}
        {titleSponsor && titleSponsor.listing_name && (
          <div className="mt-2">
            <EventSponsorBadge
              sponsorName={titleSponsor.listing_name}
              sponsorSlug={titleSponsor.listing_slug ?? undefined}
            />
          </div>
        )}

        {/* Key Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* Date & Time */}
          <div className="flex items-start gap-2">
            <CalendarDays className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Date & Time</p>
              <p className="text-sm font-medium text-gray-900">
                {formatEventDate(event.start_date)}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-start gap-2">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm font-medium text-gray-900">
                {formatEventDuration(event.start_date, event.end_date)}
              </p>
            </div>
          </div>

          {/* Venue / Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">{location}</p>
              {event.location_type !== 'physical' && (
                <span className="inline-block text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1">
                  {event.location_type === 'virtual' ? 'Online' : 'Hybrid'}
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-start gap-2">
            <DollarSign className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Admission</p>
              <p className="text-sm font-medium text-gray-900">
                {formatPrice(event.is_ticketed, event.ticket_price)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 mt-6">
          {/* External ticket link OR RSVP button */}
          {event.is_ticketed && event.external_ticket_url ? (
            <div className="flex flex-col">
              <a
                href={event.external_ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('external_click')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm bg-biz-orange text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
              >
                <span>Get Tickets</span>
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
              </a>
              <span className="text-xs text-gray-400 mt-1 text-center">Opens external site</span>
            </div>
          ) : (
            <EventRSVPButton
              event={event}
              rsvpStatus={rsvpStatus}
              onRSVPClick={onRSVPClick}
              onCancelClick={onCancelRSVP || (() => {})}
            />
          )}
          <EventSaveButton
            eventId={event.id}
            initialSaved={initialSaved ?? isSaved}
            variant="hero"
          />
          <button
            onClick={onShareClick}
            className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:border-biz-navy hover:text-biz-navy transition-colors"
          >
            <Share2 className="w-4 h-4 flex-shrink-0" />
            <span>Share</span>
          </button>
          {/* Add to Calendar — only for future published events */}
          {event.status === 'published' && new Date(event.start_date) > new Date() && (
            <a
              href={`/api/events/${event.id}/ics`}
              download={`${event.slug || event.id}.ics`}
              className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:border-biz-navy hover:text-biz-navy transition-colors"
            >
              <CalendarPlus className="w-4 h-4 flex-shrink-0" />
              <span>Add to Calendar</span>
            </a>
          )}
          <RecommendButton
            entityType="event"
            entityId={event.id.toString()}
            entityPreview={{
              title: event.title,
              description: event.description,
              image_url: event.banner_image || event.listing_cover_image || null,
              url: `/events/${event.slug}`
            }}
            variant="secondary"
            size="sm"
            className="!py-2 !px-4 !border-2 !rounded-lg !font-semibold !text-sm !whitespace-nowrap [&>svg]:w-4 [&>svg]:h-4 [&>svg]:flex-shrink-0"
            onRecommendSuccess={onRecommendSuccess}
          />
          {onReportClick && (
            <button
              onClick={onReportClick}
              className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="Report this event"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventDetailHero;
