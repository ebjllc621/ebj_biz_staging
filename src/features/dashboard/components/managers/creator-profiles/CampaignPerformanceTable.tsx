/**
 * CampaignPerformanceTable - Sortable table of campaign metrics
 *
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 9A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9A_AFFILIATE_MARKETER_CAMPAIGN_ANALYTICS.md
 */
'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { CampaignAnalyticsData } from '@features/content/hooks/useCampaignAnalyticsDashboard';

export interface CampaignPerformanceTableProps {
  campaigns: CampaignAnalyticsData['campaigns'];
}

type SortKey = 'campaignName' | 'network' | 'impressions' | 'clicks' | 'conversions' | 'revenue' | 'conversionRate' | 'periodStart';
type SortDir = 'asc' | 'desc';

export function CampaignPerformanceTable({ campaigns }: CampaignPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h3>
        <div className="py-12 text-center text-gray-400 text-sm">
          No campaign data yet. Add campaign metrics to track performance.
        </div>
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...campaigns].sort((a, b) => {
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown className="w-3.5 h-3.5 text-gray-300 inline ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-[#ed6437] inline ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 text-[#ed6437] inline ml-1" />;
  }

  function Th({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-gray-700"
        onClick={() => handleSort(col)}
      >
        {label}
        <SortIcon col={col} />
      </th>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <Th col="campaignName" label="Campaign" />
              <Th col="network" label="Network" />
              <Th col="impressions" label="Impressions" />
              <Th col="clicks" label="Clicks" />
              <Th col="conversions" label="Conversions" />
              <Th col="revenue" label="Revenue" />
              <Th col="conversionRate" label="Conv. Rate" />
              <Th col="periodStart" label="Period" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(c => {
              const convRateColor =
                c.conversionRate >= 5
                  ? 'text-green-600'
                  : c.conversionRate >= 2
                  ? 'text-yellow-600'
                  : 'text-red-500';

              const periodLabel =
                c.periodStart
                  ? `${c.periodStart}${c.periodEnd ? ` — ${c.periodEnd}` : ''}`
                  : '—';

              return (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{c.campaignName}</td>
                  <td className="px-4 py-3">
                    {c.network ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {c.network}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700">{c.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700">{c.conversions.toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">${c.revenue.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-semibold ${convRateColor}`}>
                    {c.conversionRate.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{periodLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CampaignPerformanceTable;
