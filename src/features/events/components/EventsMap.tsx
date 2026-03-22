/**
 * EventsMap - Interactive Mapbox Map for Events Page
 *
 * Displays event locations as markers on a Mapbox GL JS map.
 * Supports marker click for preview popup and interaction with event grid.
 *
 * @component Client Component (requires 'use client' directive)
 * @tier ADVANCED (third-party library, async initialization)
 * @phase Phase 5 - Map Integration
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * @see docs/pages/layouts/events/phases/PHASE_5_BRAIN_PLAN.md
 * @see src/features/listings/components/ListingsMap.tsx - Canonical pattern
 */
'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import { MapPin, Calendar } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { EventWithCoordinates } from '@/features/events/types';
import Image from 'next/image';
// 2026-01-05: Use listing tier-based markers instead of event type markers
import { getMarkerImage, MAP_MARKER_SIZE } from '@/features/listings/constants/mapMarkers';
import { ErrorService } from '@core/services/ErrorService';

interface EventsMapProps {
  /** Events with coordinate data */
  events: EventWithCoordinates[];
  /** Callback when marker is clicked */
  onMarkerClick?: (_eventId: number) => void;
  /** Callback when marker is hovered */
  onMarkerHover?: (_eventId: number | null) => void;
  /** Currently highlighted event ID (from grid hover) */
  highlightedEventId?: number | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format event date for display in popup
 */
function formatEventDate(eventDate: string | Date): string {
  const date = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * EventsMap Component
 */
export function EventsMap({
  events,
  onMarkerClick,
  onMarkerHover: _onMarkerHover,
  highlightedEventId,
  className = '',
}: EventsMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<EventWithCoordinates | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Mapbox token validation
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Filter events with valid coordinates
  const eventsWithCoords = useMemo(
    () =>
      events.filter(
        (event): event is EventWithCoordinates & { latitude: number; longitude: number } =>
          event.latitude !== null &&
          event.longitude !== null &&
          typeof event.latitude === 'number' &&
          typeof event.longitude === 'number'
      ),
    [events]
  );

  // Calculate map center from events
  const mapCenter = useMemo(() => {
    if (eventsWithCoords.length === 0) {
      return { latitude: 43.6532, longitude: -79.3832, zoom: 11 }; // Default (Toronto)
    }

    const avgLat =
      eventsWithCoords.reduce((sum, e) => sum + e.latitude, 0) / eventsWithCoords.length;
    const avgLng =
      eventsWithCoords.reduce((sum, e) => sum + e.longitude, 0) / eventsWithCoords.length;

    return { latitude: avgLat, longitude: avgLng, zoom: 11 };
  }, [eventsWithCoords]);

  const [viewState, setViewState] = useState(mapCenter);

  // Update viewState when mapCenter changes
  useEffect(() => {
    setViewState(mapCenter);
  }, [mapCenter]);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    setMapError(null);
  }, []);

  // Handle map error
  const handleMapError = useCallback((evt: { error: { message: string } }) => {
    ErrorService.capture('Mapbox load error:', evt.error);
    setMapError('Failed to load map. Please check your connection and try again.');
  }, []);

  // Handle marker click
  const handleMarkerClick = useCallback(
    (event: EventWithCoordinates & { latitude: number; longitude: number }) => {
      setPopupInfo(event);
      if (onMarkerClick) {
        onMarkerClick(event.id);
      }
    },
    [onMarkerClick]
  );

  // Missing API token
  if (!mapboxToken) {
    return (
      <div className={`h-[600px] bg-yellow-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <p className="text-yellow-800 font-medium">Map configuration required</p>
          <p className="text-yellow-600 text-sm">Mapbox API token not configured</p>
        </div>
      </div>
    );
  }

  // Map error state
  if (mapError) {
    return (
      <div className={`h-[600px] bg-red-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-800 font-medium mb-2">Map Error</p>
          <p className="text-red-600 text-sm mb-4">{mapError}</p>
          <button
            onClick={() => {
              setMapError(null);
              setMapLoaded(false);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No events with coordinates
  if (eventsWithCoords.length === 0) {
    return (
      <div className={`h-[600px] bg-gray-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-600">No events with location data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} role="application" aria-label="Interactive map showing event locations">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        onLoad={handleMapLoad}
        onError={handleMapError}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" />

        {/* Markers */}
        {eventsWithCoords.map((event) => (
          <Marker
            key={event.id}
            latitude={event.latitude}
            longitude={event.longitude}
            anchor="bottom"
            onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(event);
            }}
          >
            <div
              onMouseEnter={() => _onMarkerHover?.(event.id)}
              onMouseLeave={() => _onMarkerHover?.(null)}
              aria-label={`${event.title} marker`}
              className={`transition-transform cursor-pointer ${
                highlightedEventId === event.id ? 'scale-125' : ''
              }`}
            >
              {/* 2026-01-05: Use listing tier-based markers */}
              <img
                src={getMarkerImage(event.listing_claimed, event.listing_tier)}
                alt={`${event.listing_tier} tier marker`}
                width={MAP_MARKER_SIZE.width}
                height={MAP_MARKER_SIZE.height}
                className="drop-shadow-md"
              />
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {popupInfo && (
          <Popup
            latitude={popupInfo.latitude!}
            longitude={popupInfo.longitude!}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="mapbox-popup"
          >
            <div className="p-3 max-w-xs">
              {/* Event Image */}
              {popupInfo.banner_image && (
                <div className="relative w-full h-32 mb-2 rounded-md overflow-hidden">
                  <Image
                    src={popupInfo.banner_image}
                    alt={popupInfo.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Event Info */}
              <div className="space-y-1">
                {/* Listing Name (Orange) */}
                {popupInfo.listing_name && (
                  <p className="text-xs font-medium text-biz-orange">{popupInfo.listing_name}</p>
                )}

                {/* Event Title */}
                <h3 className="font-semibold text-gray-900">{popupInfo.title}</h3>

                {/* Event Date */}
                {popupInfo.start_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>{formatEventDate(popupInfo.start_date)}</span>
                  </div>
                )}

                {/* Location */}
                {(popupInfo.venue_name || popupInfo.city || popupInfo.state) && (
                  <p className="text-xs text-gray-600">
                    {popupInfo.venue_name && <span>{popupInfo.venue_name}<br /></span>}
                    {[popupInfo.city, popupInfo.state].filter(Boolean).join(', ')}
                  </p>
                )}

                {/* Event Type Badge */}
                {popupInfo.event_type && (
                  <div className="inline-block">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-biz-navy/10 text-biz-navy">
                      {popupInfo.event_type}
                    </span>
                  </div>
                )}
              </div>

              {/* View Event Link */}
              <a
                href={`/events/${popupInfo.slug}`}
                className="mt-2 inline-block text-xs text-biz-navy hover:text-biz-orange transition-colors"
              >
                View Event →
              </a>
            </div>
          </Popup>
        )}
      </Map>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-500">Loading map...</span>
        </div>
      )}
    </div>
  );
}

export default EventsMap;
