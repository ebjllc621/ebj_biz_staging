/**
 * Admin Performance Dashboard Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Layout: AdminShell (via admin/layout.tsx)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (Chart.js integration)
 *
 * Features:
 * - Real-time performance charts (API response times, DB queries, error rates)
 * - Memory/CPU usage visualizations
 * - Top 10 slowest endpoints table
 * - Top 10 most frequent errors table
 * - System health score (0-100)
 *
 * @authority PHASE_6.2_BRAIN_PLAN.md - Section 3.5
 * @component
 * @returns {JSX.Element} Admin performance dashboard
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PerformanceMetric {
  id: number;
  metric_type: string;
  metric_name: string;
  value: number;
  status_code: number | null;
  created_at: string;
}

interface PerformanceStats {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  totalRequests: number;
  errorRate: number;
  slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
}

interface ErrorLog {
  id: number;
  error_type: string;
  error_message: string;
  severity: string;
  created_at: string;
}

interface ErrorStats {
  totalErrors: number;
  errorsByType: Array<{ type: string; count: number }>;
  errorsBySeverity: Array<{ severity: string; count: number }>;
  unresolvedCount: number;
}

interface Alert {
  id: number;
  alert_type: string;
  alert_name: string;
  severity: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
}

// Utility function to format timestamps
function formatTimestamp(isoTimestamp: string): { date: string; time: string } {
  const date = new Date(isoTimestamp);
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

function AdminPerformancePageContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');

  // Performance data
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);

  // Error data
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);

  // Alert data
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // System health score (0-100 or null if no data)
  const [healthScore, setHealthScore] = useState<number | null>(null);

  // Expandable row state for errors and alerts
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  const [expandedAlerts, setExpandedAlerts] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clearingErrors, setClearingErrors] = useState(false);
  const [clearingAlerts, setClearingAlerts] = useState(false);

  // Track initial load to prevent unmounting children during refresh
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // ==========================================================================
  // ALL HOOKS MUST BE DEFINED BEFORE ANY EARLY RETURNS (React Rules of Hooks)
  // ==========================================================================

  // Toggle expanded state for errors
  const toggleErrorExpanded = useCallback((id: number) => {
    setExpandedErrors(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Toggle expanded state for alerts
  const toggleAlertExpanded = useCallback((id: number) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Copy error to clipboard
  const copyErrorToClipboard = useCallback(async (err: ErrorLog) => {
    const { date, time } = formatTimestamp(err.created_at);
    const text = [
      `Date: ${date} ${time}`,
      `Type: ${err.error_type}`,
      `Severity: ${err.severity}`,
      `Message: ${err.error_message}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`error-${err.id}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  // Copy alert to clipboard
  const copyAlertToClipboard = useCallback(async (alert: Alert) => {
    const { date, time } = formatTimestamp(alert.created_at);
    const text = [
      `Date: ${date} ${time}`,
      `Alert: ${alert.alert_name}`,
      `Type: ${alert.alert_type}`,
      `Severity: ${alert.severity}`,
      `Message: ${alert.message}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`alert-${alert.id}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  // Clear single error
  const clearError = useCallback(async (id: number) => {
    try {
      const response = await fetchWithCsrf(`/api/admin/errors/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setErrors(prev => prev.filter(e => e.id !== id));
      }
    } catch {
      // Error handling silently
    }
  }, []);

  // Clear single alert
  const clearAlert = useCallback(async (id: number) => {
    try {
      const response = await fetchWithCsrf(`/api/admin/alerts/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch {
      // Error handling silently
    }
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(async () => {
    setClearingErrors(true);
    try {
      const response = await fetchWithCsrf('/api/admin/errors', {
        method: 'DELETE'
      });
      if (response.ok) {
        setErrors([]);
        setExpandedErrors(new Set());
      }
    } catch {
      // Error handling silently
    } finally {
      setClearingErrors(false);
    }
  }, []);

  // Clear all alerts (unacknowledged)
  const clearAllAlerts = useCallback(async () => {
    setClearingAlerts(true);
    try {
      const response = await fetchWithCsrf('/api/admin/alerts', {
        method: 'DELETE'
      });
      if (response.ok) {
        setAlerts([]);
        setExpandedAlerts(new Set());
      }
    } catch {
      // Error handling silently
    } finally {
      setClearingAlerts(false);
    }
  }, []);

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchAllData();

      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchAllData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, timeRange]);

  // ==========================================================================
  // CONDITIONAL RETURNS - Only AFTER all hooks are defined
  // ==========================================================================

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

  // ==========================================================================
  // HELPER FUNCTIONS (not hooks, can be after early returns)
  // ==========================================================================

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPerformanceMetrics(),
        fetchPerformanceStats(),
        fetchErrors(),
        fetchAlerts()
      ]);
    } catch (error) {
      // Errors handled in individual fetch functions
    } finally {
      setLoading(false);
      if (!hasInitialLoad) {
        setHasInitialLoad(true);
      }
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;
      const response = await fetch(`/api/admin/performance/metrics?type=api_response&hours=${hours}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setMetrics(data.data?.metrics || []);
    } catch (error) {

    }
  };

  const fetchPerformanceStats = async () => {
    try {
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;
      const response = await fetch(`/api/admin/performance/stats?hours=${hours}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setStats(data.data?.stats || null);

      // Calculate system health score
      if (data.data?.stats) {
        const score = calculateHealthScore(data.data.stats);
        setHealthScore(score);
      }
    } catch (error) {

    }
  };

  const fetchErrors = async () => {
    try {
      const response = await fetch('/api/admin/errors?limit=50', {
        credentials: 'include'
      });
      const data = await response.json();
      setErrors(data.data?.errors || []);
      setErrorStats(data.data?.stats || null);
    } catch (error) {

    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/alerts?limit=20', {
        credentials: 'include'
      });
      const data = await response.json();
      setAlerts(data.data?.alerts || []);
    } catch (error) {

    }
  };

  const calculateHealthScore = (perfStats: PerformanceStats): number | null => {
    // GOVERNANCE: Return null if no data - prevents fake "EXCELLENT" scores
    if (perfStats.totalRequests === 0) {
      return null;
    }

    // Score components:
    // - Avg response time (40 points): < 100ms = 40, 100-500ms = 30, 500-1000ms = 20, > 1000ms = 0
    // - Error rate (30 points): < 1% = 30, 1-5% = 20, 5-10% = 10, > 10% = 0
    // - P95 response time (20 points): < 500ms = 20, 500-2000ms = 10, > 2000ms = 0
    // - Total requests (10 points): > 0 = 10, else 0

    let score = 0;

    // Response time score
    if (perfStats.avgResponseTime < 100) score += 40;
    else if (perfStats.avgResponseTime < 500) score += 30;
    else if (perfStats.avgResponseTime < 1000) score += 20;

    // Error rate score
    if (perfStats.errorRate < 1) score += 30;
    else if (perfStats.errorRate < 5) score += 20;
    else if (perfStats.errorRate < 10) score += 10;

    // P95 score
    if (perfStats.p95ResponseTime < 500) score += 20;
    else if (perfStats.p95ResponseTime < 2000) score += 10;

    // Traffic score (always 10 when we have data since we checked totalRequests > 0)
    score += 10;

    return score;
  };

  const getHealthColor = (score: number | null): string => {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthLabel = (score: number | null): string => {
    if (score === null) return 'NO DATA';
    if (score >= 80) return 'EXCELLENT';
    if (score >= 50) return 'GOOD';
    if (score >= 30) return 'FAIR';
    return 'POOR';
  };

  // Only show full loading screen on initial load, not during refresh
  if (!hasInitialLoad && loading) {
    return (
      <div className="text-center py-12">Loading performance data...</div>
    );
  }

  // Prepare chart data - defined here since they don't need to be hooks
  const responseTimeData = {
    labels: metrics.slice(0, 50).reverse().map((_, idx) => idx.toString()),
    datasets: [{
      label: 'Response Time (ms)',
      data: metrics.slice(0, 50).reverse().map(m => m.value),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  const slowestEndpointsData = {
    labels: (stats?.slowestEndpoints || []).slice(0, 10).map(e => e.endpoint),
    datasets: [{
      label: 'Avg Response Time (ms)',
      data: (stats?.slowestEndpoints || []).slice(0, 10).map(e => e.avgTime),
      backgroundColor: 'rgba(239, 68, 68, 0.6)',
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 1
    }]
  };

  const errorBreakdownData = {
    labels: (errorStats?.errorsBySeverity || []).map(e => e.severity.toUpperCase()),
    datasets: [{
      data: (errorStats?.errorsBySeverity || []).map(e => e.count),
      backgroundColor: [
        'rgba(34, 197, 94, 0.6)',   // low - green
        'rgba(234, 179, 8, 0.6)',   // medium - yellow
        'rgba(249, 115, 22, 0.6)',  // high - orange
        'rgba(239, 68, 68, 0.6)'    // critical - red
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(234, 179, 8)',
        'rgb(249, 115, 22)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 1
    }]
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Performance Monitoring</h1>
      <div className="space-y-6">
        {/* Time Range Selector */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {(['1h', '6h', '24h', '7d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded transition ${
                  timeRange === range
                    ? 'bg-[#ed6437] text-white'
                    : 'bg-white border hover:bg-gray-50'
                }`}
              >
                {range === '1h' && 'Last Hour'}
                {range === '6h' && 'Last 6 Hours'}
                {range === '24h' && 'Last 24 Hours'}
                {range === '7d' && 'Last 7 Days'}
              </button>
            ))}
          </div>

          {/* Auto-refresh indicator */}
          <div className="text-sm text-gray-600">
            Auto-refresh: 30s
          </div>
        </div>

        {/* System Health Score */}
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-medium mb-2">System Health Score</h3>
          <p className="text-xs text-gray-500 mb-4 text-center">Based on API response times and HTTP status codes. See Application Error Logs for runtime errors.</p>
          <div className="text-center">
            <div className={`text-6xl font-bold ${getHealthColor(healthScore)}`}>
              {healthScore !== null ? healthScore : '—'}
            </div>
            <div className={`text-2xl font-medium mt-2 ${getHealthColor(healthScore)}`}>
              {getHealthLabel(healthScore)}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Avg Response</div>
                <div className="font-medium">{stats?.avgResponseTime.toFixed(2) || 0}ms</div>
              </div>
              <div>
                <div className="text-gray-600">P95 Response</div>
                <div className="font-medium">{stats?.p95ResponseTime.toFixed(2) || 0}ms</div>
              </div>
              <div>
                <div className="text-gray-600" title="Percentage of API requests returning HTTP 4xx/5xx status codes">HTTP Error Rate</div>
                <div className="font-medium">{stats?.errorRate.toFixed(2) || 0}%</div>
              </div>
              <div>
                <div className="text-gray-600">Total Requests</div>
                <div className="font-medium">{stats?.totalRequests || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1: Response Times & Slowest Endpoints */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="API Response Times">
            <Line
              data={responseTimeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top' },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }}
            />
          </ChartCard>

          <ChartCard title="Slowest Endpoints (Top 10)">
            <Bar
              data={slowestEndpointsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                }
              }}
            />
          </ChartCard>
        </div>

        {/* Charts Row 2: Error Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Error Breakdown by Severity">
            <Doughnut
              data={errorBreakdownData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'right' }
                }
              }}
            />
          </ChartCard>

          {/* Error Statistics Card - Application-level logged errors */}
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-medium mb-4">Application Error Logs</h3>
            <p className="text-xs text-gray-500 mb-3">Logged errors (DB, runtime, service failures)</p>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Logged</span>
                <span className="font-bold">{errorStats?.totalErrors || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unresolved</span>
                <span className="font-bold text-red-600">{errorStats?.unresolvedCount || 0}</span>
              </div>
              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Top Error Types:</div>
                {(errorStats?.errorsByType || []).slice(0, 5).map((err, idx) => (
                  <div key={idx} className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{err.type}</span>
                    <span>{err.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tables Row: Recent Errors & Active Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Errors Table - Enhanced with expandable rows */}
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Recent Application Errors</h3>
              <div className="flex items-center gap-2">
                {errors.length > 0 && (
                  <button
                    onClick={clearAllErrors}
                    disabled={clearingErrors}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 transition-colors disabled:opacity-50"
                  >
                    {clearingErrors ? 'Clearing...' : 'Clear All'}
                  </button>
                )}
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                  {errors.length} Error{errors.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {errors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✓</div>
                  <div>No errors recorded</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {errors.slice(0, 20).map(err => {
                    const { date, time } = formatTimestamp(err.created_at);
                    const isExpanded = expandedErrors.has(err.id);
                    const isCopied = copiedId === `error-${err.id}`;

                    return (
                      <div key={err.id} className="bg-white">
                        {/* Collapsed Header */}
                        <div
                          className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleErrorExpanded(err.id)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-mono">{isExpanded ? '▼' : '▶'}</span>
                              <span>{date}</span>
                              <span className="text-gray-400">|</span>
                              <span className="font-mono">{time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                err.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                err.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                err.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {err.severity}
                              </span>
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-mono">
                                {err.error_type}
                              </span>
                            </div>
                          </div>
                          <p className={`text-sm text-gray-800 ${!isExpanded ? 'truncate' : ''}`}>
                            {err.error_message}
                          </p>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-semibold text-gray-600">Full Message:</span>
                                <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap break-words font-mono bg-white p-2 rounded border">
                                  {err.error_message}
                                </p>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyErrorToClipboard(err);
                                  }}
                                  className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                                    isCopied
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-700 text-white hover:bg-gray-800'
                                  }`}
                                >
                                  {isCopied ? '✓ Copied!' : '📋 Copy'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearError(err.id);
                                  }}
                                  className="px-3 py-1.5 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                >
                                  ✕ Clear
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
          </div>

          {/* Active Alerts Table - Enhanced with expandable rows */}
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Active Alerts</h3>
              <div className="flex items-center gap-2">
                {alerts.filter(a => !a.acknowledged).length > 0 && (
                  <button
                    onClick={clearAllAlerts}
                    disabled={clearingAlerts}
                    className="px-3 py-1 text-sm text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded border border-yellow-200 transition-colors disabled:opacity-50"
                  >
                    {clearingAlerts ? 'Clearing...' : 'Clear All'}
                  </button>
                )}
                <div className="flex gap-1">
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    {alerts.filter(a => !a.acknowledged && a.severity === 'critical').length} Critical
                  </span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    {alerts.filter(a => !a.acknowledged && a.severity === 'warning').length} Warning
                  </span>
                </div>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {alerts.filter(a => !a.acknowledged).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✓</div>
                  <div>No active alerts - system operating normally</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {alerts.filter(a => !a.acknowledged).slice(0, 20).map(alert => {
                    const { date, time } = formatTimestamp(alert.created_at);
                    const isExpanded = expandedAlerts.has(alert.id);
                    const isCopied = copiedId === `alert-${alert.id}`;

                    return (
                      <div key={alert.id} className={`${
                        alert.severity === 'critical' ? 'bg-red-50' :
                        alert.severity === 'warning' ? 'bg-yellow-50' : 'bg-white'
                      }`}>
                        {/* Collapsed Header */}
                        <div
                          className="px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleAlertExpanded(alert.id)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-mono">{isExpanded ? '▼' : '▶'}</span>
                              <span>{date}</span>
                              <span className="text-gray-400">|</span>
                              <span className="font-mono">{time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs rounded uppercase ${
                                alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                                alert.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-blue-200 text-blue-800'
                              }`}>
                                {alert.severity}
                              </span>
                            </div>
                          </div>
                          <div className="font-medium text-sm text-gray-900">{alert.alert_name}</div>
                          <p className={`text-sm text-gray-700 ${!isExpanded ? 'truncate' : ''}`}>
                            {alert.message}
                          </p>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className={`border-t px-4 py-3 ${
                            alert.severity === 'critical' ? 'border-red-200 bg-red-100/50' :
                            alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-100/50' : 'border-gray-100 bg-gray-50'
                          }`}>
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-semibold text-gray-600">Alert Type:</span>
                                <span className="text-sm text-gray-800 ml-2 font-mono">{alert.alert_type}</span>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-600">Full Message:</span>
                                <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap break-words bg-white/50 p-2 rounded">
                                  {alert.message}
                                </p>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyAlertToClipboard(alert);
                                  }}
                                  className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                                    isCopied
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-700 text-white hover:bg-gray-800'
                                  }`}
                                >
                                  {isCopied ? '✓ Copied!' : '📋 Copy'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearAlert(alert.id);
                                  }}
                                  className="px-3 py-1.5 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                >
                                  ✕ Clear
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
          </div>
        </div>
      </div>
    </>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div style={{ height: '300px' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * AdminPerformancePage - Error boundary wrapper for performance dashboard
 * @phase Phase R4.2 - Error Boundary Implementation
 */
export default function AdminPerformancePage() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="Performance Dashboard Error"
          message="Unable to load performance monitoring dashboard. Please try again."
        />
      }
      isolate={true}
      componentName="AdminPerformancePage"
    >
      <AdminPerformancePageContent />
    </ErrorBoundary>
  );
}
