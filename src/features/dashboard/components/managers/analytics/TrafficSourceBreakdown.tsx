/**
 * TrafficSourceBreakdown - Enhanced Traffic Source Visualization
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 2A - Analytics Enhancement
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2A_BRAIN_PLAN.md
 *
 * Tabbed view: "Referrer Sources" (referrer-based) | "Traffic Sources" (funnel events).
 * Enhances the existing SourcesChart with a dual-source tabbed layout.
 */
'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export interface TrafficSourceBreakdownProps {
  /** Referrer-based sources from existing analytics route */
  referrerSources: Array<{ source: string; views: number; percentage: number }>;
  /** Funnel sources from engagement_funnel_events */
  funnelSources?: Array<{ source: string; count: number; percentage: number }>;
  isLoading?: boolean;
}

type TabId = 'referrer' | 'funnel';

// Colors keyed by source name (funnel sources use enum values from engagement_funnel_events)
const SOURCE_COLORS: Record<string, string> = {
  // Referrer sources
  Direct: '#6b7280',
  Google: '#ed6437',
  'Social Media': '#3b82f6',
  Referral: '#ec4899',
  // Funnel event sources
  search: '#ed6437',
  social: '#3b82f6',
  direct: '#6b7280',
  notification: '#f59e0b',
  category: '#10b981',
  email: '#8b5cf6',
  referral: '#ec4899',
  listing: '#06b6d4',
  homepage: '#f97316',
  sms: '#9333EA',
  share_link: '#00B246'
};

// Fallback colors when source not in map
const FALLBACK_COLORS = ['#ed6437', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

function getSourceColor(source: string, index: number): string {
  return SOURCE_COLORS[source] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? '#6b7280';
}

function formatSourceLabel(source: string): string {
  return source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function TrafficSourceBreakdown({
  referrerSources,
  funnelSources,
  isLoading
}: TrafficSourceBreakdownProps) {
  const [activeTab, setActiveTab] = useState<TabId>('referrer');

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
        <div className="animate-pulse">
          <div className="h-[300px] bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'referrer', label: 'Referrer Sources' },
    { id: 'funnel', label: 'Traffic Sources' }
  ];

  const referrerChartData = referrerSources.map(s => ({
    source: s.source,
    value: s.views,
    percentage: s.percentage
  }));

  const funnelChartData = (funnelSources ?? []).map(s => ({
    source: s.source,
    value: s.count,
    percentage: s.percentage
  }));

  const activeData = activeTab === 'referrer' ? referrerChartData : funnelChartData;
  const isEmpty = activeData.length === 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <div className="h-[200px] flex items-center justify-center text-gray-500">
          {activeTab === 'funnel'
            ? 'No traffic source data from funnel events yet. Data will appear as visitors engage with your listing.'
            : 'No referrer source data available for the selected period.'}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="source"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={formatSourceLabel}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
                labelFormatter={(label) => formatSourceLabel(String(label))}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {activeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSourceColor(entry.source, index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Percentage Breakdown */}
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeData.map((item, index) => (
                <div
                  key={item.source}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getSourceColor(item.source, index) }}
                  />
                  <span className="text-sm text-gray-700 truncate">
                    {formatSourceLabel(item.source)}:{' '}
                    <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TrafficSourceBreakdown;
