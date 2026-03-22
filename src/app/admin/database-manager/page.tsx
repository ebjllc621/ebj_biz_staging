/**
 * Admin Database Manager Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminDashboardTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (real-time monitoring, multiple panels)
 *
 * Features:
 * - Real-time database health monitoring
 * - Connection pool status visualization
 * - Cache statistics and management
 * - Service health tracking
 * - Memory usage monitoring
 * - Active alerts display
 * - Cache clear functionality
 *
 * @authority PHASE_5_ADMIN_DATABASE_MANAGER_BRAIN_PLAN.md
 * @component
 * @returns {JSX.Element} Admin database manager dashboard
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { TachometerGauge } from '@/components/ui/TachometerGauge';
import { MetricTooltip, METRIC_TOOLTIPS } from '@/components/ui/MetricTooltip';
import { ActivityChartsPanel } from '@/components/admin/ActivityChartsPanel';
import { MetricsHelpPanel } from '@/components/admin/MetricsHelpPanel';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
// HealthAlertToggle moved to Notification Manager Email Channel
import type { DatabaseHealthResponse, AlertLevel } from '@core/types/health';
import type { ErrorLogEntry } from '@core/services/ConnectionPoolManager';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get environment display info
 */
function getEnvironmentInfo(): {
  environment: 'Development' | 'Staging' | 'Production';
  color: string;
  cacheBackend: string;
  cacheBackendLabel: string;
} {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const cacheBackend = process.env.CACHE_BACKEND || 'local';

  let environment: 'Development' | 'Staging' | 'Production';
  let color: string;

  switch (nodeEnv.toLowerCase()) {
    case 'production':
      environment = 'Production';
      color = 'bg-red-100 text-red-800 border-red-200';
      break;
    case 'staging':
      environment = 'Staging';
      color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      break;
    default:
      environment = 'Development';
      color = 'bg-blue-100 text-blue-800 border-blue-200';
  }

  const cacheBackendLabel = cacheBackend === 'redis' ? 'Redis (Distributed)' : 'Local (In-Memory LRU)';

  return { environment, color, cacheBackend, cacheBackendLabel };
}

/**
 * Get assessment status for a metric based on industry benchmarks
 */
