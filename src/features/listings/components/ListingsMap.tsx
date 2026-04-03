/**
 * ListingsMap - Interactive Mapbox Map for Listings Page
 *
 * Displays listing locations as markers on a Mapbox GL JS map.
 * Supports marker click for preview popup and interaction with listing grid.
 *
 * @component Client Component (requires 'use client' directive)
 * @tier ADVANCED (third-party library, async initialization)
 * @phase Phase 3 - Map Integration
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * @see docs/pages/layouts/listings/phases/PHASE_3_BRAIN_PLAN.md
 * @see docs/pages/layouts/listings/MAP_INTEGRATION_GUIDE.md
 */
'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { LngLatBoundsLike } from 'mapbox-gl';
import { MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ListingWithCoordinates } from '@/features/listings/types';
import Image from 'next/image';
import { getMarkerImage, MAP_MARKER_SIZE } from '../constants/mapMarkers';
import { ErrorService } from '@core/services/ErrorService';

interface ListingsMapProps {
  /** Listings with coordinate data */
  listings: ListingWithCoordinates[];
  /** Callback when marker is clicked */
  onMarkerClick?: (_listingId: number) => void;
  /** Callback when marker is hovered */
  onMarkerHover?: (_listingId: number | null) => void;
  /** Currently highlighted listing ID (from grid hover) */
  highlightedListingId?: number | null;
  /** User's current location for centering when no listings nearby */
  userLocation?: { lat: number; lng: number } | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ListingsMap Component
 */
export function ListingsMap({
  listings,
  onMarkerClick,
  onMarkerHover: _onMarkerHover,
  highlightedListingId,
  userLocation,
  className = '',
}: ListingsMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<ListingWithCoordinates | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const hasFitBounds = useRef(false);

  // Mapbox token validation
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Filter listings with valid coordinates
  const listingsWithCoords = useMemo(
    () =>
      listings.filter(
        (listing): listing is ListingWithCoordinates & { latitude: number; longitude: number } =>
          listing.latitude !== null &&
          listing.longitude !== null &&
          typeof listing.latitude === 'number' &&
          typeof listing.longitude === 'number'
      ),
    [listings]
  );

  // Calculate initial view state (used before fitBounds fires)
  const initialViewState = useMemo(() => {
    if (listingsWithCoords.length === 0) {
      // If user location available, center there; otherwise default to Toronto
      if (userLocation) {
        return { latitude: userLocation.lat, longitude: userLocation.lng, zoom: 11 };
      }
      return { latitude: 43.6532, longitude: -79.3832, zoom: 11 };
    }

    if (listingsWithCoords.length === 1) {
      // Single listing: center directly on it at street-level zoom
      const single = listingsWithCoords[0]!;
      return { latitude: single.latitude, longitude: single.longitude, zoom: 14 };
    }

    // Multiple listings: start with average (fitBounds will adjust on load)
    const avgLat = listingsWithCoords.reduce((sum, l) => sum + l.latitude, 0) / listingsWithCoords.length;
    const avgLng = listingsWithCoords.reduce((sum, l) => sum + l.longitude, 0) / listingsWithCoords.length;
    return { latitude: avgLat, longitude: avgLng, zoom: 4 };
  }, [listingsWithCoords, userLocation]);

  const [viewState, setViewState] = useState(initialViewState);

  // fitBounds: zoom to show all markers when listings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || listingsWithCoords.length < 2) {
      // For 0-1 listings, initialViewState handles it
      if (listingsWithCoords.length <= 1) {
        setViewState(initialViewState);
      }
      return;
    }

    // Calculate bounding box of all markers
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const l of listingsWithCoords) {
      if (l.latitude < minLat) minLat = l.latitude;
      if (l.latitude > maxLat) maxLat = l.latitude;
      if (l.longitude < minLng) minLng = l.longitude;
      if (l.longitude > maxLng) maxLng = l.longitude;
    }

    const bounds: LngLatBoundsLike = [[minLng, minLat], [maxLng, maxLat]];

    try {
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        duration: hasFitBounds.current ? 800 : 0, // animate subsequent fits, instant on first
      });
      hasFitBounds.current = true;
    } catch {
      // Fallback if fitBounds fails (e.g., invalid bounds)
    }
  }, [listingsWithCoords, mapLoaded, initialViewState]);

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
    (listing: ListingWithCoordinates & { latitude: number; longitude: number }) => {
      setPopupInfo(listing);
      if (onMarkerClick) {
        onMarkerClick(listing.id);
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

  // No listings with coordinates
  if (listingsWithCoords.length === 0) {
    return (
      <div className={`h-[600px] bg-gray-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-600">No listings with location data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} role="application" aria-label="Interactive map showing listing locations">
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
        {listingsWithCoords.map((listing) => (
          <Marker
            key={listing.id}
            latitude={listing.latitude}
            longitude={listing.longitude}
            anchor="bottom"
            onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(listing);
            }}
          >
            <div
              onMouseEnter={() => _onMarkerHover?.(listing.id)}
              onMouseLeave={() => _onMarkerHover?.(null)}
              aria-label={`${listing.name} marker`}
              className={`transition-transform cursor-pointer ${
                highlightedListingId === listing.id ? 'scale-125' : ''
              }`}
            >
              <img
                src={getMarkerImage(listing.claimed, listing.tier)}
                alt={listing.claimed ? `${listing.tier} tier marker` : 'Unclaimed listing marker'}
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
              {/* Listing Image */}
              {popupInfo.cover_image_url && (
                <div className="relative w-full h-32 mb-2 rounded-md overflow-hidden">
                  <Image
                    src={popupInfo.cover_image_url}
                    alt={popupInfo.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Listing Info */}
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">{popupInfo.name}</h3>
                {popupInfo.category_name && (
                  <p className="text-xs text-gray-500">{popupInfo.category_name}</p>
                )}
                {(popupInfo.city || popupInfo.state) && (
                  <p className="text-xs text-gray-600">
                    {[popupInfo.city, popupInfo.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {popupInfo.rating !== undefined && popupInfo.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm font-medium">{popupInfo.rating.toFixed(1)}</span>
                    {popupInfo.review_count !== undefined && popupInfo.review_count > 0 && (
                      <span className="text-xs text-gray-500">
                        ({popupInfo.review_count} reviews)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* View Listing Link */}
              <a
                href={`/listings/${popupInfo.slug}`}
                className="mt-2 inline-block text-xs text-biz-navy hover:text-biz-orange transition-colors"
              >
                View Listing →
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

export default ListingsMap;
