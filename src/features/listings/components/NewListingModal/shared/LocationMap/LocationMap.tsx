/**
 * LocationMap - Mapbox GL JS Location Preview
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier STANDARD - Map display component
 * @phase Phase 4 - Contact Information
 *
 * FEATURES:
 * - Mapbox GL JS integration (consistent with ListingsMap)
 * - Tier-specific custom marker display
 * - Fallback UI when no lat/long
 * - Error state for missing API key
 * - Responsive sizing
 */

'use client';

import { useMemo, useState, useCallback } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ListingTier } from '../../../../types/listing-form.types';
import { getMarkerImage, MAP_MARKER_SIZE } from '../../../../constants/mapMarkers';

// ============================================================================
// TYPES
// ============================================================================

interface LocationMapProps {
  /** Latitude coordinate */
  latitude: number | null;
  /** Longitude coordinate */
  longitude: number | null;
  /** Listing tier for marker display */
  tier: ListingTier;
  /** Optional map width */
  width?: number;
  /** Optional map height */
  height?: number;
  /** Optional zoom level (1-20) */
  zoom?: number;
  /** Optional marker size override (defaults to MAP_MARKER_SIZE 32×40) */
  markerSize?: { width: number; height: number };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LocationMap({
  latitude,
  longitude,
  tier,
  width = 600,
  height = 300,
  zoom = 15,
  markerSize = MAP_MARKER_SIZE,
}: LocationMapProps) {
  // Check for Mapbox token
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Map loading state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // View state for the map
  const viewState = useMemo(() => ({
    latitude: latitude || 0,
    longitude: longitude || 0,
    zoom,
  }), [latitude, longitude, zoom]);

  // Get the tier-specific marker image
  const markerImage = useMemo(() => {
    return getMarkerImage(true, tier); // claimed = true for new listing
  }, [tier]);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    setMapError(null);
  }, []);

  // Handle map error
  const handleMapError = useCallback(() => {
    setMapError('Failed to load map');
  }, []);

  // No coordinates provided
  if (!latitude || !longitude) {
    return (
      <div
        className="flex items-center justify-center bg-[#f8f9fa] border border-[#8d918d]/20 rounded-lg"
        style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%' }}
      >
        <div className="text-center px-4">
          <svg
            className="mx-auto h-12 w-12 text-[#8d918d] mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-sm font-medium text-[#8d918d]">No location selected</p>
          <p className="text-xs text-[#8d918d] mt-1">
            Enter an address above to see the map
          </p>
        </div>
      </div>
    );
  }

  // API key missing
  if (!mapboxToken) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg"
        style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%' }}
      >
        <div className="text-center px-4">
          <svg
            className="mx-auto h-12 w-12 text-red-500 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm font-medium text-red-700">Map unavailable</p>
          <p className="text-xs text-red-600 mt-1">
            Mapbox API token not configured
          </p>
        </div>
      </div>
    );
  }

  // Map error state
  if (mapError) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg"
        style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%' }}
      >
        <div className="text-center px-4">
          <svg
            className="mx-auto h-12 w-12 text-red-500 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm font-medium text-red-700">Map Error</p>
          <p className="text-xs text-red-600 mt-1">{mapError}</p>
        </div>
      </div>
    );
  }

  // Display map with Mapbox GL JS
  return (
    <div
      className="relative rounded-lg overflow-hidden border border-[#8d918d]/20"
      style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%' }}
    >
      <Map
        initialViewState={viewState}
        onLoad={handleMapLoad}
        onError={handleMapError}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
        interactive={false} // Disable interaction for preview
        attributionControl={false}
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" showCompass={false} />

        {/* Custom Tier Marker */}
        <Marker
          latitude={latitude}
          longitude={longitude}
          anchor="bottom"
        >
          <img
            src={markerImage}
            alt={`${tier} tier marker`}
            width={markerSize.width}
            height={markerSize.height}
            className="drop-shadow-md"
          />
        </Marker>
      </Map>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-500 text-sm">Loading map...</span>
        </div>
      )}

      {/* Coordinates Badge */}
      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-[#8d918d]/20">
        <p className="text-xs font-mono text-[#022641]">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      </div>

      {/* Tier Badge */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-[#8d918d]/20">
        <p className="text-xs font-semibold text-[#022641] uppercase">
          {tier} Tier
        </p>
      </div>
    </div>
  );
}
