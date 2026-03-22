/**
 * ActivityChartsPanel - pgAdmin-style Activity Charts Display
 *
 * Displays real-time line charts for database activity monitoring:
 * - Queries per minute
 * - Query latency trends (avg + P95)
 * - Connection pool usage (active/idle)
 * - Pool utilization %
 * - Connection acquisition time
 * - Memory usage trend
 * - Errors
 * - Query type breakdown (SELECT/INSERT/UPDATE/DELETE)
 *
 * @authority Build Map v2.1 ENHANCED
 * @tier STANDARD (admin monitoring component)
 * @phase Database Manager Charts Enhancement
 * @updated 2026-01-24 - Added 4 new charts: P95 Latency, Pool Utilization, Acquisition Time, Memory Trend
 */

'use client';

import { memo, useMemo } from 'react';
import { MiniLineChart } from '@/components/ui/MiniLineChart';
import { MultiLineChart } from '@/components/ui/MultiLineChart';
import type { DatabaseHealthResponse } from '@core/types/health';
import type { MetricsHistoryPoint, QueryTypeHistoryPoint, QueryTypeCounters, MemoryHistoryPoint } from '@core/services/ConnectionPoolManager';
import { METRIC_THRESHOLDS } from '@core/constants/database-metrics-help';

interface ActivityChartsPanelProps {
  /** History data points for charts */
  history: MetricsHistoryPoint[];
  /** Query type counters for current breakdown */
  queryTypes: QueryTypeCounters;
  /** Query type history for chart */
  queryTypeHistory: QueryTypeHistoryPoint[];
  /** Pool metrics for current values */
  metrics: DatabaseHealthResponse['pool']['metrics'];
  /** Pool stats for current utilization */
  poolStats?: DatabaseHealthResponse['pool']['stats'];
  /** Memory data for memory trend chart */
  memory?: DatabaseHealthResponse['memory'];
  /** Memory history for trend chart (optional, will be derived if not provided) */
  memoryHistory?: MemoryHistoryPoint[];
}

/**
 * QueryTypeBar - Horizontal bar showing query type distribution
 */
