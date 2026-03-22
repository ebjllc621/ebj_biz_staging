/**
 * ViewsTrendChart - Line Chart for Views Over Time
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Uses Recharts to display views trend with orange theme
 */
'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export interface ViewsTrendData {
  date: string;
  views: number;
}

export interface ViewsTrendChartProps {
  /** Trend data */
  data: ViewsTrendData[];
}

export function ViewsTrendChart({ data }: ViewsTrendChartProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Views Over Time</h3>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No data available for selected period
        </div>
      ) : (
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
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#ed6437"
              strokeWidth={2}
              dot={{ fill: '#ed6437', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default ViewsTrendChart;
