/**
 * OfferTimeSeriesChart - Time-series analytics line chart for offers
 *
 * @tier ADVANCED
 * @phase Offers Phase 1 - Analytics Dashboard Visualization
 */

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAnalyticsTimeSeries } from '@features/offers/hooks/useAnalyticsTimeSeries';
import type { TimeSeriesGranularity } from '@features/offers/types';

export interface OfferTimeSeriesChartProps {
  offerId: number;
}

const GRANULARITY_OPTIONS: { label: string; value: TimeSeriesGranularity }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }
];

export function OfferTimeSeriesChart({ offerId }: OfferTimeSeriesChartProps) {
  const { data, loading, error, setGranularity } = useAnalyticsTimeSeries({
    offerId,
    granularity: 'daily',
    autoFetch: true
  });

  const [activeGranularity, setActiveGranularity] = React.useState<TimeSeriesGranularity>('daily');

  const handleGranularityChange = (granularity: TimeSeriesGranularity) => {
    setActiveGranularity(granularity);
    setGranularity(granularity);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance Over Time</h3>
          <p className="text-sm text-gray-500">Track impressions, views, claims, and redemptions</p>
        </div>
        <div className="flex items-center gap-1">
          {GRANULARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleGranularityChange(option.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeGranularity === option.value
                  ? 'bg-[#ed6437] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[280px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
        </div>
      ) : error ? (
        <div className="h-[280px] flex items-center justify-center text-red-500 text-sm">
          {error}
        </div>
      ) : !data || data.dataPoints.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">
          No time-series data available yet
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={data.dataPoints}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
                formatter={(value: number | undefined) => [(value ?? 0).toLocaleString()]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="impressions"
                stroke="#6b7280"
                strokeWidth={2}
                dot={false}
                name="Impressions"
              />
              <Line
                type="monotone"
                dataKey="pageViews"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Page Views"
              />
              <Line
                type="monotone"
                dataKey="claims"
                stroke="#ed6437"
                strokeWidth={2}
                dot={false}
                name="Claims"
              />
              <Line
                type="monotone"
                dataKey="redemptions"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Redemptions"
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Total Impressions</p>
              <p className="text-sm font-semibold text-gray-800">
                {data.totals.impressions.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Views</p>
              <p className="text-sm font-semibold text-gray-800">
                {data.totals.pageViews.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Claims</p>
              <p className="text-sm font-semibold text-gray-800">
                {data.totals.claims.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Redemptions</p>
              <p className="text-sm font-semibold text-gray-800">
                {data.totals.redemptions.toLocaleString()}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OfferTimeSeriesChart;
