/**
 * GeographicHeatmap - Listing Location + Analytics Overlay
 *
 * @description Map showing listing location with analytics overlay
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 5B - Advanced Analytics
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5B_BRAIN_PLAN.md
 * @reference src/features/listings/components/ListingsMap.tsx
 *
 * USAGE:
 * Rendered in AnalyticsManager after PerformanceComparison.
 * Shows the listing's physical location on a map with engagement stats overlay.
 */
'use client';

import React from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import dynamic from 'next/dynamic';

// Dynamic import for map to avoid SSR issues with mapbox-gl
const MapComponent = dynamic(
  () => import('./GeographicHeatmapMap'),
  { ssr: false, loading: () => <div className="h-[350px] bg-gray-100 rounded-lg animate-pulse" /> }
);

interface GeographicHeatmapProps {
  listingId: number;
  latitude?: number | null;
  longitude?: number | null;
  listingName?: string;
  totalViews?: number;
}

function GeographicHeatmapContent({
  latitude,
  longitude,
  listingName = 'Your Listing',
  totalViews = 0,
}: GeographicHeatmapProps) {
  const hasLocation = latitude != null && longitude != null && latitude !== 0 && longitude !== 0;

  if (!hasLocation) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-[#ed6437]" />
          <h3 className="text-lg font-semibold text-gray-900">Geographic Insights</h3>
        </div>
        <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Add a location to your listing to see geographic insights</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-[#ed6437]" />
        <h3 className="text-lg font-semibold text-gray-900">Geographic Insights</h3>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-200">
        <MapComponent
          latitude={latitude!}
          longitude={longitude!}
          listingName={listingName}
          totalViews={totalViews}
        />
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Showing your listing location. Viewer geographic data will be displayed when available.
      </p>
    </div>
  );
}

export function GeographicHeatmap(props: GeographicHeatmapProps) {
  return (
    <ErrorBoundary componentName="GeographicHeatmap">
      <GeographicHeatmapContent {...props} />
    </ErrorBoundary>
  );
}
