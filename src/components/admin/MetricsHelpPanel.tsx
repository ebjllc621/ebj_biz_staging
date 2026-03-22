/**
 * MetricsHelpPanel - Database Metrics Help and Documentation
 *
 * Provides contextual help for all database metrics including:
 * - What each metric measures
 * - Expected baseline values
 * - Warning indicators
 * - Troubleshooting steps
 *
 * @authority Build Map v2.1 ENHANCED
 * @tier SIMPLE (admin documentation component)
 * @phase Database Manager Charts Enhancement
 */

'use client';

import { memo, useState, useMemo } from 'react';
import { DATABASE_METRICS_HELP, MetricHelp, METRIC_THRESHOLDS } from '@core/constants/database-metrics-help';

interface MetricsHelpPanelProps {
  /** Optional: Highlight specific metrics based on current issues */
  highlightMetrics?: string[];
  /** Start collapsed or expanded */
  defaultExpanded?: boolean;
}

/**
 * MetricCard - Individual metric help card
 */
const MetricCard = memo(function MetricCard({
  metricKey,
  help,
  highlighted
}: {
  metricKey: string;
  help: MetricHelp;
  highlighted: boolean;
}) {
  const [expanded, setExpanded] = useState(highlighted);

  const threshold = METRIC_THRESHOLDS[metricKey as keyof typeof METRIC_THRESHOLDS];

  // Human-readable metric name
  const metricName = useMemo(() => {
    const nameMap: Record<string, string> = {
      queriesPerMinute: 'Queries per Minute',
      avgLatencyMs: 'Average Latency',
      p95LatencyMs: 'P95 Latency',
      poolUtilization: 'Pool Utilization',
      activeConnections: 'Active Connections',
      idleConnections: 'Idle Connections',
      waitingQueue: 'Waiting Queue',
      connectionErrors: 'Connection Errors',
      memoryUsage: 'Memory Usage',
      peakUtilization: 'Peak Utilization',
      totalQueries: 'Total Queries',
      totalErrors: 'Total Errors'
    };
    return nameMap[metricKey] || metricKey;
  }, [metricKey]);

  return (
    <div className={`border rounded-lg overflow-hidden ${
      highlighted ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex justify-between items-center text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {highlighted && (
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          )}
          <span className="font-medium text-sm">{metricName}</span>
        </div>
        <span className="text-gray-600">{expanded ? '\u25BC' : '\u25B6'}</span>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t bg-white">
          {/* Description */}
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              What it measures
            </div>
            <p className="text-sm text-gray-700">{help.description}</p>
          </div>

          {/* Baseline */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Expected baseline
            </div>
            <p className="text-sm text-gray-700">{help.baseline}</p>
          </div>

          {/* Thresholds if applicable */}
          {threshold && (threshold.warning || threshold.critical) && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Alert thresholds
              </div>
              <div className="flex gap-4 text-sm">
                {threshold.warning && (
                  <span className="text-amber-600">
                    Warning: {threshold.warning}{metricKey.includes('Latency') ? 'ms' : metricKey.includes('Usage') || metricKey.includes('Utilization') ? '%' : ''}
                  </span>
                )}
                {threshold.critical && (
                  <span className="text-red-600">
                    Critical: {threshold.critical}{metricKey.includes('Latency') ? 'ms' : metricKey.includes('Usage') || metricKey.includes('Utilization') ? '%' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              When to worry
            </div>
            <p className="text-sm text-gray-700">{help.warning}</p>
          </div>

          {/* Troubleshooting */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Troubleshooting steps
            </div>
            <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
              {help.troubleshooting.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * MetricsHelpPanel - Main panel with all metric documentation
 */
export const MetricsHelpPanel = memo(function MetricsHelpPanel({
  highlightMetrics = [],
  defaultExpanded = false
}: MetricsHelpPanelProps) {
  const [isPanelExpanded, setIsPanelExpanded] = useState(defaultExpanded);
  const [searchQuery, setSearchQuery] = useState('');

  // Group metrics by category
  const metricCategories = useMemo(() => ({
    activity: ['queriesPerMinute', 'totalQueries', 'avgLatencyMs', 'p95LatencyMs'],
    connections: ['poolUtilization', 'activeConnections', 'idleConnections', 'waitingQueue', 'peakUtilization'],
    health: ['connectionErrors', 'totalErrors', 'memoryUsage']
  }), []);

  // Filter metrics based on search
  const filteredMetrics = useMemo(() => {
    if (!searchQuery.trim()) {
      return Object.entries(DATABASE_METRICS_HELP);
    }
    const query = searchQuery.toLowerCase();
    return Object.entries(DATABASE_METRICS_HELP).filter(([key, help]) =>
      key.toLowerCase().includes(query) ||
      help.description.toLowerCase().includes(query) ||
      help.troubleshooting.some(t => t.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Check if any highlighted metrics exist
  const hasHighlighted = highlightMetrics.length > 0;

  return (
    <div className="bg-white p-6 rounded shadow">
      {/* Header */}
      <button
        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
        className="w-full flex justify-between items-center"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Metrics Help</h3>
          {hasHighlighted && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
              {highlightMetrics.length} issue{highlightMetrics.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-gray-600 text-lg">{isPanelExpanded ? '\u25BC' : '\u25B6'}</span>
      </button>

      {/* Subtitle when collapsed */}
      {!isPanelExpanded && (
        <p className="mt-2 text-sm text-gray-600">
          Click to expand metric descriptions, baselines, and troubleshooting guidance
        </p>
      )}

      {/* Expanded Content */}
      {isPanelExpanded && (
        <div className="mt-4 space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            <span className="text-xs text-gray-500">Jump to:</span>
            <button
              onClick={() => setSearchQuery('queries latency')}
              className="text-xs text-blue-600 hover:underline"
            >
              Activity
            </button>
            <button
              onClick={() => setSearchQuery('pool connection')}
              className="text-xs text-blue-600 hover:underline"
            >
              Connections
            </button>
            <button
              onClick={() => setSearchQuery('error memory')}
              className="text-xs text-blue-600 hover:underline"
            >
              Health
            </button>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-gray-500 hover:underline"
            >
              Clear
            </button>
          </div>

          {/* Highlighted Metrics First (if any issues) */}
          {hasHighlighted && !searchQuery && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-amber-700">Needs Attention</div>
              {highlightMetrics.map(metricKey => {
                const help = DATABASE_METRICS_HELP[metricKey];
                if (!help) return null;
                return (
                  <MetricCard
                    key={metricKey}
                    metricKey={metricKey}
                    help={help}
                    highlighted={true}
                  />
                );
              })}
            </div>
          )}

          {/* All Metrics */}
          <div className="space-y-2">
            {!hasHighlighted && !searchQuery && (
              <div className="text-sm font-medium text-gray-600">All Metrics</div>
            )}
            {searchQuery && (
              <div className="text-sm text-gray-600">
                {filteredMetrics.length} result{filteredMetrics.length !== 1 ? 's' : ''}
              </div>
            )}
            {filteredMetrics.map(([key, help]) => {
              // Skip highlighted metrics if they're shown above
              if (hasHighlighted && highlightMetrics.includes(key) && !searchQuery) {
                return null;
              }
              return (
                <MetricCard
                  key={key}
                  metricKey={key}
                  help={help}
                  highlighted={false}
                />
              );
            })}
          </div>

          {/* Empty State */}
          {filteredMetrics.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No metrics match your search
            </div>
          )}
        </div>
      )}
    </div>
  );
});
