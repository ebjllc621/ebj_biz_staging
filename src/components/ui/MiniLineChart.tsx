/**
 * MiniLineChart - Lightweight SVG line chart for metrics
 *
 * A simple, dependency-free line chart using pure SVG.
 * Designed for real-time monitoring dashboards.
 *
 * @authority Build Map v2.1 ENHANCED
 * @tier SIMPLE (reusable UI component)
 * @phase Database Manager Charts Enhancement
 */

'use client';

import { memo, useMemo } from 'react';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface MiniLineChartProps {
  /** Array of data points to display */
  data: DataPoint[];
  /** Chart label displayed above */
  label: string;
  /** Current value to highlight */
  currentValue?: number;
  /** Unit for display (e.g., "ms", "%") */
  unit?: string;
  /** Line color (default: blue) */
  color?: string;
  /** Chart height in pixels */
  height?: number;
  /** Show filled area below line */
  showArea?: boolean;
  /** Optional threshold lines */
  threshold?: { warning: number; critical: number };
}

/**
 * MiniLineChart - Displays a compact line chart for metrics
 */
export const MiniLineChart = memo(function MiniLineChart({
  data,
  label,
  currentValue,
  unit = '',
  color = '#3b82f6',
  height = 80,
  showArea = true,
  threshold
}: MiniLineChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) {
      return { points: '', areaPath: '', minValue: 0, maxValue: 100, latestValue: 0 };
    }

    const values = data.map(d => d.value);
    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);

    // Ensure we have some range, and include thresholds if provided
    if (threshold) {
      maxValue = Math.max(maxValue, threshold.critical * 1.1);
    }
    if (maxValue === minValue) {
      maxValue = minValue + 10;
      minValue = Math.max(0, minValue - 10);
    }

    const range = maxValue - minValue;
    const padding = 4;
    const chartWidth = 200;
    const chartHeight = height - 20; // Leave room for label

    // Generate SVG path points
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * (chartWidth - padding * 2);
      const y = padding + (1 - (point.value - minValue) / range) * (chartHeight - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    // Generate area path (for filled area below line)
    const areaPath = data.length > 0
      ? `M ${padding},${chartHeight - padding} ` +
        data.map((point, index) => {
          const x = padding + (index / (data.length - 1 || 1)) * (chartWidth - padding * 2);
          const y = padding + (1 - (point.value - minValue) / range) * (chartHeight - padding * 2);
          return `L ${x},${y}`;
        }).join(' ') +
        ` L ${chartWidth - padding},${chartHeight - padding} Z`
      : '';

    return {
      points,
      areaPath,
      minValue,
      maxValue,
      latestValue: data[data.length - 1]?.value ?? 0,
      chartWidth,
      chartHeight,
      range,
      padding
    };
  }, [data, height, threshold]);

  const thresholdLines = useMemo(() => {
    if (!threshold || !chartData.range) return null;

    const { padding, chartHeight, minValue, range, chartWidth } = chartData;

    const warningY = padding + (1 - (threshold.warning - minValue) / range) * (chartHeight - padding * 2);
    const criticalY = padding + (1 - (threshold.critical - minValue) / range) * (chartHeight - padding * 2);

    return (
      <>
        {threshold.warning >= minValue && threshold.warning <= chartData.maxValue && (
          <line
            x1={padding}
            y1={warningY}
            x2={chartWidth - padding}
            y2={warningY}
            stroke="#f59e0b"
            strokeWidth="1"
            strokeDasharray="4,2"
            opacity="0.6"
          />
        )}
        {threshold.critical >= minValue && threshold.critical <= chartData.maxValue && (
          <line
            x1={padding}
            y1={criticalY}
            x2={chartWidth - padding}
            y2={criticalY}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="4,2"
            opacity="0.6"
          />
        )}
      </>
    );
  }, [threshold, chartData]);

  const displayValue = currentValue !== undefined ? currentValue : chartData.latestValue;
  const valueColor = threshold
    ? displayValue >= threshold.critical
      ? '#ef4444'
      : displayValue >= threshold.warning
        ? '#f59e0b'
        : '#10b981'
    : color;

  return (
    <div className="bg-gray-50 rounded p-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-sm font-bold" style={{ color: valueColor }}>
          {displayValue.toFixed(1)}{unit}
        </span>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 200 ${height - 20}`}
        className="w-full"
        style={{ height: height - 20 }}
      >
        {/* Background grid */}
        <line x1="4" y1={height - 24} x2="196" y2={height - 24} stroke="#e5e7eb" strokeWidth="1" />

        {/* Threshold lines */}
        {thresholdLines}

        {/* Area fill */}
        {showArea && chartData.areaPath && (
          <path
            d={chartData.areaPath}
            fill={color}
            opacity="0.1"
          />
        )}

        {/* Line */}
        {chartData.points && (
          <polyline
            points={chartData.points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Current value dot */}
        {data.length > 0 && chartData.range && (
          <circle
            cx={196}
            cy={4 + (1 - (chartData.latestValue - chartData.minValue) / chartData.range) * (height - 28)}
            r="3"
            fill={valueColor}
          />
        )}
      </svg>

      {/* Empty state */}
      {data.length === 0 && (
        <div className="text-xs text-gray-600 text-center py-2">
          No data yet
        </div>
      )}
    </div>
  );
});
