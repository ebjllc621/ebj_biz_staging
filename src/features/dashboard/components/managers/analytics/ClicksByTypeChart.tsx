/**
 * ClicksByTypeChart - Horizontal Bar Chart for Click Event Breakdown
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Displays breakdown of click events by type (phone, email, website, directions, etc.)
 */
'use client';

import React from 'react';
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
import { MousePointerClick } from 'lucide-react';

export interface ClickByTypeData {
  eventName: string;
  count: number;
}

export interface ClicksByTypeChartProps {
  /** Clicks by type data */
  data: ClickByTypeData[];
}

// Color palette for bars
const COLORS = ['#ed6437', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

// Friendly display names for event types
const EVENT_DISPLAY_NAMES: Record<string, string> = {
  listing_phone_click: 'Phone Clicks',
  listing_email_click: 'Email Clicks',
  listing_website_click: 'Website Visits',
  listing_directions_click: 'Get Directions',
  listing_map_click: 'Map Views',
  listing_favorite: 'Favorites',
  listing_share: 'Shares',
  listing_contact_click: 'Contact Button',
  listing_quote_open: 'Quote Requests'
};

/**
 * Format event name to display-friendly text
 */
function formatEventName(eventName: string): string {
  return EVENT_DISPLAY_NAMES[eventName] ||
    eventName
      .replace('listing_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
}

export function ClicksByTypeChart({ data }: ClicksByTypeChartProps) {
  // Transform data with friendly names
  const chartData = data.map(item => ({
    ...item,
    displayName: formatEventName(item.eventName)
  }));

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MousePointerClick className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">Click Breakdown</h3>
      </div>

      {data.length === 0 ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
          <MousePointerClick className="w-12 h-12 text-gray-300 mb-2" />
          <p>No click data recorded yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Clicks will appear as users interact with your listing
          </p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                width={110}
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
                formatter={(value: number | undefined) => [value ?? 0, 'Clicks']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Summary stats - Shows ALL click types with percentages */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-gray-600">Total Clicks</span>
              <span className="font-semibold text-gray-900">{total}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {chartData.map((item, index) => (
                <div key={item.eventName} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-600 truncate">{item.displayName}</span>
                  <span className="font-medium text-gray-900 ml-auto">
                    {total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}%
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

export default ClicksByTypeChart;
