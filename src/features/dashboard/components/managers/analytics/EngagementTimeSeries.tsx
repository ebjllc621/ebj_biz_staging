/**
 * EngagementTimeSeries - Multi-Metric Time-Series Line Chart
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 2A - Analytics Enhancement
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2A_BRAIN_PLAN.md
 *
 * Displays 4 metrics over time: Page Views, Engagements, Conversions, Shares.
 * Enhances the single-metric ViewsTrendChart with multi-series support.
 */
'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export interface TrendDataPoint {
  date: string;
  page_views: number;
  engagements: number;
  conversions: number;
  shares: number;
}

export interface EngagementTimeSeriesProps {
  data: TrendDataPoint[];
  isLoading?: boolean;
}

interface SeriesConfig {
  key: keyof Omit<TrendDataPoint, 'date'>;
  label: string;
  color: string;
}

const SERIES: SeriesConfig[] = [
  { key: 'page_views', label: 'Page Views', color: '#ed6437' },
  { key: 'engagements', label: 'Engagements', color: '#3b82f6' },
  { key: 'conversions', label: 'Conversions', color: '#10b981' },
  { key: 'shares', label: 'Shares', color: '#8b5cf6' }
];

export function EngagementTimeSeries({ data, isLoading }: EngagementTimeSeriesProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const toggleSeries = (key: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>
        <div className="animate-pulse">
          <div className="h-[300px] bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No trend data available for the selected period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>

      {/* Toggleable Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {SERIES.map(series => {
          const isHidden = hiddenSeries.has(series.key);
          return (
            <button
              key={series.key}
              onClick={() => toggleSeries(series.key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                isHidden
                  ? 'border-gray-200 text-gray-400 bg-gray-50'
                  : 'border-transparent text-white'
              }`}
              style={isHidden ? {} : { backgroundColor: series.color }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isHidden ? '#9ca3af' : 'white' }}
              />
              {series.label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
            content={({ active, payload, label }) => {
              if (!active || !payload) return null;
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="font-medium text-gray-900 mb-2">{label}</p>
                  {SERIES.filter(s => !hiddenSeries.has(s.key)).map(series => {
                    const entry = payload.find(p => p.dataKey === series.key);
                    return (
                      <div key={series.key} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: series.color }} />
                        <span className="text-gray-600">{series.label}:</span>
                        <span className="font-medium text-gray-900">{entry?.value ?? 0}</span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          <Legend content={() => null} />
          {SERIES.map(series => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              strokeWidth={2}
              dot={{ fill: series.color, r: 3 }}
              activeDot={{ r: 5 }}
              hide={hiddenSeries.has(series.key)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default EngagementTimeSeries;
