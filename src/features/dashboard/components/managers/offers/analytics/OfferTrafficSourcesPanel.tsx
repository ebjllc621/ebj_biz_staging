/**
 * OfferTrafficSourcesPanel - Traffic source breakdown for offers
 *
 * @tier ADVANCED
 * @phase Offers Phase 1 - Analytics Dashboard Visualization
 */

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useTrafficSources } from '@features/offers/hooks/useTrafficSources';

export interface OfferTrafficSourcesPanelProps {
  offerId: number;
}

export function OfferTrafficSourcesPanel({ offerId }: OfferTrafficSourcesPanelProps) {
  const { sources, isLoading, error } = useTrafficSources(offerId);

  const chartData = sources?.sources.map((s) => ({
    source: s.source,
    claims: s.claims,
    conversionRate: s.conversionRate
  })) ?? [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Traffic Sources</h3>
      <p className="text-sm text-gray-500 mb-4">Where your offer traffic is coming from</p>

      {isLoading ? (
        <div className="h-[240px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
        </div>
      ) : error ? (
        <div className="h-[240px] flex items-center justify-center text-red-500 text-sm">
          {error}
        </div>
      ) : !sources || chartData.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-gray-500 text-sm">
          No traffic source data yet
        </div>
      ) : (
        <>
          {sources.topSource && (
            <div className="mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ed6437]/10 text-[#ed6437]">
                Top source: {sources.topSource}
              </span>
            </div>
          )}
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 32, left: 16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                dataKey="source"
                type="category"
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
                tick={{ fill: '#6b7280' }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
                formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), 'Claims']}
              />
              <Bar dataKey="claims" fill="#ed6437" radius={[0, 4, 4, 0]} name="Claims" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

export default OfferTrafficSourcesPanel;