function getCacheAssessment(
  metric: 'sessionHitRate' | 'userHitRate' | 'overallHitRate',
  value: number
): { status: 'excellent' | 'good' | 'normal' | 'warning' | 'critical'; label: string } {
  switch (metric) {
    case 'sessionHitRate':
      // Session cache: 40-70% is typical due to security invalidation
      if (value >= 70) return { status: 'excellent', label: 'Excellent' };
      if (value >= 40) return { status: 'normal', label: 'Normal' };
      if (value >= 30) return { status: 'warning', label: 'Low' };
      return { status: 'critical', label: 'Investigate' };
    case 'userHitRate':
      // User cache: 80-95% is typical
      if (value >= 95) return { status: 'excellent', label: 'Excellent' };
      if (value >= 80) return { status: 'good', label: 'Good' };
      if (value >= 70) return { status: 'warning', label: 'Low' };
      return { status: 'critical', label: 'Investigate' };
    case 'overallHitRate':
      // Combined: 60-80% is typical
      if (value >= 80) return { status: 'excellent', label: 'Excellent' };
      if (value >= 60) return { status: 'good', label: 'Good' };
      if (value >= 50) return { status: 'warning', label: 'Below Average' };
      return { status: 'critical', label: 'Investigate' };
    default:
      return { status: 'normal', label: 'Normal' };
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Overview Status Panel - System-wide health summary
 */
const OverviewStatusPanel = memo(function OverviewStatusPanel({ data }: { data: DatabaseHealthResponse }) {
  const envInfo = useMemo(() => getEnvironmentInfo(), []);

  const statusColors = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    unhealthy: 'bg-red-100 text-red-800 border-red-200'
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">System Overview</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[data.status]}`}>
          {data.status.toUpperCase()}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-4 text-center">
        <div>
          <div className="text-gray-600 text-sm">Environment</div>
          <div className="flex justify-center mt-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${envInfo.color}`}>
              {envInfo.environment}
            </span>
          </div>
        </div>
        <div>
          <div className="text-gray-600 text-sm">Database</div>
          <div className="font-medium text-sm truncate" title={data.database.name}>
            {data.database.name || 'Unknown'}
          </div>
        </div>
        <div>
          <div className="text-gray-600 text-sm">Uptime</div>
          <div className="font-medium">{formatUptime(data.uptime)}</div>
        </div>
        <div>
          <div className="text-gray-600 text-sm">Cache Hit Rate</div>
          <div className="font-medium">{data.cache.stats.overallHitRate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-gray-600 text-sm">Memory Usage</div>
          <div className="font-medium">{data.memory.usagePercent.value.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
});

/**
 * Connection Pool Panel - Enhanced with operational metrics and hover tooltips
 * Shows cumulative/rolling window data instead of useless point-in-time snapshots
 * Hover over any metric label to see description and baseline
 */
const ConnectionPoolPanel = memo(function ConnectionPoolPanel({ data }: { data: DatabaseHealthResponse['pool'] }) {
  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Connection Pool Health</h3>
        <span className="text-xs text-gray-600">Hover labels for info</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Activity Metrics (Left) */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Activity (Last 5 min)</div>
          <div className="space-y-2 text-sm">
            <MetricTooltip
              label={METRIC_TOOLTIPS.totalQueries.label}
              tooltip={METRIC_TOOLTIPS.totalQueries.tooltip}
              baseline={METRIC_TOOLTIPS.totalQueries.baseline}
            >
              {data.metrics.totalQueries.toLocaleString()}
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.queriesPerMinute.label}
              tooltip={METRIC_TOOLTIPS.queriesPerMinute.tooltip}
              baseline={METRIC_TOOLTIPS.queriesPerMinute.baseline}
            >
              {data.metrics.queriesPerMinute}
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.avgLatencyMs.label}
              tooltip={METRIC_TOOLTIPS.avgLatencyMs.tooltip}
              baseline={METRIC_TOOLTIPS.avgLatencyMs.baseline}
              warning={data.metrics.avgLatencyMs >= 100 && data.metrics.avgLatencyMs < 200}
              critical={data.metrics.avgLatencyMs >= 200}
            >
              {data.metrics.avgLatencyMs}ms
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.p95LatencyMs.label}
              tooltip={METRIC_TOOLTIPS.p95LatencyMs.tooltip}
              baseline={METRIC_TOOLTIPS.p95LatencyMs.baseline}
              warning={data.metrics.p95LatencyMs >= 200 && data.metrics.p95LatencyMs < 500}
              critical={data.metrics.p95LatencyMs >= 500}
            >
              {data.metrics.p95LatencyMs}ms
            </MetricTooltip>
          </div>
        </div>

        {/* Pool Status (Right) */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Pool Status</div>
          <div className="space-y-2 text-sm">
            <MetricTooltip
              label={METRIC_TOOLTIPS.configuredMax.label}
              tooltip={METRIC_TOOLTIPS.configuredMax.tooltip}
              baseline={METRIC_TOOLTIPS.configuredMax.baseline}
            >
              {data.stats.total}
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.activeConnections.label}
              tooltip={METRIC_TOOLTIPS.activeConnections.tooltip}
              baseline={METRIC_TOOLTIPS.activeConnections.baseline}
            >
              {data.stats.active}
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.idleConnections.label}
              tooltip={METRIC_TOOLTIPS.idleConnections.tooltip}
              baseline={METRIC_TOOLTIPS.idleConnections.baseline}
            >
              {data.stats.idle}
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.waitingQueue.label}
              tooltip={METRIC_TOOLTIPS.waitingQueue.tooltip}
              baseline={METRIC_TOOLTIPS.waitingQueue.baseline}
              critical={data.stats.waiting > 0}
            >
              {data.stats.waiting}
            </MetricTooltip>
          </div>
        </div>
      </div>

      {/* Capacity & Health Row */}
      <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t">
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Capacity</div>
          <div className="space-y-2 text-sm">
            <MetricTooltip
              label={METRIC_TOOLTIPS.peakUtilization.label}
              tooltip={METRIC_TOOLTIPS.peakUtilization.tooltip}
              baseline={METRIC_TOOLTIPS.peakUtilization.baseline}
              warning={data.metrics.peakUtilizationPercent >= 70 && data.metrics.peakUtilizationPercent < 90}
              critical={data.metrics.peakUtilizationPercent >= 90}
            >
              {data.metrics.peakUtilizationPercent.toFixed(1)}%
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.peakConnections.label}
              tooltip={METRIC_TOOLTIPS.peakConnections.tooltip}
              baseline={METRIC_TOOLTIPS.peakConnections.baseline}
            >
              {data.metrics.peakActiveConnections}
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.avgAcquisition.label}
              tooltip={METRIC_TOOLTIPS.avgAcquisition.tooltip}
              baseline={METRIC_TOOLTIPS.avgAcquisition.baseline}
              warning={data.metrics.avgAcquisitionTimeMs >= 5 && data.metrics.avgAcquisitionTimeMs < 20}
              critical={data.metrics.avgAcquisitionTimeMs >= 20}
            >
              {data.metrics.avgAcquisitionTimeMs}ms
            </MetricTooltip>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Health</div>
          <div className="space-y-2 text-sm">
            <MetricTooltip
              label={METRIC_TOOLTIPS.errorsRecent.label}
              tooltip={METRIC_TOOLTIPS.errorsRecent.tooltip}
              baseline={METRIC_TOOLTIPS.errorsRecent.baseline}
              critical={data.metrics.connectionErrorsLast5Min > 0}
            >
              {data.metrics.connectionErrorsLast5Min}
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.totalErrors.label}
              tooltip={METRIC_TOOLTIPS.totalErrors.tooltip}
              baseline={METRIC_TOOLTIPS.totalErrors.baseline}
              warning={data.metrics.totalErrors > 0 && data.metrics.totalErrors < 10}
              critical={data.metrics.totalErrors >= 10}
            >
              {data.metrics.totalErrors}
            </MetricTooltip>
            <MetricTooltip
              label={METRIC_TOOLTIPS.lastQuery.label}
              tooltip={METRIC_TOOLTIPS.lastQuery.tooltip}
              baseline={METRIC_TOOLTIPS.lastQuery.baseline}
            >
              {data.metrics.lastQueryTimestamp
                ? `${Math.round((Date.now() - new Date(data.metrics.lastQueryTimestamp).getTime()) / 1000)}s ago`
                : 'Never'}
            </MetricTooltip>
          </div>
        </div>
      </div>

      {/* Alert indicator */}
      {data.alerts.utilization.alertLevel !== 'ok' && (
        <div className={`mt-4 p-2 rounded text-sm ${
          data.alerts.utilization.alertLevel === 'critical'
            ? 'bg-red-50 text-red-700'
            : 'bg-yellow-50 text-yellow-700'
        }`}>
          {data.alerts.utilization.message}
        </div>
      )}
    </div>
  );
});

