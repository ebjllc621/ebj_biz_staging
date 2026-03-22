/**
 * MapToggle - Toggle button for map visibility
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 3 - Map Integration
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * @see docs/pages/layouts/listings/phases/PHASE_3_BRAIN_PLAN.md
 */
'use client';

import { Map, X } from 'lucide-react';

interface MapToggleProps {
  /** Whether map is currently visible */
  isMapVisible: boolean;
  /** Callback to toggle map visibility */
  onToggle: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function MapToggle({ isMapVisible, onToggle, className = '' }: MapToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
        isMapVisible
          ? 'bg-biz-navy text-white border-biz-navy hover:bg-biz-navy/90'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      } ${className}`}
      aria-pressed={isMapVisible}
      aria-label={isMapVisible ? 'Hide map' : 'Show map'}
    >
      {isMapVisible ? (
        <>
          <X className="w-4 h-4" />
          <span>Hide Map</span>
        </>
      ) : (
        <>
          <Map className="w-4 h-4" />
          <span>Show Map</span>
        </>
      )}
    </button>
  );
}

export default MapToggle;
