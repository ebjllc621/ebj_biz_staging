/**
 * OfferAnalyticsDashboard - Container for offers analytics tab
 *
 * Aggregates funnel, time-series, traffic sources, demographics, and geography.
 *
 * @tier ADVANCED
 * @phase Offers Phase 1 - Analytics Dashboard Visualization
 */

'use client';

import React, { useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useOfferExport } from '@features/offers/hooks/useOfferExport';
import { useAnalyticsFunnel } from '@features/offers/hooks/useAnalyticsFunnel';
import { OfferFunnelChart } from './OfferFunnelChart';
import { OfferTimeSeriesChart } from './OfferTimeSeriesChart';
import { OfferTrafficSourcesPanel } from './OfferTrafficSourcesPanel';
import { OfferDemographicsPanel } from './OfferDemographicsPanel';
import { OfferGeographyPanel } from './OfferGeographyPanel';

export interface OfferAnalyticsDashboardProps {
  offers: Array<{ id: number; title: string }>;
  listingId: number;
}

function OfferAnalyticsDashboardContent({ offers, listingId: _listingId }: OfferAnalyticsDashboardProps) {
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(
    offers[0]?.id ?? null
  );

  const { isExporting, error: exportError, exportClaims, exportAnalytics } = useOfferExport();

  const { funnel, isLoading: funnelLoading } = useAnalyticsFunnel(
    selectedOfferId ?? 0
  );

  if (offers.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        No offers found. Create an offer to view analytics.
      </div>
    );
  }

  const handleExportClaims = async () => {
    if (!selectedOfferId) return;
    await exportClaims(selectedOfferId);
  };

  const handleExportAnalytics = async () => {
    if (!selectedOfferId) return;
    await exportAnalytics(selectedOfferId);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <select
            value={selectedOfferId ?? ''}
            onChange={(e) => setSelectedOfferId(Number(e.target.value))}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          >
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportClaims}
            disabled={isExporting || !selectedOfferId}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export Claims CSV
          </button>
          <button
            onClick={handleExportAnalytics}
            disabled={isExporting || !selectedOfferId}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export Analytics CSV
          </button>
        </div>
      </div>

      {/* Export error */}
      {exportError && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
          {exportError}
        </div>
      )}

      {/* Charts grid */}
      {selectedOfferId && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel */}
            {funnelLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-[340px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
              </div>
            ) : funnel ? (
              <OfferFunnelChart funnel={funnel} />
            ) : null}

            {/* Time Series */}
            <OfferTimeSeriesChart offerId={selectedOfferId} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            <OfferTrafficSourcesPanel offerId={selectedOfferId} />

            {/* Demographics */}
            <OfferDemographicsPanel offerId={selectedOfferId} />
          </div>

          {/* Geography — full width */}
          <OfferGeographyPanel offerId={selectedOfferId} />
        </>
      )}
    </div>
  );
}

export function OfferAnalyticsDashboard(props: OfferAnalyticsDashboardProps) {
  return (
    <ErrorBoundary
      componentName="OfferAnalyticsDashboard"
      fallback={
        <div className="p-8 text-center text-red-600">
          Analytics failed to load
        </div>
      }
    >
      <OfferAnalyticsDashboardContent {...props} />
    </ErrorBoundary>
  );
}

export default OfferAnalyticsDashboard;
