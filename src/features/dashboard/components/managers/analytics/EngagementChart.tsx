/**
 * EngagementChart - Area Chart for Engagement Metrics
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Uses Recharts to display engagement metrics (CTR, bounce rate, avg time)
 */
'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

// Metric display names (abbreviations expanded)
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  CTR: 'CTR (Click-Through Rate)',
  'Avg Time': 'Avg Time on Page',
  'Bounce Rate': 'Bounce Rate'
};

// Metric descriptions and guidance
const METRIC_INFO: Record<string, { description: string; howToUse: string; benchmark: string }> = {
  CTR: {
    description: 'Click-Through Rate measures how often viewers click on your listing after seeing it.',
    howToUse: 'A higher CTR indicates your listing title, images, and preview are compelling. If low, consider improving your main photo or business description.',
    benchmark: 'Good: 2-5% | Excellent: 5%+'
  },
  'Avg Time': {
    description: 'Average time visitors spend viewing your listing details page.',
    howToUse: 'Longer time suggests engaging content. If under 30 seconds, visitors may not find what they need. Add more photos, detailed services, or customer testimonials.',
    benchmark: 'Good: 1-2 min | Excellent: 3+ min'
  },
  'Bounce Rate': {
    description: 'Percentage of visitors who leave after viewing only this page without taking action.',
    howToUse: 'Lower is better. High bounce rates may indicate mismatched expectations or missing contact info. Ensure your listing answers common customer questions.',
    benchmark: 'Good: 40-60% | Excellent: <40%'
  }
};

export interface EngagementMetric {
  metric: string;
  value: number;
  unit: string;
}

export interface EngagementChartProps {
  /** Engagement metrics */
  data: EngagementMetric[];
}

export function EngagementChart({ data }: EngagementChartProps) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const toggleMetric = (metric: string) => {
    setExpandedMetric(expandedMetric === metric ? null : metric);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Engagement Metrics</h3>
        <div className="group relative">
          <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            These metrics show how visitors interact with your listing. Click any metric below for tips on improvement.
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No engagement data available
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ed6437" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ed6437" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="metric"
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
                formatter={(value: number | undefined) => [
                  typeof value === 'number' ? value.toFixed(2) : String(value ?? 0),
                  'Value'
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#ed6437"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Metrics Summary with Descriptions */}
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.map((item) => {
                const info = METRIC_INFO[item.metric];
                const isExpanded = expandedMetric === item.metric;

                return (
                  <div key={item.metric} className="text-center">
                    <button
                      onClick={() => toggleMetric(item.metric)}
                      className="w-full group hover:bg-gray-50 rounded-lg p-2 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-sm text-gray-600">
                          {METRIC_DISPLAY_NAMES[item.metric] || item.metric}
                        </p>
                        {info && (
                          isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )
                        )}
                      </div>
                      <p className="text-2xl font-bold text-orange-600">
                        {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                        {item.unit}
                      </p>
                      {info && (
                        <p className="text-xs text-gray-400 mt-1">{info.benchmark}</p>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Expanded Metric Details */}
            {expandedMetric && METRIC_INFO[expandedMetric] && (
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">What is {expandedMetric}?</p>
                    <p className="text-sm text-gray-600">{METRIC_INFO[expandedMetric].description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">How to improve</p>
                    <p className="text-sm text-gray-600">{METRIC_INFO[expandedMetric].howToUse}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default EngagementChart;
