/**
 * JobsMap - Interactive Mapbox Map for Jobs Page
 *
 * Displays job locations as markers on a Mapbox GL JS map.
 * Supports marker click for preview popup and interaction with job grid.
 *
 * @component Client Component (requires 'use client' directive)
 * @tier ADVANCED (third-party library, async initialization)
 * @phase Jobs Phase R1 - Remediation
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * @see docs/pages/layouts/job_ops/build/3-4-26/phases/PHASE_R1_BRAIN_PLAN.md
 * @see src/features/listings/components/ListingsMap.tsx - Pattern reference
 */
'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import { MapPin, Briefcase } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { JobWithCoordinates } from '@features/jobs/types';
import { getMarkerImage, MAP_MARKER_SIZE } from '@/features/listings/constants/mapMarkers';
import { ErrorService } from '@core/services/ErrorService';

interface JobsMapProps {
  /** Jobs with coordinate data */
  jobs: JobWithCoordinates[];
  /** Callback when marker is clicked */
  onMarkerClick?: (_jobId: number) => void;
  /** Callback when marker is hovered */
  onMarkerHover?: (_jobId: number | null) => void;
  /** Currently highlighted job ID (from grid hover) */
  highlightedJobId?: number | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * JobsMap Component
 */
export function JobsMap({
  jobs,
  onMarkerClick,
  onMarkerHover: _onMarkerHover,
  highlightedJobId,
  className = '',
}: JobsMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<JobWithCoordinates | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Mapbox token validation
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Filter jobs with valid coordinates
  const jobsWithCoords = useMemo(
    () =>
      jobs.filter(
        (job): job is JobWithCoordinates & { latitude: number; longitude: number } =>
          job.latitude !== null &&
          job.longitude !== null &&
          typeof job.latitude === 'number' &&
          typeof job.longitude === 'number'
      ),
    [jobs]
  );

  // Calculate map center from jobs
  const mapCenter = useMemo(() => {
    if (jobsWithCoords.length === 0) {
      return { latitude: 43.6532, longitude: -79.3832, zoom: 11 }; // Default (Toronto)
    }

    const avgLat =
      jobsWithCoords.reduce((sum, j) => sum + j.latitude, 0) / jobsWithCoords.length;
    const avgLng =
      jobsWithCoords.reduce((sum, j) => sum + j.longitude, 0) / jobsWithCoords.length;

    return { latitude: avgLat, longitude: avgLng, zoom: 11 };
  }, [jobsWithCoords]);

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
    (job: JobWithCoordinates & { latitude: number; longitude: number }) => {
      setPopupInfo(job);
      if (onMarkerClick) {
        onMarkerClick(job.id);
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

  // No jobs with coordinates
  if (jobsWithCoords.length === 0) {
    return (
      <div className={`h-[600px] bg-gray-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-600">No jobs with location data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} role="application" aria-label="Interactive map showing job locations">
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
        {jobsWithCoords.map((job) => (
          <Marker
            key={job.id}
            latitude={job.latitude}
            longitude={job.longitude}
            anchor="bottom"
            onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(job);
            }}
          >
            <div
              onMouseEnter={() => _onMarkerHover?.(job.id)}
              onMouseLeave={() => _onMarkerHover?.(null)}
              aria-label={`${job.title} marker`}
              className={`transition-transform cursor-pointer ${
                highlightedJobId === job.id ? 'scale-125' : ''
              }`}
            >
              <img
                src={getMarkerImage(job.listing_claimed ?? false, job.listing_tier ?? 'essentials')}
                alt={job.listing_claimed ? `${job.listing_tier ?? 'essentials'} tier marker` : 'Unclaimed job marker'}
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
              {/* Job Icon */}
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-biz-orange" />
                <span className="text-xs text-gray-500 uppercase font-medium">Job Opening</span>
              </div>

              {/* Job Info */}
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">{popupInfo.title}</h3>
                {popupInfo.listing_name && (
                  <p className="text-sm text-biz-orange font-medium">{popupInfo.listing_name}</p>
                )}
                {(popupInfo.city || popupInfo.state) && (
                  <p className="text-xs text-gray-600">
                    {[popupInfo.city, popupInfo.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {popupInfo.employment_type && (
                  <div className="inline-block bg-gray-100 px-2 py-1 rounded text-xs text-gray-700 mt-1">
                    {popupInfo.employment_type.replace('_', ' ').toUpperCase()}
                  </div>
                )}
                {(popupInfo.compensation_min || popupInfo.compensation_max) && (
                  <p className="text-sm text-gray-600 mt-1">
                    {popupInfo.compensation_type === 'hourly' ? '$' : ''}
                    {popupInfo.compensation_min && popupInfo.compensation_max
                      ? `${popupInfo.compensation_min.toLocaleString()} - ${popupInfo.compensation_max.toLocaleString()}`
                      : popupInfo.compensation_min
                        ? `${popupInfo.compensation_min.toLocaleString()}+`
                        : popupInfo.compensation_max
                          ? `Up to ${popupInfo.compensation_max.toLocaleString()}`
                          : ''}
                    {popupInfo.compensation_type === 'hourly' ? '/hr' : popupInfo.compensation_type === 'salary' ? '/yr' : ''}
                  </p>
                )}
              </div>

              {/* View Job Link */}
              <a
                href={`/jobs/${popupInfo.slug}`}
                className="mt-2 inline-block text-xs text-biz-navy hover:text-biz-orange transition-colors"
              >
                View Job →
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

export default JobsMap;
