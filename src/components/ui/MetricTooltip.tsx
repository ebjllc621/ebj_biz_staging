/**
 * MetricTooltip - Hover tooltip for metric descriptions
 *
 * Simple tooltip that appears on hover to explain what a metric means.
 * Uses CSS-only approach for performance.
 *
 * @authority Build Map v2.1 ENHANCED
 * @tier SIMPLE (reusable UI component)
 * @phase Database Manager Charts Enhancement
 */

'use client';

import { memo, ReactNode } from 'react';

interface MetricTooltipProps {
  /** The label text to display */
  label: string;
  /** Tooltip content (description) */
  tooltip: string;
  /** Optional: Additional baseline info */
  baseline?: string;
  /** Children to render (typically the value) */
  children: ReactNode;
  /** Optional: Show warning color if true */
  warning?: boolean;
  /** Optional: Show critical color if true */
  critical?: boolean;
}

/**
 * MetricTooltip - Wraps a metric row with hover tooltip
 */
export const MetricTooltip = memo(function MetricTooltip({
  label,
  tooltip,
  baseline,
  children,
  warning = false,
  critical = false
}: MetricTooltipProps) {
  const valueClass = critical
    ? 'text-red-600 font-medium'
    : warning
      ? 'text-amber-600 font-medium'
      : 'font-medium';

  return (
    <div className="flex justify-between group relative">
      <span className="text-gray-600 cursor-help border-b border-dotted border-gray-400">
        {label}
        {/* Tooltip */}
        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
          <div className="font-medium mb-1">{label}</div>
          <div className="text-gray-300">{tooltip}</div>
          {baseline && (
            <div className="mt-2 pt-2 border-t border-gray-700 text-gray-600">
              <span className="font-medium text-gray-300">Baseline:</span> {baseline}
            </div>
          )}
          {/* Arrow */}
          <div className="absolute left-4 bottom-0 transform translate-y-full">
            <div className="border-8 border-transparent border-t-gray-900" />
          </div>
        </div>
      </span>
      <span className={valueClass}>{children}</span>
    </div>
  );
});

/**
 * Quick metric descriptions for Connection Pool Health panel
 * Extracted from database-metrics-help.ts for inline use
 */
export const METRIC_TOOLTIPS = {
  // Activity metrics
  totalQueries: {
    label: 'Total Queries',
    tooltip: 'Total database queries executed since server start. Shows overall database activity.',
    baseline: 'Varies by app. Compare with previous periods.'
  },
  queriesPerMinute: {
    label: 'Queries/min',
    tooltip: 'Average queries per minute over the last 5 minutes. Shows current database load.',
    baseline: '10-100 low traffic, 100-1000 moderate, 1000+ high traffic'
  },
  avgLatencyMs: {
    label: 'Avg Latency',
    tooltip: 'Average time to execute a query (ms). Includes network, execution, and transfer time.',
    baseline: 'Healthy: <50ms, Acceptable: 50-200ms, Concerning: >200ms'
  },
  p95LatencyMs: {
    label: 'p95 Latency',
    tooltip: '95th percentile latency - 95% of queries are faster than this. Shows worst-case user experience.',
    baseline: 'Should be <3x average. Large gap indicates inconsistent performance.'
  },

  // Pool status
  configuredMax: {
    label: 'Configured Max',
    tooltip: 'Maximum connections allowed in the pool. Set via DB_CONNECTION_LIMIT in .env.',
    baseline: 'Typically 10-50 depending on server resources.'
  },
  activeConnections: {
    label: 'Current Active',
    tooltip: 'Connections currently executing queries. Usually low since queries complete quickly.',
    baseline: 'Usually 0-5. High values indicate slow queries.'
  },
  idleConnections: {
    label: 'Current Idle',
    tooltip: 'Connections ready for use but not executing. Pool keeps these for fast acquisition.',
    baseline: 'Having idle connections is good - means quick acquisition.'
  },
  waitingQueue: {
    label: 'Waiting Queue',
    tooltip: 'Requests waiting for a connection. Any value >0 means pool is exhausted!',
    baseline: 'Should always be 0. Any waiting is a critical issue.'
  },

  // Capacity
  peakUtilization: {
    label: 'Peak Utilization',
    tooltip: 'Highest pool utilization since server start. Shows maximum load experienced.',
    baseline: 'Should stay <90%. If consistently high, increase pool size.'
  },
  peakConnections: {
    label: 'Peak Connections',
    tooltip: 'Maximum concurrent active connections recorded since server start.',
    baseline: 'Compare to Configured Max. If close, consider increasing.'
  },
  avgAcquisition: {
    label: 'Avg Acquisition',
    tooltip: 'Average time to get a connection from the pool (ms). Should be near-instant.',
    baseline: 'Healthy: <5ms. High values indicate pool exhaustion.'
  },

  // Health
  errorsRecent: {
    label: 'Errors (5 min)',
    tooltip: 'Connection failures or query errors in the last 5 minutes. Should be 0.',
    baseline: 'Any errors require investigation.'
  },
  totalErrors: {
    label: 'Total Errors',
    tooltip: 'Total errors since server start. Accumulating errors indicate ongoing issues.',
    baseline: 'Should be 0 or very low.'
  },
  lastQuery: {
    label: 'Last Query',
    tooltip: 'Time since last successful query. Long gaps may indicate connection issues.',
    baseline: 'Should show recent activity during normal operation.'
  }
};
