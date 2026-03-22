/**
 * AnalyticsChart - Reusable chart component for analytics visualization
 *
 * Supports bar charts, line trends, and percentage displays.
 * Mobile-responsive with touch-friendly interactions.
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 6
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 */

'use client';

import React, { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type ChartType = 'bar' | 'trend' | 'progress';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface TrendDataPoint {
  date: string;
  value: number;
}

interface AnalyticsChartProps {
  /** Chart type */
  type: ChartType;
  /** Chart title */
  title: string;
  /** Data points for bar/progress charts */
  data?: ChartDataPoint[];
  /** Trend data points for line charts */
  trendData?: TrendDataPoint[];
  /** Total for percentage calculations */
  total?: number;
  /** Height class */
  height?: 'sm' | 'md' | 'lg';
  /** Show percentage labels */
  showPercentage?: boolean;
  /** Primary color for bars */
  primaryColor?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Bar chart visualization
 */
function BarChart({
  data,
  total,
  showPercentage,
  primaryColor = 'bg-blue-500'
}: {
  data: ChartDataPoint[];
  total: number;
  showPercentage?: boolean;
  primaryColor?: string;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const barWidth = (item.value / maxValue) * 100;

        return (
          <div key={`${item.label}-${index}`} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate max-w-[60%]">{item.label}</span>
              <span className="font-medium text-gray-900 flex items-center gap-2">
                {item.value}
                {showPercentage && (
                  <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${item.color || primaryColor}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Trend visualization (simplified line display)
 */
function TrendChart({
  data,
  height = 'md'
}: {
  data: TrendDataPoint[];
  height?: 'sm' | 'md' | 'lg';
}) {
  const heightClasses = {
    sm: 'h-24',
    md: 'h-32',
    lg: 'h-48'
  };

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value));
  const firstValue = data[0]?.value ?? 0;
  const lastValue = data[data.length - 1]?.value ?? 0;
  const trend = data.length > 1 ? lastValue - firstValue : 0;

  // Calculate trend percentage
  const trendPercentage = firstValue > 0
    ? ((trend / firstValue) * 100).toFixed(1)
    : '0';

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="space-y-3">
      {/* Trend indicator */}
      <div className="flex items-center gap-2">
        <TrendIcon className={`w-5 h-5 ${trendColor}`} />
        <span className={`text-sm font-medium ${trendColor}`}>
          {trend > 0 ? '+' : ''}{trendPercentage}% from start
        </span>
      </div>

      {/* Simple bar visualization of trend */}
      <div className={`${heightClasses[height]} flex items-end gap-1`}>
        {data.map((point, index) => {
          const barHeight = maxValue > 0
            ? ((point.value - minValue) / (maxValue - minValue || 1)) * 100
            : 0;

          return (
            <div
              key={`${point.date}-${index}`}
              className="flex-1 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 min-h-[4px]"
              style={{ height: `${Math.max(barHeight, 5)}%` }}
              title={`${point.date}: ${point.value}`}
            />
          );
        })}
      </div>

      {/* Date labels (first and last) */}
      {data.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{data[0]?.date ?? ''}</span>
          <span>{data[data.length - 1]?.date ?? ''}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Progress ring visualization
 */
function ProgressChart({
  data,
  total
}: {
  data: ChartDataPoint[];
  total: number;
}) {
  const percentage = total > 0 && data[0]
    ? Math.round((data[0].value / total) * 100)
    : 0;

  // SVG circle progress
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center justify-center py-4">
      <div className="relative">
        <svg width="100" height="100" className="-rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-blue-500 transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AnalyticsChart = memo(function AnalyticsChart({
  type,
  title,
  data = [],
  trendData = [],
  total = 0,
  height = 'md',
  showPercentage = true,
  primaryColor = 'bg-blue-500'
}: AnalyticsChartProps) {
  const content = useMemo(() => {
    switch (type) {
      case 'bar':
        return (
          <BarChart
            data={data}
            total={total || data.reduce((sum, d) => sum + d.value, 0)}
            showPercentage={showPercentage}
            primaryColor={primaryColor}
          />
        );

      case 'trend':
        return (
          <TrendChart
            data={trendData}
            height={height}
          />
        );

      case 'progress':
        return (
          <ProgressChart
            data={data}
            total={total}
          />
        );

      default:
        return null;
    }
  }, [type, data, trendData, total, height, showPercentage, primaryColor]);

  if (!content) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {content}
    </div>
  );
});

export default AnalyticsChart;