/**
 * Cache Status Panel - Cache statistics with environment info and benchmarks
 */
const CacheStatusPanel = memo(function CacheStatusPanel({
  data,
  onClearCache
}: {
  data: DatabaseHealthResponse['cache'];
  onClearCache: () => void;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const envInfo = useMemo(() => getEnvironmentInfo(), []);

  // Calculate assessments
  const sessionAssessment = getCacheAssessment('sessionHitRate', data.stats.sessionCache.hitRate);
  const userAssessment = getCacheAssessment('userHitRate', data.stats.userCache.hitRate);
  const overallAssessment = getCacheAssessment('overallHitRate', data.stats.overallHitRate);

  const assessmentColors = {
    excellent: 'text-green-600',
    good: 'text-green-500',
    normal: 'text-blue-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600'
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      {/* Header with Environment Badge */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium">Cache Status</h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${envInfo.color}`}>
            {envInfo.environment}
          </span>
        </div>
        <button
          onClick={onClearCache}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Clear Cache
        </button>
      </div>

      {/* Cache Source Info */}
      <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-600 flex items-center gap-2">
        <span className="font-medium">Source:</span>
        <span>{envInfo.cacheBackendLabel}</span>
        <span className="text-gray-600">|</span>
        <span className="font-medium">Session TTL:</span>
        <span>5 min</span>
        <span className="text-gray-600">|</span>
        <span className="font-medium">User TTL:</span>
        <span>10 min</span>
      </div>

      {/* Session Cache */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-sm">Session Cache</span>
          <span className={`text-xs ${assessmentColors[sessionAssessment.status]}`}>
            {sessionAssessment.label}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <div className="text-gray-500">Size</div>
            <div className="text-blue-600">{data.stats.sessionCache.size}</div>
          </div>
          <div>
            <div className="text-gray-500">Hits</div>
            <div className="text-green-600">{data.stats.sessionCache.hits}</div>
          </div>
          <div>
            <div className="text-gray-500">Misses</div>
            <div className="text-red-600">{data.stats.sessionCache.misses}</div>
          </div>
          <div>
            <div className="text-gray-500">Hit Rate</div>
            <div>{data.stats.sessionCache.hitRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* User Cache */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-sm">User Cache</span>
          <span className={`text-xs ${assessmentColors[userAssessment.status]}`}>
            {userAssessment.label}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <div className="text-gray-500">Size</div>
            <div className="text-blue-600">{data.stats.userCache.size}</div>
          </div>
          <div>
            <div className="text-gray-500">Hits</div>
            <div className="text-green-600">{data.stats.userCache.hits}</div>
          </div>
          <div>
            <div className="text-gray-500">Misses</div>
            <div className="text-red-600">{data.stats.userCache.misses}</div>
          </div>
          <div>
            <div className="text-gray-500">Hit Rate</div>
            <div>{data.stats.userCache.hitRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Overall */}
      <div className="pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Overall Hit Rate:</span>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${assessmentColors[overallAssessment.status]}`}>
              {data.stats.overallHitRate.toFixed(1)}%
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              overallAssessment.status === 'excellent' || overallAssessment.status === 'good'
                ? 'bg-green-100 text-green-700'
                : overallAssessment.status === 'normal'
                ? 'bg-blue-100 text-blue-700'
                : overallAssessment.status === 'warning'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {overallAssessment.label}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Info Panel */}
      <div className="mt-4 pt-4 border-t">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full text-left text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <span>{showInfo ? '\u25BC' : '\u25B6'}</span>
          <span>Understanding These Metrics</span>
        </button>

        {showInfo && (
          <div className="mt-3 space-y-4 text-sm">
            {/* Industry Benchmarks */}
            <div className="p-3 bg-blue-50 rounded">
              <div className="font-medium text-blue-800 mb-2">Industry Benchmarks</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-blue-700">
                    <th className="pb-1">Metric</th>
                    <th className="pb-1">Standard</th>
                    <th className="pb-1">Your System</th>
                  </tr>
                </thead>
                <tbody className="text-blue-900">
                  <tr>
                    <td className="py-0.5">Session Hit Rate</td>
                    <td>40-70%</td>
                    <td className={assessmentColors[sessionAssessment.status]}>
                      {data.stats.sessionCache.hitRate.toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5">User Hit Rate</td>
                    <td>80-95%</td>
                    <td className={assessmentColors[userAssessment.status]}>
                      {data.stats.userCache.hitRate.toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Overall Hit Rate</td>
                    <td>60-80%</td>
                    <td className={assessmentColors[overallAssessment.status]}>
                      {data.stats.overallHitRate.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Why Session Cache is Lower */}
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-800 mb-1">Why Session Cache Hit Rate is Lower</div>
              <p className="text-gray-600 text-xs">
                Session cache hit rates of 40-60% are <strong>normal and healthy</strong> because:
              </p>
              <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc space-y-0.5">
                <li>First request always misses (new session or expired cache)</li>
                <li>Security invalidation on logout, password change, session rotation</li>
                <li>Short 5-minute TTL for security compliance</li>
                <li>Each browser/device has a unique session token</li>
              </ul>
            </div>

            {/* Why User Cache is Higher */}
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-800 mb-1">Why User Cache Hit Rate is Higher</div>
              <p className="text-gray-600 text-xs">
                User cache typically sees 80-100% hit rates because:
              </p>
              <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc space-y-0.5">
                <li>Longer 10-minute TTL (user data changes less often)</li>
                <li>Multiple sessions for same user share one cache entry</li>
                <li>Only invalidated on profile or role changes</li>
              </ul>
            </div>

            {/* Troubleshooting */}
            <div className="p-3 bg-yellow-50 rounded">
              <div className="font-medium text-yellow-800 mb-1">When to Investigate</div>
              <ul className="text-xs text-yellow-900 ml-4 list-disc space-y-0.5">
                <li><strong>Session &lt; 30%</strong>: Check for excessive invalidation or TTL too short</li>
                <li><strong>User &lt; 70%</strong>: Check for over-invalidation or caching not being used</li>
                <li><strong>Session &gt; 90%</strong>: Could indicate security concern (TTL too long?)</li>
                <li><strong>High eviction count</strong>: Cache is full, consider increasing max size</li>
              </ul>
            </div>

            {/* Cache Types Explanation */}
            <div className="p-3 bg-purple-50 rounded">
              <div className="font-medium text-purple-800 mb-1">Cache Type Definitions</div>
              <div className="text-xs text-purple-900 space-y-1">
                <p><strong>Session Cache:</strong> Stores validated session tokens (hashed for security) to avoid re-validating against the database on every request.</p>
                <p><strong>User Cache:</strong> Stores user profile data (name, role, permissions) after session validation to avoid repeated user lookups.</p>
                <p><strong>Overall Hit Rate:</strong> Percentage of all cache requests served from cache rather than database. Higher = fewer database queries.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Service Health Panel - Service registry health status with email alert toggle
 * @phase Phase 4 - Added HealthAlertToggle integration
 */
const ServiceHealthPanel = memo(function ServiceHealthPanel({ data }: { data: DatabaseHealthResponse['services'] }) {
  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-medium mb-4">Service Health</h3>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-center text-sm">
        <div>
          <div className="text-gray-600">Total</div>
          <div className="font-medium text-lg">{data.total}</div>
        </div>
        <div>
          <div className="text-gray-600">Healthy</div>
          <div className="font-medium text-lg text-green-600">{data.healthy}</div>
        </div>
        <div>
          <div className="text-gray-600">Unhealthy</div>
          <div className="font-medium text-lg text-red-600">{data.unhealthy}</div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {data.details.map((service, idx) => (
          <div
            key={idx}
            className={`p-2 rounded text-sm flex justify-between items-center ${
              service.healthy ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <span className="font-medium">{service.name}</span>
            <span className={`px-2 py-1 rounded text-xs ${
              service.healthy
                ? 'bg-green-200 text-green-800'
                : 'bg-red-200 text-red-800'
            }`}>
              {service.healthy ? 'HEALTHY' : 'UNHEALTHY'}
            </span>
          </div>
        ))}
      </div>

      {/* Email alert config/test moved to Notification Manager → Email Channel */}
    </div>
  );
});

/**
 * Memory Usage Panel - Server memory monitoring with tachometer
 * Shows RSS (actual memory) against server limit, not misleading V8 heap ratio
 */
const MemoryUsagePanel = memo(function MemoryUsagePanel({ data }: { data: DatabaseHealthResponse['memory'] }) {
  const [showDetails, setShowDetails] = useState(false);
  const envInfo = useMemo(() => getEnvironmentInfo(), []);

  return (
    <div className="bg-white p-6 rounded shadow">
      {/* Header with Environment Badge */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium">Server Memory Usage</h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${envInfo.color}`}>
            {envInfo.environment}
          </span>
        </div>
      </div>

      {/* Tachometer Gauge */}
      <div className="flex justify-center mb-4">
        <TachometerGauge
          value={data.usagePercent.value}
          label="Server Memory"
          subLabel={`${(data.rssMB / 1024).toFixed(2)} GB / ${(data.serverLimitMB / 1024).toFixed(1)} GB`}
          thresholds={{ warning: 60, critical: 80 }}
          size="large"
        />
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-left text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
      >
        <span>{showDetails ? '\u25BC' : '\u25B6'}</span>
        <span>Memory Breakdown</span>
      </button>

      {showDetails && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-32">Node.js Heap:</span>
            <div className="flex-1 bg-gray-200 rounded h-4">
              <div
                className="bg-blue-500 h-full rounded"
                style={{ width: `${Math.min(100, (data.heapUsedMB / data.serverLimitMB) * 100)}%` }}
              />
            </div>
            <span className="w-20 text-right">{data.heapUsedMB.toFixed(0)} MB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-32">Native/Buffers:</span>
            <div className="flex-1 bg-gray-200 rounded h-4">
              <div
                className="bg-purple-500 h-full rounded"
                style={{ width: `${Math.min(100, (data.externalMB / data.serverLimitMB) * 100)}%` }}
              />
            </div>
            <span className="w-20 text-right">{data.externalMB.toFixed(0)} MB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-32">Total Process:</span>
            <div className="flex-1 bg-gray-200 rounded h-4">
              <div
                className="bg-green-500 h-full rounded"
                style={{ width: `${Math.min(100, (data.rssMB / data.serverLimitMB) * 100)}%` }}
              />
            </div>
            <span className="w-20 text-right">{data.rssMB.toFixed(0)} MB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-32">Server Limit:</span>
            <div className="flex-1 border-t border-dashed border-gray-400 mt-2" />
            <span className="w-20 text-right">{data.serverLimitMB.toFixed(0)} MB</span>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
        <div className="font-medium">About This Metric</div>
        <p className="mt-1">
          This shows your application&apos;s total memory footprint (RSS) compared to
          your server&apos;s {(data.serverLimitMB / 1024).toFixed(1)} GB limit.
          Normal operation: 20-50%.
        </p>
      </div>

      {/* Alert if applicable */}
      {data.usagePercent.alertLevel !== 'ok' && (
        <div className={`mt-4 p-2 rounded text-sm ${
          data.usagePercent.alertLevel === 'critical'
            ? 'bg-red-50 text-red-700'
            : 'bg-yellow-50 text-yellow-700'
        }`}>
          {data.usagePercent.message}
        </div>
      )}
    </div>
  );
});

/**
 * Error Log Panel - Display detailed error log with timestamps
 * @phase Database Manager Error Log Enhancement
 */
const ErrorLogPanel = memo(function ErrorLogPanel({
  errorLog,
  onClearDisplay
}: {
  errorLog: ErrorLogEntry[];
  onClearDisplay: () => void;
}) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatTimestamp = (isoTimestamp: string) => {
    const date = new Date(isoTimestamp);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const toggleExpanded = (id: string) => {
    setExpandedErrors(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = async (entry: ErrorLogEntry, id: string) => {
    const { date, time } = formatTimestamp(entry.isoTimestamp);
    const text = [
      `Date: ${date} ${time}`,
      entry.code ? `Code: ${entry.code}` : null,
      `Message: ${entry.message}`,
      entry.context ? `Context: ${entry.context}` : null
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      ErrorService.capture('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Error Log</h3>
        <div className="flex items-center gap-2">
          {errorLog.length > 0 && (
            <button
              onClick={onClearDisplay}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-300 transition-colors"
              title="Clear display (errors remain in database)"
            >
              Clear Display
            </button>
          )}
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
            {errorLog.length} Error{errorLog.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {errorLog.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">✓</div>
          <div>No errors recorded</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {errorLog.map((entry, idx) => {
            const { date, time } = formatTimestamp(entry.isoTimestamp);
            const errorId = `${entry.timestamp}-${idx}`;
            const isExpanded = expandedErrors.has(errorId);
            const isCopied = copiedId === errorId;

            return (
              <div
                key={errorId}
                className="rounded border bg-red-50 border-red-200 overflow-hidden"
              >
                {/* Collapsed Header - Always Visible */}
                <div
                  className="p-3 cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => toggleExpanded(errorId)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="text-gray-600 font-mono">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span>{date}</span>
                      <span className="text-gray-600">|</span>
                      <span className="font-mono">{time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.code && (
                        <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-xs font-mono">
                          {entry.code}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm text-red-800 ${!isExpanded ? 'truncate' : ''}`}>
                    {entry.message}
                  </p>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-red-200 bg-red-100/50 p-3">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-semibold text-gray-700">Full Message:</span>
                        <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap break-words font-mono bg-white/50 p-2 rounded">
                          {entry.message}
                        </p>
                      </div>
                      {entry.context && (
                        <div>
                          <span className="text-xs font-semibold text-gray-700">Context:</span>
                          <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap break-words font-mono bg-white/50 p-2 rounded">
                            {entry.context}
                          </p>
                        </div>
                      )}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(entry, errorId);
                          }}
                          className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                            isCopied
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-white hover:bg-gray-800'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <span>✓</span>
                              Copied!
                            </>
                          ) : (
                            <>
                              <span>📋</span>
                              Copy to Clipboard
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

/**
 * Active Alerts Panel - Display all active system alerts
 */
const ActiveAlertsPanel = memo(function ActiveAlertsPanel({ alerts }: { alerts: DatabaseHealthResponse['activeAlerts'] }) {
  const alertColors = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    ok: 'bg-green-50 border-green-200 text-green-800'
  };

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const priority: Record<AlertLevel, number> = { critical: 0, warning: 1, ok: 2 };
      return priority[a.level] - priority[b.level];
    });
  }, [alerts]);

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Active Alerts</h3>
        <div className="flex gap-2 text-sm">
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
            {alerts.filter(a => a.level === 'critical').length} Critical
          </span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
            {alerts.filter(a => a.level === 'warning').length} Warning
          </span>
        </div>
      </div>

      {sortedAlerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">✓</div>
          <div>No active alerts - system operating normally</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border ${alertColors[alert.level]}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{alert.component}.{alert.metric}</span>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded uppercase ${
                  alert.level === 'critical' ? 'bg-red-200' : 'bg-yellow-200'
                }`}>
                  {alert.level}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Clear Cache Modal - Confirmation dialog for cache clearing
 */
const ClearCacheModal = memo(function ClearCacheModal({
  isOpen,
  onClose,
  onConfirm,
  loading
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = () => {
    if (confirmText === 'CLEAR_CACHE') {
      onConfirm();
    }
  };

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title="Clear Cache" size="small">
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 font-medium">Warning</p>
          <p className="text-yellow-700 text-sm mt-1">
            This will invalidate all cached sessions and user data.
            Users may experience temporary slowdowns as caches rebuild.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Type CLEAR_CACHE to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="CLEAR_CACHE"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="danger"
            onClick={handleConfirm}
            disabled={confirmText !== 'CLEAR_CACHE' || loading}
          >
            {loading ? 'Clearing...' : 'Clear Cache'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
});

// ============================================================================
// APPLICATION ERROR LOG PANEL (from error_logs DB table)
// ============================================================================

interface AppErrorLog {
  id: number;
  error_type: string;
  error_message: string;
  severity: string;
  status: string;
  environment: string;
  created_at: string;
}

const APP_ERROR_STATUS_OPTIONS = ['unresolved', 'under_review', 'resolved'] as const;

const appErrorStatusConfig: Record<string, { color: string; bgColor: string; hoverBg: string; label: string }> = {
  unresolved: { color: 'text-red-700', bgColor: 'bg-red-100', hoverBg: 'hover:bg-red-200', label: 'Unresolved' },
  under_review: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', hoverBg: 'hover:bg-yellow-200', label: 'Under Review' },
  investigating: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', hoverBg: 'hover:bg-yellow-200', label: 'Under Review' },
  resolved: { color: 'text-green-700', bgColor: 'bg-green-100', hoverBg: 'hover:bg-green-200', label: 'Resolved' }
};

const AppErrorLogPanel = memo(function AppErrorLogPanel() {
  const [errors, setErrors] = useState<AppErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownId, setDropdownId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchErrors = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/logs/error?limit=10&page=1', {
        credentials: 'include'
      });
      if (response.ok) {
        const json = await response.json();
        setErrors(json.data?.logs || []);
      }
    } catch (error) {
      ErrorService.capture('[AppErrorLogPanel] Fetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  // Close dropdown on outside click
  useEffect(() => {
    if (dropdownId === null) return;
    const handleClick = () => setDropdownId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [dropdownId]);

  const handleStatusChange = useCallback(async (logId: number, newStatus: string) => {
    setUpdatingId(logId);
    setDropdownId(null);
    try {
      const response = await fetchWithCsrf('/api/admin/logs/error', {
        method: 'PATCH',
        body: JSON.stringify({ id: logId, status: newStatus })
      });
      if (response.ok) {
        setErrors(prev => prev.map(e =>
          e.id === logId ? { ...e, status: newStatus } : e
        ));
      }
    } catch (error) {
      ErrorService.capture('[AppErrorLogPanel] Status update failed:', error);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const severityColors: Record<string, string> = {
    critical: 'text-red-700 bg-red-100',
    high: 'text-orange-700 bg-orange-100',
    medium: 'text-yellow-700 bg-yellow-100',
    low: 'text-blue-700 bg-blue-100'
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Application Error Log</h3>
        <div className="flex items-center gap-2">
          <a
            href="/admin/logs/error"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            View All
          </a>
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
            {errors.filter(e => e.status === 'unresolved').length} Unresolved
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : errors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">&#10003;</div>
          <div>No recent errors</div>
        </div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-1 pr-2">ID</th>
                <th className="pb-1 pr-2">Severity</th>
                <th className="pb-1 pr-2">Type</th>
                <th className="pb-1 pr-2">Message</th>
                <th className="pb-1 pr-2">Status</th>
                <th className="pb-1">Time</th>
              </tr>
            </thead>
            <tbody>
              {errors.map(error => {
                const sConfig = appErrorStatusConfig[error.status] ?? appErrorStatusConfig.unresolved!;
                const isUpdating = updatingId === error.id;
                const isOpen = dropdownId === error.id;

                return (
                  <tr key={error.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 pr-2 text-gray-500">{error.id}</td>
                    <td className="py-1.5 pr-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${severityColors[error.severity] || 'text-gray-700 bg-gray-100'}`}>
                        {error.severity}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-gray-600">{error.error_type}</td>
                    <td className="py-1.5 pr-2 max-w-[200px] truncate text-gray-700" title={error.error_message}>
                      {error.error_message}
                    </td>
                    <td className="py-1.5 pr-2 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownId(isOpen ? null : error.id);
                        }}
                        disabled={isUpdating}
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${sConfig.bgColor} ${sConfig.color} ${sConfig.hoverBg} cursor-pointer transition-colors ${isUpdating ? 'opacity-50' : ''}`}
                      >
                        {isUpdating ? '...' : sConfig.label}
                      </button>
                      {isOpen && (
                        <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                          {APP_ERROR_STATUS_OPTIONS.map(opt => {
                            const optC = appErrorStatusConfig[opt]!;
                            const isCurrent = error.status === opt || (error.status === 'investigating' && opt === 'under_review');
                            return (
                              <button
                                key={opt}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isCurrent) handleStatusChange(error.id, opt);
                                  else setDropdownId(null);
                                }}
                                className={`w-full text-left px-2 py-1 text-xs hover:bg-gray-50 ${isCurrent ? 'font-bold bg-gray-50' : ''} ${optC.color}`}
                              >
                                {optC.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 text-gray-400 whitespace-nowrap">
                      {new Date(error.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AdminDatabaseManagerPageContent() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<DatabaseHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearCacheModalOpen, setClearCacheModalOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  // State for "Clear Display" - stores timestamp after which to show errors
  // Errors with timestamps before this value are hidden from display (but remain in DB)
  const [errorDisplayClearedAfter, setErrorDisplayClearedAfter] = useState<number>(0);

  // MEMORY LEAK FIX: Wrap fetchHealthData in useCallback to prevent closure accumulation
  // Without useCallback, each render creates a new function, and setInterval holds references to old versions
  // causing memory leak as old closures accumulate (86% → 97% in 15 seconds)
  const fetchHealthData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/database/health', {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success && result.data) {
        setHealthData(result.data);
        setLastRefreshTime(new Date().toLocaleTimeString());
      }
    } catch (error) {
      ErrorService.capture('[DatabaseManager] Health fetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps = stable reference across renders

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchHealthData();

      // Auto-refresh every 15 seconds (reduced from 5s to prevent memory pressure)
      const interval = setInterval(() => {
        fetchHealthData();
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [user, fetchHealthData]); // Now includes fetchHealthData (stable reference)

  // MEMORY LEAK FIX: Clear message timeout on unmount or when message changes
  useEffect(() => {
    if (message) {
      const timeoutId = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [message]);

  // Handler for clearing the error log display (UI only, not DB)
  // Sets a timestamp - only errors occurring AFTER this time will be shown
  // MUST be before early returns to satisfy Rules of Hooks
  const handleClearErrorDisplay = useCallback(() => {
    setErrorDisplayClearedAfter(Date.now());
  }, []);

  // Filter error log to only show errors after the clear timestamp
  // MUST be before early returns to satisfy Rules of Hooks
  const filteredErrorLog = useMemo(() => {
    if (!healthData?.errorLog) return [];
    if (errorDisplayClearedAfter === 0) return healthData.errorLog;
    return healthData.errorLog.filter(entry => entry.timestamp > errorDisplayClearedAfter);
  }, [healthData?.errorLog, errorDisplayClearedAfter]);

  // Conditional returns AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const response = await fetchWithCsrf('/api/admin/database/cache', {
        method: 'DELETE',
        body: JSON.stringify({ confirm: 'CLEAR_CACHE' })
      });

      const result = await response.json();
      if (result.success && result.data?.cleared) {
        setMessage({ type: 'success', text: 'Cache cleared successfully' });
        await fetchHealthData();
      } else {
        setMessage({ type: 'error', text: result.data?.message || 'Failed to clear cache' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error clearing cache' });
    } finally {
      setClearingCache(false);
      setClearCacheModalOpen(false);
      // Message auto-clear now handled by useEffect (see line ~515)
    }
  };

  const handleManualRefresh = () => {
    setLoading(true);
    fetchHealthData();
  };

  if (loading && !healthData) {
    return (
      <div className="text-center py-12">Loading database health data...</div>
    );
  }

  if (!healthData) {
    return (
      <div className="text-center py-12 text-red-600">Failed to load database health data</div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Database Manager</h1>
            <p className="text-gray-600">Real-time database infrastructure monitoring and control</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Last refresh: {lastRefreshTime}
            </div>
            <button
              onClick={handleManualRefresh}
              className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Dashboard Panels */}
      <div className="space-y-6">
        {/* Overview - Full Width */}
        <OverviewStatusPanel data={healthData} />

        {/* Activity Charts - Full Width (pgAdmin-style) */}
        <ActivityChartsPanel
          history={healthData.pool.history}
          queryTypes={healthData.pool.queryTypes}
          queryTypeHistory={healthData.pool.queryTypeHistory}
          metrics={healthData.pool.metrics}
          poolStats={healthData.pool.stats}
          memory={healthData.memory}
          memoryHistory={healthData.memoryHistory}
        />

        {/* Row 1: Pool + Cache */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConnectionPoolPanel data={healthData.pool} />
          <CacheStatusPanel data={healthData.cache} onClearCache={() => setClearCacheModalOpen(true)} />
        </div>

        {/* Row 2: Services + Memory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ServiceHealthPanel data={healthData.services} />
          <MemoryUsagePanel data={healthData.memory} />
        </div>

        {/* Active Alerts + Connection Error Log - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActiveAlertsPanel alerts={healthData.activeAlerts} />
          <ErrorLogPanel
            errorLog={filteredErrorLog}
            onClearDisplay={handleClearErrorDisplay}
          />
        </div>

        {/* Application Error Log - Full Width */}
        <AppErrorLogPanel />

        {/* Metrics Help - Full Width (collapsible) */}
        <MetricsHelpPanel
          highlightMetrics={healthData.activeAlerts
            .filter(a => a.level === 'critical' || a.level === 'warning')
            .map(a => a.metric)}
        />
      </div>

      {/* Clear Cache Modal */}
      <ClearCacheModal
        isOpen={clearCacheModalOpen}
        onClose={() => setClearCacheModalOpen(false)}
        onConfirm={handleClearCache}
        loading={clearingCache}
      />
    </>
  );
}

/**
 * AdminDatabaseManagerPage - Error boundary wrapper for database manager
 * @phase Phase 5 - Admin Database Manager UI
 */
export default function AdminDatabaseManagerPage() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="Database Manager Error"
          message="Unable to load database manager dashboard. Please try again."
        />
      }
      isolate={true}
      componentName="AdminDatabaseManagerPage"
    >
      <AdminDatabaseManagerPageContent />
    </ErrorBoundary>
  );
}
