/**
 * GeographicHeatmapMap - Mapbox GL map subcomponent (client-only, no SSR)
 *
 * @description Renders the Mapbox map with the listing's location marker.
 *              Loaded via dynamic import from GeographicHeatmap to avoid SSR issues.
 * @component Client Component (no SSR)
 * @tier ADVANCED
 * @phase Phase 5B - Advanced Analytics
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5B_BRAIN_PLAN.md
 * @reference src/features/listings/components/ListingsMap.tsx
 */
'use client';

import React from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

interface GeographicHeatmapMapProps {
  latitude: number;
  longitude: number;
  listingName: string;
  totalViews: number;
}

export default function GeographicHeatmapMap({
  latitude,
  longitude,
  listingName: _listingName,
  totalViews,
}: GeographicHeatmapMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    return (
      <div className="h-[350px] flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Map unavailable — Mapbox token not configured
      </div>
    );
  }

  return (
    <Map
      initialViewState={{
        latitude,
        longitude,
        zoom: 13,
      }}
      style={{ width: '100%', height: 350 }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={mapboxToken}
    >
      <NavigationControl position="top-right" />
      <Marker latitude={latitude} longitude={longitude} anchor="bottom">
        <div className="flex flex-col items-center">
          <div className="bg-[#ed6437] text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg mb-1">
            {totalViews} views
          </div>
          <MapPin className="w-8 h-8 text-[#ed6437] drop-shadow-lg" fill="#ed6437" />
        </div>
      </Marker>
    </Map>
  );
}
