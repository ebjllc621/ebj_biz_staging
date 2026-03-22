/**
 * OfferGeographyPanel - Geographic distribution of offer claimers
 *
 * @tier ADVANCED
 * @phase Offers Phase 1 - Analytics Dashboard Visualization
 */

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAnalyticsGeography } from '@features/offers/hooks/useAnalyticsGeography';

export interface OfferGeographyPanelProps {
  offerId: number;
}

export function OfferGeographyPanel({ offerId }: OfferGeographyPanelProps) {
  const { geography, isLoading, error } = useAnalyticsGeography(offerId);

  const topLocations = geography?.topLocations.slice(0, 10) ?? [];
  const maxCount = topLocations.length > 0
    ? Math.max(...topLocations.map((l) => l.count))
    : 1;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Geographic Distribution</h3>
      <p className="text-sm text-gray-500 mb-4">Top locations by claimer count</p>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
        </div>
      ) : error ? (
        <div className="h-[200px] flex items-center justify-center text-red-500 text-sm">
          {error}
        </div>
      ) : topLocations.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
          No geographic data available yet
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {topLocations.map((location, index) => {
              const widthPct = maxCount > 0
                ? Math.round((location.count / maxCount) * 100)
                : 0;
              return (
                <div key={`${location.label}-${index}`} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#ed6437]/10 text-[#ed6437] text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-800 truncate">{location.label}</span>
                      <span className="text-sm font-medium text-gray-600 ml-2 flex-shrink-0">
                        {location.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-[#ed6437] h-1.5 rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Based on claimers&apos; registered location
          </p>
        </>
      )}
    </div>
  );
}

export default OfferGeographyPanel;
