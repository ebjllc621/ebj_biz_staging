/**
 * MultiLineChart - Multi-series SVG line chart for comparisons
 *
 * Displays multiple data series on the same chart with legend.
 * Used for comparing related metrics (e.g., Active vs Idle connections).
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

interface Series {
  name: string;
  data: DataPoint[];
  color: string;
}

interface MultiLineChartProps {
  /** Array of data series to display */
  series: Series[];
  /** Chart label displayed above */
  label: string;
  /** Chart height in pixels */
  height?: number;
  /** Show legend below chart */
  legend?: boolean;
  /** Show filled area below lines */
  showArea?: boolean;
}

/**
 * MultiLineChart - Displays multiple line series for comparison
 */
export const MultiLineChart = memo(function MultiLineChart({
  series,
  label,
  height = 80,
  legend = true,
  showArea = false
}: MultiLineChartProps) {
  const chartData = useMemo(() => {
    // Collect all values to determine scale
    const allValues = series.flatMap(s => s.data.map(d => d.value));
    if (allValues.length === 0) {
      return { seriesData: [], minValue: 0, maxValue: 100 };
    }

    let minValue = Math.min(...allValues, 0);
    let maxValue = Math.max(...allValues);

    // Ensure we have some range
    if (maxValue === minValue) {
      maxValue = minValue + 10;
    }

    const range = maxValue - minValue;
    const padding = 4;
    const chartWidth = 200;
    const chartHeight = height - 20;

    // Generate paths for each series
    const seriesData = series.map(s => {
      if (s.data.length === 0) {
        return { ...s, points: '', areaPath: '', latestValue: 0 };
      }

      const points = s.data.map((point, index) => {
        const x = padding + (index / (s.data.length - 1 || 1)) * (chartWidth - padding * 2);
        const y = padding + (1 - (point.value - minValue) / range) * (chartHeight - padding * 2);
        return `${x},${y}`;
      }).join(' ');

      const areaPath = `M ${padding},${chartHeight - padding} ` +
        s.data.map((point, index) => {
          const x = padding + (index / (s.data.length - 1 || 1)) * (chartWidth - padding * 2);
          const y = padding + (1 - (point.value - minValue) / range) * (chartHeight - padding * 2);
          return `L ${x},${y}`;
        }).join(' ') +
        ` L ${chartWidth - padding},${chartHeight - padding} Z`;

      return {
        ...s,
        points,
        areaPath,
        latestValue: s.data[s.data.length - 1]?.value ?? 0
      };
    });

    return {
      seriesData,
      minValue,
      maxValue,
      range,
      chartWidth,
      chartHeight,
      padding
    };
  }, [series, height]);

  return (
    <div className="bg-gray-50 rounded p-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 200 ${height - 20}`}
        className="w-full"
        style={{ height: height - 20 }}
      >
        {/* Background grid */}
        <line x1="4" y1={height - 24} x2="196" y2={height - 24} stroke="#e5e7eb" strokeWidth="1" />

        {/* Series */}
        {chartData.seriesData.map((s, index) => (
          <g key={s.name}>
            {/* Area fill */}
            {showArea && s.areaPath && (
              <path
                d={s.areaPath}
                fill={s.color}
                opacity="0.1"
              />
            )}

            {/* Line */}
            {s.points && (
              <polyline
                points={s.points}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Current value dot */}
            {s.data.length > 0 && chartData.range && (
              <circle
                cx={196}
                cy={4 + (1 - (s.latestValue - chartData.minValue) / chartData.range) * (height - 28)}
                r="3"
                fill={s.color}
              />
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      {legend && (
        <div className="flex flex-wrap gap-3 mt-2">
          {chartData.seriesData.map(s => (
            <div key={s.name} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs text-gray-600">{s.name}:</span>
              <span className="text-xs font-medium" style={{ color: s.color }}>
                {s.latestValue.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {series.every(s => s.data.length === 0) && (
        <div className="text-xs text-gray-600 text-center py-2">
          No data yet
        </div>
      )}
    </div>
  );
});
