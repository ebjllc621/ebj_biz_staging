/**
 * EventQuickView - Popover summary for calendar event clicks
 *
 * @tier STANDARD
 * @phase Phase 6B - Dashboard Calendar & .ics Export
 */

'use client';

import { useEffect, useRef } from 'react';
import { X, MapPin, ExternalLink, Download, Navigation } from 'lucide-react';
import type { CalendarEvent, CalendarEventStatus } from '@features/events/types';

interface EventQuickViewProps {
  event: CalendarEvent;
  position: { top: number; left: number };
  onClose: () => void;
}

const STATUS_CLASSES: Record<CalendarEventStatus, string> = {
  going: 'bg-green-100 text-green-800',
  saved: 'bg-yellow-100 text-yellow-800',
  created: 'bg-blue-100 text-blue-800',
  past: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<CalendarEventStatus, string> = {
  going: 'Going',
  saved: 'Saved',
  created: 'Created',
  past: 'Past',
};

function getEffectiveStatus(event: CalendarEvent): CalendarEventStatus {
  if (new Date(event.end_date) < new Date()) {
    return 'past';
  }
  return event.calendar_status;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const datePart = dateFormatter.format(start);
  const startTime = timeFormatter.format(start);
  const endTime = timeFormatter.format(end);

  return `${datePart} · ${startTime} - ${endTime}`;
}

export function EventQuickView({ event, position, onClose }: EventQuickViewProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const effectiveStatus = getEffectiveStatus(event);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const locationParts = [event.venue_name, event.city, event.state].filter(Boolean);
  const locationText = locationParts.join(', ');

  const mapsUrl =
    event.location_type !== 'virtual' && locationText
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`
      : null;

  const capacityText =
    event.total_capacity != null
      ? `${event.rsvp_count} of ${event.total_capacity} spots claimed`
      : event.rsvp_count > 0
      ? `${event.rsvp_count} attending`
      : null;

  return (
    <div
      ref={panelRef}
      className="absolute z-50 w-72 bg-white rounded-xl border border-gray-200 shadow-lg p-4 space-y-3"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label={`Event details: ${event.title}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug flex-1">{event.title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Status badge */}
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[effectiveStatus]}`}
      >
        {STATUS_LABELS[effectiveStatus]}
      </span>

      {/* Date/time */}
      <p className="text-xs text-gray-600">{formatDateRange(event.start_date, event.end_date)}</p>

      {/* Location */}
      {locationText && (
        <div className="flex items-start gap-1.5 text-xs text-gray-600">
          <MapPin size={12} className="mt-0.5 flex-shrink-0 text-gray-400" />
          <span>{locationText}</span>
        </div>
      )}

      {/* Capacity */}
      {capacityText && (
        <p className="text-xs text-gray-500">{capacityText}</p>
      )}

      {/* Hosted by */}
      {event.listing_name && (
        <p className="text-xs text-gray-500">
          Hosted by: <span className="font-medium text-gray-700">{event.listing_name}</span>
        </p>
      )}

      {/* Actions */}
      <div className="pt-1 space-y-2">
        <a
          href={`/events/${event.slug}`}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink size={12} />
          View Details
        </a>

        <div className="flex gap-2">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Navigation size={12} />
              Directions
            </a>
          )}

          <a
            href={`/api/events/${event.id}/ics`}
            download={`${event.slug}.ics`}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={12} />
            Add to Cal
          </a>
        </div>
      </div>
    </div>
  );
}