const QueryTypeBar = memo(function QueryTypeBar({
  queryTypes
}: {
  queryTypes: QueryTypeCounters
}) {
  const total = queryTypes.selects + queryTypes.inserts + queryTypes.updates + queryTypes.deletes + queryTypes.other;

  if (total === 0) {
    return (
      <div className="bg-gray-50 rounded p-3">
        <div className="text-xs font-medium text-gray-600 mb-2">Query Types</div>
        <div className="text-xs text-gray-600 text-center py-2">No queries yet</div>
      </div>
    );
  }

  const types = [
    { name: 'SELECT', count: queryTypes.selects, color: '#3b82f6' },
    { name: 'INSERT', count: queryTypes.inserts, color: '#22c55e' },
    { name: 'UPDATE', count: queryTypes.updates, color: '#f59e0b' },
    { name: 'DELETE', count: queryTypes.deletes, color: '#ef4444' },
    { name: 'OTHER', count: queryTypes.other, color: '#8b5cf6' },
  ].filter(t => t.count > 0);

  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="text-xs font-medium text-gray-600 mb-2">Query Types (Total: {total.toLocaleString()})</div>

      {/* Stacked bar */}
      <div className="h-6 flex rounded overflow-hidden">
        {types.map(type => (
          <div
            key={type.name}
            className="h-full transition-all duration-300"
            style={{
              width: `${(type.count / total) * 100}%`,
              backgroundColor: type.color,
              minWidth: type.count > 0 ? '4px' : '0'
            }}
            title={`${type.name}: ${type.count} (${((type.count / total) * 100).toFixed(1)}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {types.map(type => (
          <div key={type.name} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: type.color }}
            />
            <span className="text-xs text-gray-600">{type.name}:</span>
            <span className="text-xs font-medium">{type.count.toLocaleString()}</span>
            <span className="text-xs text-gray-600">
              ({((type.count / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * ActivityChartsPanel - Main panel displaying activity charts
 *
 * Layout: 2x4 grid of charts
 * Row 1: Queries/min | Avg Latency | P95 Latency | Pool Utilization
 * Row 2: Connections | Errors | Acquisition Time | Memory Trend
 */
export const ActivityChartsPanel = memo(function ActivityChartsPanel(props: ActivityChartsPanelProps) {
  const { history, queryTypes, metrics, poolStats, memory, memoryHistory } = props;
  // Note: queryTypeHistory available in props for future query type trend chart
  // Transform history data for charts
  const queriesPerMinData = useMemo(() => {
    return history.map(h => ({
      timestamp: h.timestamp,
      value: h.queriesPerMinute
    }));
  }, [history]);

  const latencyData = useMemo(() => {
    return history.map(h => ({
      timestamp: h.timestamp,
      value: h.avgLatencyMs
    }));
  }, [history]);

  // NEW: P95 Latency data
  const p95LatencyData = useMemo(() => {
    return history.map(h => ({
      timestamp: h.timestamp,
      value: h.p95LatencyMs || 0
    }));
  }, [history]);

  // NEW: Pool Utilization data
  const poolUtilizationData = useMemo(() => {
    return history.map(h => ({
      timestamp: h.timestamp,
      value: h.poolUtilizationPercent || 0
    }));
  }, [history]);

  // NEW: Acquisition Time data
  const acquisitionTimeData = useMemo(() => {
    return history.map(h => ({
      timestamp: h.timestamp,
      value: h.acquisitionTimeMs || 0
    }));
  }, [history]);

  const connectionsSeriesData = useMemo(() => {
    return [
      {
        name: 'Active',
        color: '#3b82f6',
        data: history.map(h => ({
          timestamp: h.timestamp,
          value: h.activeConnections
        }))
      },
      {
        name: 'Idle',
        color: '#22c55e',
        data: history.map(h => ({
          timestamp: h.timestamp,
          value: h.idleConnections
        }))
      }
    ];
  }, [history]);

  const errorsData = useMemo(() => {
    return history.map(h => ({
      timestamp: h.timestamp,
      value: h.errors
    }));
  }, [history]);

  const hasAnyErrors = useMemo(() => {
    return history.some(h => h.errors > 0);
  }, [history]);

  // Use provided memoryHistory or create a single-point placeholder
  const memoryData = useMemo(() => {
    if (memoryHistory && memoryHistory.length > 0) {
      return memoryHistory;
    }
    // If no history, create a single point from current memory value
    if (memory) {
      return [{
        timestamp: Date.now(),
        value: memory.usagePercent.value
      }];
    }
    return [];
  }, [memoryHistory, memory]);

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Activity Monitor</h3>
        <div className="text-xs text-gray-500">
          {history.length > 0 ? `${history.length} data points (5 min window)` : 'Collecting data...'}
        </div>
      </div>

      {/* Charts Grid - 4 columns */}
      <div className="grid grid-cols-4 gap-4">
        {/* Row 1 */}

        {/* Queries per Minute */}
        <MiniLineChart
          data={queriesPerMinData}
          label="Queries/min"
          currentValue={metrics.queriesPerMinute}
          color="#3b82f6"
          height={80}
          showArea={true}
        />

        {/* Average Latency */}
        <MiniLineChart
          data={latencyData}
          label="Avg Latency"
          currentValue={metrics.avgLatencyMs}
          unit="ms"
          color="#8b5cf6"
          height={80}
          showArea={true}
          threshold={METRIC_THRESHOLDS.avgLatencyMs}
        />

        {/* P95 Latency (NEW) */}
        <MiniLineChart
          data={p95LatencyData}
          label="P95 Latency"
          currentValue={metrics.p95LatencyMs}
          unit="ms"
          color="#f97316"
          height={80}
          showArea={true}
          threshold={METRIC_THRESHOLDS.p95LatencyMs}
        />

        {/* Pool Utilization (NEW) */}
        <MiniLineChart
          data={poolUtilizationData}
          label="Pool Utilization"
          currentValue={poolStats?.utilizationPercent || 0}
          unit="%"
          color="#06b6d4"
          height={80}
          showArea={true}
          threshold={METRIC_THRESHOLDS.poolUtilization}
        />

        {/* Row 2 */}

        {/* Active vs Idle Connections */}
        <MultiLineChart
          series={connectionsSeriesData}
          label="Connections (Active/Idle)"
          height={80}
          legend={true}
        />

        {/* Errors (only show if there have been errors) */}
        {hasAnyErrors ? (
          <MiniLineChart
            data={errorsData}
            label="Errors (5 min)"
            currentValue={metrics.connectionErrorsLast5Min}
            color="#ef4444"
            height={80}
            showArea={false}
          />
        ) : (
          <div className="bg-gray-50 rounded p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600">Errors (5 min)</span>
              <span className="text-sm font-bold text-green-600">0</span>
            </div>
            <div className="flex items-center justify-center h-[60px] text-xs text-gray-600">
              No errors recorded
            </div>
          </div>
        )}

        {/* Acquisition Time (NEW) */}
        <MiniLineChart
          data={acquisitionTimeData}
          label="Conn. Acquisition"
          currentValue={metrics.avgAcquisitionTimeMs}
          unit="ms"
          color="#10b981"
          height={80}
          showArea={true}
          threshold={{ warning: 5, critical: 20 }}
        />

        {/* Memory Trend (NEW) */}
        {memory ? (
          <MiniLineChart
            data={memoryData}
            label="Memory Usage"
            currentValue={memory.usagePercent.value}
            unit="%"
            color="#ec4899"
            height={80}
            showArea={true}
            threshold={METRIC_THRESHOLDS.memoryUsage}
          />
        ) : (
          <div className="bg-gray-50 rounded p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600">Memory Usage</span>
              <span className="text-sm font-bold text-gray-600">--</span>
            </div>
            <div className="flex items-center justify-center h-[60px] text-xs text-gray-600">
              No memory data
            </div>
          </div>
        )}
      </div>

      {/* Query Type Distribution */}
      <div className="mt-4">
        <QueryTypeBar queryTypes={queryTypes} />
      </div>

      {/* Chart Legend/Info */}
      <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
        <div>
          Data refreshes every 5 seconds
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0' }}></span>
            Warning threshold
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-red-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0' }}></span>
            Critical threshold
          </span>
        </div>
      </div>
    </div>
  );
});
