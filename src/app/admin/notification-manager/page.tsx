/**
 * Admin Notification Manager Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: Custom dashboard (like Database Manager)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier (Phase 1)
 *
 * Features (Phase 1):
 * - Real-time notification system health monitoring
 * - Overview panel with system status
 * - Channel status summary
 * - Auto-refresh (15 second interval)
 *
 * @phase Phase 1 - Notification Admin Foundation
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @component
 * @returns {JSX.Element} Admin notification manager dashboard
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { MiniLineChart } from '@/components/ui/MiniLineChart';
import { MultiLineChart } from '@/components/ui/MultiLineChart';
import type {
  NotificationHealthResponse,
  NotificationMetricsResponse,
  NotificationMetricsHistoryPoint,
  DigestQueueResponse,
  StaleNotificationsResponse,
  TroubleshootUserResult,
  TroubleshootNotificationEntry,
  TroubleshootNotificationDetail,
  TroubleshootHistoryResponse,
  SetupGuidesResponse,
  FirebaseStatus,
  WebSocketStatus,
  TriggerCondition,
  PreferencesAnalyticsResponse,
  CategoryAnalytics,
  AdminConfigResponse,
  AdminChannel,
  ChannelStatus
} from '@core/types/notification-admin';
import BizModal from '@/components/BizModal/BizModal';
import { ExternalLink, ChevronDown, ChevronRight, CheckCircle, XCircle, AlertTriangle, Zap, Smartphone, Bell, Mail, Pause, HelpCircle, Settings, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ErrorService } from '@core/services/ErrorService';
import { StatusIconBadge } from '@/components/admin/shared/StatusIconBadge';
import HealthAlertConfigModal from '@/components/admin/HealthAlertConfigModal';
import EmailSystemTestModal from '@/components/admin/EmailSystemTestModal';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Overview Status Panel - System-wide notification health summary
 */
const OverviewStatusPanel = memo(function OverviewStatusPanel({
  data
}: {
  data: NotificationHealthResponse
}) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    unhealthy: 'bg-red-100 text-red-800 border-red-200'
  };

  const getChannelStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <StatusIconBadge icon={CheckCircle} variant="success" size="sm" />;
      case 'degraded':
        return <StatusIconBadge icon={AlertTriangle} variant="warning" size="sm" />;
      case 'paused':
        return <StatusIconBadge icon={Pause} variant="muted" size="sm" />;
      case 'failed':
        return <StatusIconBadge icon={XCircle} variant="error" size="sm" />;
      default:
        return <StatusIconBadge icon={HelpCircle} variant="muted" size="sm" />;
    }
  };

  const channelStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'paused': return 'text-gray-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-500';
    }
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
        {/* Dispatched Today */}
        <div>
          <div className="text-gray-600 text-sm">Dispatched (24h)</div>
          <div className="font-medium text-lg">{data.metrics24h.dispatched.toLocaleString()}</div>
        </div>

        {/* Success Rate */}
        <div>
          <div className="text-gray-600 text-sm">Success Rate</div>
          <div className={`font-medium text-lg ${
            data.metrics24h.successRate >= 95 ? 'text-green-600' :
            data.metrics24h.successRate >= 90 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {data.metrics24h.successRate.toFixed(1)}%
          </div>
        </div>

        {/* In-App Status */}
        <div>
          <div className="text-gray-600 text-sm">In-App</div>
          <div className={`font-medium ${channelStatusColor(data.channels.inApp.status)}`}>
            {getChannelStatusBadge(data.channels.inApp.status)}
          </div>
        </div>

        {/* Push Status */}
        <div>
          <div className="text-gray-600 text-sm">Push (FCM)</div>
          <div className={`font-medium ${channelStatusColor(data.channels.push.status)}`}>
            {getChannelStatusBadge(data.channels.push.status)}
          </div>
        </div>

        {/* Email Status */}
        <div>
          <div className="text-gray-600 text-sm">Email</div>
          <div className={`font-medium ${channelStatusColor(data.channels.email.status)}`}>
            {getChannelStatusBadge(data.channels.email.status)}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4 text-center text-sm">
        <div>
          <div className="text-gray-500">Active Devices</div>
          <div className="font-medium">{data.channels.push.devices.active.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500">Digest Queue</div>
          <div className={`font-medium ${data.queues.digestPending > 100 ? 'text-yellow-600' : ''}`}>
            {data.queues.digestPending.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Emails (24h)</div>
          <div className="font-medium">{data.channels.email.immediate24h.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500">Active Alerts</div>
          <div className={`font-medium ${data.activeAlerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {data.activeAlerts.length}
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Active Alerts Panel - Display all active system alerts
 */
const ActiveAlertsPanel = memo(function ActiveAlertsPanel({
  alerts
}: {
  alerts: NotificationHealthResponse['activeAlerts']
}) {
  const alertColors = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    ok: 'bg-green-50 border-green-200 text-green-800'
  };

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const priority: Record<string, number> = { critical: 0, warning: 1, ok: 2 };
      return (priority[a.level] ?? 2) - (priority[b.level] ?? 2);
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
          <div className="mb-2 flex justify-center">
            <StatusIconBadge icon={CheckCircle} variant="success" size="lg" />
          </div>
          <div>No active alerts - system operating normally</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sortedAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border ${alertColors[alert.level] || alertColors.ok}`}
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
 * Channel Status Panel - Detailed status for each notification channel
 * @phase Phase 2 - Channel Status Panel
 */
const ChannelStatusPanel = memo(function ChannelStatusPanel({
  data
}: {
  data: NotificationHealthResponse
}) {
  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-medium mb-4">Channel Status</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <InAppChannelCard data={data.channels.inApp} />
        <PushChannelCard data={data.channels.push} />
        <EmailChannelCard data={data.channels.email} />
      </div>
    </div>
  );
});

/**
 * In-App Channel Card - In-app notification metrics
 * @phase Phase 2 - Channel Status Panel
 */
const InAppChannelCard = memo(function InAppChannelCard({
  data
}: {
  data: NotificationHealthResponse['channels']['inApp']
}) {
  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    paused: 'bg-gray-100 text-gray-800 border-gray-200',
    failed: 'bg-red-100 text-red-800 border-red-200'
  };

  // Get top 3 notification types
  const topTypes = useMemo(() => {
    const entries = Object.entries(data.typeDistribution);
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [data.typeDistribution]);

  return (
    <div className="border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIconBadge icon={Smartphone} variant="info" size="lg" showBackground={false} />
          <h4 className="font-medium">In-App</h4>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[data.status]}`}>
          {data.status.toUpperCase()}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Created (24h)</span>
          <span className="font-medium">{data.created24h.toLocaleString()}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Read Rate</span>
          <span className={`font-medium ${
            data.readRate >= 80 ? 'text-green-600' :
            data.readRate >= 50 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {data.readRate.toFixed(1)}%
          </span>
        </div>

        {/* Type Distribution */}
        {topTypes.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs text-gray-500 mb-2">Top Types</div>
            <div className="space-y-1">
              {topTypes.map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="text-gray-600 truncate max-w-[120px]">{type}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Activity */}
        {data.lastSuccess && (
          <div className="pt-2 border-t text-xs text-gray-500">
            Last: {new Date(data.lastSuccess).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Push Channel Card - FCM push notification metrics with circuit breaker
 * @phase Phase 2 - Channel Status Panel
 */
const PushChannelCard = memo(function PushChannelCard({
  data
}: {
  data: NotificationHealthResponse['channels']['push']
}) {
  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    paused: 'bg-gray-100 text-gray-800 border-gray-200',
    failed: 'bg-red-100 text-red-800 border-red-200'
  };

  const circuitBreakerColors = {
    closed: { bg: 'bg-green-100', text: 'text-green-800', label: 'CLOSED' },
    open: { bg: 'bg-red-100', text: 'text-red-800', label: 'OPEN' },
    'half-open': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'HALF-OPEN' }
  };

  const cbStyle = circuitBreakerColors[data.circuitBreaker.state];

  return (
    <div className="border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIconBadge icon={Bell} variant="info" size="lg" showBackground={false} />
          <h4 className="font-medium">Push (FCM)</h4>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[data.status]}`}>
          {data.status.toUpperCase()}
        </span>
      </div>

      {/* Circuit Breaker Visual */}
      <div className={`rounded p-3 mb-4 ${cbStyle.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-600">Circuit Breaker</div>
            <div className={`font-bold ${cbStyle.text}`}>{cbStyle.label}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-600">Failures</div>
            <div className={`font-medium ${cbStyle.text}`}>
              {data.circuitBreaker.failures}/{data.circuitBreaker.maxFailures}
            </div>
          </div>
        </div>

        {/* Progress bar for failures */}
        <div className="mt-2 bg-white/50 rounded h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${
              data.circuitBreaker.state === 'closed' ? 'bg-green-500' :
              data.circuitBreaker.state === 'open' ? 'bg-red-500' :
              'bg-yellow-500'
            }`}
            style={{
              width: `${(data.circuitBreaker.failures / data.circuitBreaker.maxFailures) * 100}%`
            }}
          />
        </div>

        {/* Next retry countdown if open */}
        {data.circuitBreaker.state === 'open' && data.circuitBreaker.nextRetryAt && (
          <div className="mt-2 text-xs text-gray-600">
            Retry at: {new Date(data.circuitBreaker.nextRetryAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Device Stats */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Active Devices</span>
          <span className="font-medium">{data.devices.active.toLocaleString()}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Registered</span>
          <span className="font-medium text-gray-500">{data.devices.total.toLocaleString()}</span>
        </div>

        {/* Platform Distribution */}
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500 mb-2">Platforms</div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="font-medium">{data.devices.byPlatform.web}</div>
              <div className="text-gray-500">Web</div>
            </div>
            <div>
              <div className="font-medium">{data.devices.byPlatform.ios}</div>
              <div className="text-gray-500">iOS</div>
            </div>
            <div>
              <div className="font-medium">{data.devices.byPlatform.android}</div>
              <div className="text-gray-500">Android</div>
            </div>
          </div>
        </div>

        {/* Error count */}
        {data.errorCount24h > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Errors (24h)</span>
              <span className="font-medium text-red-600">{data.errorCount24h}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Email Channel Card - Email notification metrics
 * @phase Phase 2 - Channel Status Panel
 */
const EmailChannelCard = memo(function EmailChannelCard({
  data
}: {
  data: NotificationHealthResponse['channels']['email']
}) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    id: number;
    enabled: boolean;
    adminEmail: string;
    throttleMinutes: number;
    alertOnUnhealthy: boolean;
    alertOnRecovered: boolean;
    alertOnDegraded: boolean;
    updatedBy: number | null;
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  // Fetch health alert config when config modal is opened
  const openConfigModal = useCallback(async () => {
    if (!alertConfig) {
      setConfigLoading(true);
      try {
        const response = await fetch('/api/admin/health-alerts/config', {
          credentials: 'include'
        });
        const result = await response.json();
        if (result.success && result.data) {
          setAlertConfig(result.data);
        }
      } catch (error) {
        ErrorService.capture('[EmailChannelCard] Failed to fetch alert config:', error);
      } finally {
        setConfigLoading(false);
      }
    }
    setShowConfigModal(true);
  }, [alertConfig]);

  const handleConfigSave = useCallback((updatedConfig: typeof alertConfig) => {
    if (updatedConfig) {
      setAlertConfig(updatedConfig);
    }
  }, []);

  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    paused: 'bg-gray-100 text-gray-800 border-gray-200',
    failed: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIconBadge icon={Mail} variant="info" size="lg" showBackground={false} />
          <h4 className="font-medium">Email</h4>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[data.status]}`}>
          {data.status.toUpperCase()}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Immediate (24h)</span>
          <span className="font-medium">{data.immediate24h.toLocaleString()}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Digest Queue</span>
          <span className={`font-medium ${
            data.digestQueueSize > 100 ? 'text-yellow-600' :
            data.digestQueueSize > 500 ? 'text-red-600' :
            ''
          }`}>
            {data.digestQueueSize.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Bounce Rate</span>
          <span className={`font-medium ${
            data.bounceRate > 5 ? 'text-red-600' :
            data.bounceRate > 2 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {data.bounceRate.toFixed(2)}%
          </span>
        </div>

        {/* Next Digest */}
        {data.nextDigestScheduled && (
          <div className="pt-2 border-t">
            <div className="text-xs text-gray-500 mb-1">Next Digest</div>
            <div className="text-sm font-medium">
              {new Date(data.nextDigestScheduled).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        )}

        {/* Last Success */}
        {data.lastSuccess && (
          <div className="pt-2 border-t text-xs text-gray-500">
            Last sent: {new Date(data.lastSuccess).toLocaleTimeString()}
          </div>
        )}

        {/* Error count */}
        {data.errorCount24h > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Failed (24h)</span>
              <span className="font-medium text-red-600">{data.errorCount24h}</span>
            </div>
          </div>
        )}

        {/* Config & Test Actions */}
        <div className="pt-3 border-t flex items-center gap-2">
          <button
            onClick={openConfigModal}
            disabled={configLoading}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100"
            title="Configure health alert email settings"
          >
            <Settings className="w-3.5 h-3.5" />
            Config
          </button>
          <button
            onClick={() => setShowTestModal(true)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100"
            title="Test all email delivery systems"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Test
          </button>
        </div>
      </div>

      {/* Config Modal */}
      {alertConfig && (
        <HealthAlertConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          config={alertConfig}
          onSave={handleConfigSave}
        />
      )}

      {/* Test Modal */}
      <EmailSystemTestModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
      />
    </div>
  );
});

// ============================================================================
// PHASE 3 COMPONENTS - DELIVERY METRICS PANEL
// ============================================================================

/**
 * Delivery Metrics Panel - Time-series charts for notification performance
 * @phase Phase 3 - Delivery Metrics Panel
 */
const DeliveryMetricsPanel = memo(function DeliveryMetricsPanel({
  metricsData,
  loading
}: {
  metricsData: NotificationMetricsResponse | null;
  loading: boolean;
}) {
  if (loading || !metricsData) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-medium mb-4">Delivery Metrics</h3>
        <div className="text-center py-8 text-gray-500">
          {loading ? 'Loading metrics...' : 'No metrics data available'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Delivery Metrics</h3>
        <div className="text-xs text-gray-500">
          {metricsData.dataPoints} data points (1 hour window)
        </div>
      </div>

      {/* Charts Grid - 2x2 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 1 */}
        <NotificationsPerMinuteChart
          history={metricsData.history}
          currentValue={metricsData.current.dispatchedPerMinute}
        />
        <DeliveryLatencyChart
          history={metricsData.history}
          current={metricsData.current}
        />

        {/* Row 2 */}
        <ChannelDistributionBar
          distribution={metricsData.channelDistribution}
        />
        <EventTypeBreakdown
          breakdown={metricsData.eventTypeBreakdown}
        />
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
        <div>
          Window: {new Date(metricsData.windowStart).toLocaleTimeString()} - {new Date(metricsData.windowEnd).toLocaleTimeString()}
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-500 border-dashed border-t"></span>
            Warning threshold
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-red-500 border-dashed border-t"></span>
            Critical threshold
          </span>
        </div>
      </div>
    </div>
  );
});

/**
 * Notifications Per Minute Chart - Dispatch rate over time
 * @phase Phase 3 - Delivery Metrics Panel
 */
const NotificationsPerMinuteChart = memo(function NotificationsPerMinuteChart({
  history,
  currentValue
}: {
  history: NotificationMetricsHistoryPoint[];
  currentValue: number;
}) {
  const chartData = useMemo(() => {
    return history.map(h => ({
      timestamp: h.timestamp,
      value: h.dispatchedPerMinute
    }));
  }, [history]);

  return (
    <MiniLineChart
      data={chartData}
      label="Notifications/min"
      currentValue={currentValue}
      color="#3b82f6"
      height={100}
      showArea={true}
    />
  );
});

/**
 * Delivery Latency Chart - Multi-series latency (avg, p95, p99)
 * @phase Phase 3 - Delivery Metrics Panel
 */
const DeliveryLatencyChart = memo(function DeliveryLatencyChart({
  history,
  current
}: {
  history: NotificationMetricsHistoryPoint[];
  current: NotificationMetricsResponse['current'];
}) {
  const seriesData = useMemo(() => {
    return [
      {
        name: 'Avg',
        color: '#3b82f6',
        data: history
          .filter(h => h.avgLatencyMs !== null)
          .map(h => ({ timestamp: h.timestamp, value: h.avgLatencyMs as number }))
      },
      {
        name: 'P95',
        color: '#f59e0b',
        data: history
          .filter(h => h.p95LatencyMs !== null)
          .map(h => ({ timestamp: h.timestamp, value: h.p95LatencyMs as number }))
      },
      {
        name: 'P99',
        color: '#ef4444',
        data: history
          .filter(h => h.p99LatencyMs !== null)
          .map(h => ({ timestamp: h.timestamp, value: h.p99LatencyMs as number }))
      }
    ];
  }, [history]);

  // Show "Not tracked" message if no latency data
  if (!seriesData[0] || seriesData[0].data.length === 0) {
    return (
      <div className="bg-gray-50 rounded p-3">
        <div className="text-xs font-medium text-gray-600 mb-2">Latency</div>
        <div className="text-xs text-gray-400 italic text-center py-2">Not tracked</div>
      </div>
    );
  }

  return (
    <MultiLineChart
      series={seriesData}
      label={`Latency (Avg: ${current.avgLatencyMs !== null ? current.avgLatencyMs + 'ms' : 'Not tracked'})`}
      height={100}
      legend={true}
    />
  );
});

/**
 * Channel Distribution Bar - Horizontal stacked bar for channel breakdown
 * @phase Phase 3 - Delivery Metrics Panel
 */
const ChannelDistributionBar = memo(function ChannelDistributionBar({
  distribution
}: {
  distribution: NotificationMetricsResponse['channelDistribution'];
}) {
  const { inApp, push, email, total } = distribution;

  if (total === 0) {
    return (
      <div className="bg-gray-50 rounded p-3">
        <div className="text-xs font-medium text-gray-600 mb-2">Channel Distribution</div>
        <div className="text-xs text-gray-600 text-center py-2">No data yet</div>
      </div>
    );
  }

  const channels = [
    { name: 'In-App', count: inApp, color: '#3b82f6' },
    ...(push !== null ? [{ name: 'Push', count: push, color: '#22c55e' }] : []),
    { name: 'Email', count: email, color: '#f59e0b' }
  ].filter(c => c.count > 0);

  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="text-xs font-medium text-gray-600 mb-2">
        Channel Distribution (Total: {total.toLocaleString()})
      </div>

      {/* Stacked bar */}
      <div className="h-6 flex rounded overflow-hidden">
        {channels.map(channel => (
          <div
            key={channel.name}
            className="h-full transition-all duration-300"
            style={{
              width: `${(channel.count / total) * 100}%`,
              backgroundColor: channel.color,
              minWidth: channel.count > 0 ? '4px' : '0'
            }}
            title={`${channel.name}: ${channel.count.toLocaleString()} (${((channel.count / total) * 100).toFixed(1)}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {channels.map(channel => (
          <div key={channel.name} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: channel.color }}
            />
            <span className="text-xs text-gray-600">{channel.name}:</span>
            <span className="text-xs font-medium">{channel.count.toLocaleString()}</span>
            <span className="text-xs text-gray-600">
              ({((channel.count / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Event Type Breakdown - Horizontal bar chart for top event types
 * @phase Phase 3 - Delivery Metrics Panel
 */
const EventTypeBreakdown = memo(function EventTypeBreakdown({
  breakdown
}: {
  breakdown: NotificationMetricsResponse['eventTypeBreakdown'];
}) {
  if (breakdown.length === 0) {
    return (
      <div className="bg-gray-50 rounded p-3">
        <div className="text-xs font-medium text-gray-600 mb-2">Event Types</div>
        <div className="text-xs text-gray-600 text-center py-2">No data yet</div>
      </div>
    );
  }

  const maxCount = Math.max(...breakdown.map(b => b.count));
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'];

  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="text-xs font-medium text-gray-600 mb-2">Event Types (Top 10)</div>

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {breakdown.map((event, idx) => (
          <div key={event.eventType} className="flex items-center gap-2">
            <div className="w-20 text-xs text-gray-600 truncate" title={event.eventType}>
              {event.eventType}
            </div>
            <div className="flex-1 bg-gray-200 rounded h-4 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${(event.count / maxCount) * 100}%`,
                  backgroundColor: colors[idx % colors.length]
                }}
              />
            </div>
            <div className="w-16 text-xs text-right">
              <span className="font-medium">{event.count.toLocaleString()}</span>
              <span className="text-gray-600 ml-1">({event.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// PHASE 4 COMPONENTS - QUEUE MANAGEMENT PANEL
// ============================================================================

/**
 * Queue Management Panel - Digest queue and stale notification management
 * @phase Phase 4 - Queue Management Panel
 */
const QueueManagementPanel = memo(function QueueManagementPanel({
  digestData,
  staleData,
  loading,
  onProcessDigests,
  onCleanStale,
  processing
}: {
  digestData: DigestQueueResponse | null;
  staleData: StaleNotificationsResponse | null;
  loading: boolean;
  onProcessDigests: (_frequency: string, _dryRun: boolean) => void;
  onCleanStale: (_minAgeDays: number, _dryRun: boolean) => void;
  processing: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'digest' | 'stale'>('digest');

  if (loading) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-medium mb-4">Queue Management</h3>
        <div className="text-center py-8 text-gray-500">Loading queue data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Queue Management</h3>

        {/* Tab Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('digest')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'digest'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Digest Queue
            {digestData && digestData.statistics.totalPending > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-[#ed6437] text-white text-xs rounded">
                {digestData.statistics.totalPending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stale')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'stale'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Stale Notifications
            {staleData && staleData.statistics.total > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded">
                {staleData.statistics.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'digest' ? (
        <DigestQueueSection
          data={digestData}
          onProcess={onProcessDigests}
          processing={processing}
        />
      ) : (
        <StaleNotificationsSection
          data={staleData}
          onClean={onCleanStale}
          processing={processing}
        />
      )}
    </div>
  );
});

/**
 * Digest Queue Section - Shows pending digest items and process action
 * @phase Phase 4 - Queue Management Panel
 */
const DigestQueueSection = memo(function DigestQueueSection({
  data,
  onProcess,
  processing
}: {
  data: DigestQueueResponse | null;
  onProcess: (_frequency: string, _dryRun: boolean) => void;
  processing: boolean;
}) {
  if (!data) {
    return <div className="text-center py-4 text-gray-500">No digest data available</div>;
  }

  const { statistics, items } = data;
  const hasOldEntries = statistics.oldestEntryHours > 24;

  return (
    <div className="space-y-4">
      {/* Statistics Row */}
      <div className="grid grid-cols-5 gap-4 p-3 bg-gray-50 rounded">
        <div className="text-center">
          <div className="text-2xl font-bold">{statistics.totalPending}</div>
          <div className="text-xs text-gray-500">Total Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{statistics.dailyPending}</div>
          <div className="text-xs text-gray-500">Daily</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{statistics.weeklyPending}</div>
          <div className="text-xs text-gray-500">Weekly</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${hasOldEntries ? 'text-amber-600' : ''}`}>
            {statistics.oldestEntryHours}h
          </div>
          <div className="text-xs text-gray-500">Oldest</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{statistics.usersAffected}</div>
          <div className="text-xs text-gray-500">Users</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onProcess('all', false)}
          disabled={processing || statistics.totalPending === 0}
          className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {processing ? 'Processing...' : 'Process All Digests'}
        </button>
        <button
          onClick={() => onProcess('daily', false)}
          disabled={processing || statistics.dailyPending === 0}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Process Daily Only
        </button>
        <button
          onClick={() => onProcess('weekly', false)}
          disabled={processing || statistics.weeklyPending === 0}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Process Weekly Only
        </button>
      </div>

      {/* Queue Table */}
      {items.length > 0 ? (
        <EmailDigestQueueTable items={items} />
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📭</div>
          <div>Digest queue is empty</div>
        </div>
      )}
    </div>
  );
});

/**
 * Email Digest Queue Table - Displays pending digest items
 * @phase Phase 4 - Queue Management Panel
 */
const EmailDigestQueueTable = memo(function EmailDigestQueueTable({
  items
}: {
  items: DigestQueueResponse['items'];
}) {
  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">User</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Title</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Frequency</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Scheduled</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Age</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-t hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium truncate max-w-[120px]" title={item.userName}>
                  {item.userName}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-[120px]" title={item.userEmail}>
                  {item.userEmail}
                </div>
              </td>
              <td className="px-3 py-2 truncate max-w-[200px]" title={item.title}>
                {item.title}
              </td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                  {item.eventType}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  item.digestFrequency === 'daily' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {item.digestFrequency}
                </span>
              </td>
              <td className="px-3 py-2 text-xs">
                {new Date(item.scheduledFor).toLocaleDateString()}
              </td>
              <td className="px-3 py-2">
                <span className={`text-xs font-medium ${
                  item.ageHours > 48 ? 'text-red-600' :
                  item.ageHours > 24 ? 'text-amber-600' :
                  'text-gray-600'
                }`}>
                  {item.ageHours}h
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

/**
 * Stale Notifications Section - Shows old notifications and cleanup action
 * @phase Phase 4 - Queue Management Panel
 */
const StaleNotificationsSection = memo(function StaleNotificationsSection({
  data,
  onClean,
  processing
}: {
  data: StaleNotificationsResponse | null;
  onClean: (_minAgeDays: number, _dryRun: boolean) => void;
  processing: boolean;
}) {
  const [cleanDays, setCleanDays] = useState(90);

  if (!data) {
    return <div className="text-center py-4 text-gray-500">No stale data available</div>;
  }

  const { statistics, items } = data;

  return (
    <div className="space-y-4">
      {/* Statistics Row */}
      <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded">
        <div className="text-center">
          <div className="text-2xl font-bold">{statistics.total}</div>
          <div className="text-xs text-gray-500">30+ Days Old</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{statistics.unread}</div>
          <div className="text-xs text-gray-500">Unread</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{statistics.olderThan90Days}</div>
          <div className="text-xs text-gray-500">90+ Days Old</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium text-gray-600">
            {statistics.total > 0 ? Math.round((statistics.unread / statistics.total) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-500">Unread Rate</div>
        </div>
      </div>

      {/* Cleanup Action */}
      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
        <div className="flex-1">
          <div className="font-medium text-amber-800">Cleanup Stale Notifications</div>
          <div className="text-sm text-amber-700">
            Delete notifications older than specified days. This action cannot be undone.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={cleanDays}
            onChange={(e) => setCleanDays(parseInt(e.target.value))}
            className="px-2 py-1.5 border rounded text-sm"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>1 year</option>
          </select>
          <button
            onClick={() => onClean(cleanDays, true)}
            disabled={processing || statistics.total === 0}
            className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Preview
          </button>
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete all notifications older than ${cleanDays} days? This cannot be undone.`)) {
                onClean(cleanDays, false);
              }
            }}
            disabled={processing || statistics.total === 0}
            className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {processing ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Stale Table */}
      {items.length > 0 ? (
        <StalledNotificationsTable items={items} />
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">✨</div>
          <div>No stale notifications found</div>
        </div>
      )}
    </div>
  );
});

/**
 * Stalled Notifications Table - Displays old notifications
 * @phase Phase 4 - Queue Management Panel
 */
const StalledNotificationsTable = memo(function StalledNotificationsTable({
  items
}: {
  items: StaleNotificationsResponse['items'];
}) {
  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">User</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Title</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Created</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Age</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-t hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium truncate max-w-[120px]" title={item.userName}>
                  {item.userName}
                </div>
              </td>
              <td className="px-3 py-2 truncate max-w-[200px]" title={item.title}>
                {item.title}
              </td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                  {item.notificationType}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  item.isRead ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.isRead ? 'Read' : 'Unread'}
                </span>
              </td>
              <td className="px-3 py-2 text-xs">
                {new Date(item.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-2">
                <span className={`text-xs font-medium ${
                  item.ageDays > 90 ? 'text-red-600' :
                  item.ageDays > 60 ? 'text-amber-600' :
                  'text-gray-600'
                }`}>
                  {item.ageDays}d
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// ============================================================================
// PHASE 5 COMPONENTS - TROUBLESHOOTING PANEL
// ============================================================================

/**
 * Troubleshooting Panel - User lookup and notification debugging
 * @phase Phase 5 - Troubleshooting Panel
 */
const TroubleshootingPanel = memo(function TroubleshootingPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'id'>('email');
  const [selectedUser, setSelectedUser] = useState<TroubleshootUserResult | null>(null);
  const [historyData, setHistoryData] = useState<TroubleshootHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<TroubleshootNotificationDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search for user
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedUser(null);
    setHistoryData(null);

    try {
      const param = searchType === 'email' ? `email=${encodeURIComponent(searchTerm)}` : `id=${searchTerm}`;
      const response = await fetch(`/api/admin/notifications/troubleshoot/user?${param}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        if (result.data.found && result.data.user) {
          setSelectedUser(result.data.user);
          // Auto-fetch history
          fetchHistory(result.data.user.id);
        } else {
          setError(`No user found with ${searchType}: ${searchTerm}`);
        }
      } else {
        setError(result.error?.message || 'Search failed');
      }
    } catch (err) {
      ErrorService.capture('[Troubleshoot] Search failed:', err);
      setError('Failed to search for user');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, searchType]);

  // Fetch notification history
  const fetchHistory = useCallback(async (userId: number, page = 1) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(
        `/api/admin/notifications/troubleshoot/history?userId=${userId}&page=${page}&pageSize=10`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success && result.data) {
        setHistoryData(result.data);
      }
    } catch (err) {
      ErrorService.capture('[Troubleshoot] History fetch failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // View notification detail
  const handleViewDetail = useCallback(async (notificationId: number) => {
    try {
      const response = await fetch(
        `/api/admin/notifications/troubleshoot/${notificationId}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success && result.data) {
        setSelectedNotification(result.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      ErrorService.capture('[Troubleshoot] Detail fetch failed:', err);
    }
  }, []);

  // Retry notification
  const handleRetry = useCallback(async (notificationId: number) => {
    setRetrying(true);
    setRetryMessage(null);

    try {
      const response = await fetch('/api/admin/notifications/troubleshoot/retry', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      const result = await response.json();

      if (result.success && result.data) {
        setRetryMessage({ type: 'success', text: result.data.message });
        // Refresh history
        if (selectedUser) {
          fetchHistory(selectedUser.id);
        }
      } else {
        setRetryMessage({ type: 'error', text: result.error?.message || 'Retry failed' });
      }
    } catch (err) {
      ErrorService.capture('[Troubleshoot] Retry failed:', err);
      setRetryMessage({ type: 'error', text: 'Failed to retry notification' });
    } finally {
      setRetrying(false);
    }
  }, [selectedUser]); // fetchHistory is defined in the same component, safe to exclude

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-medium mb-4">Troubleshooting</h3>

      {/* Search Section */}
      <div className="flex gap-3 mb-4">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value as 'email' | 'id')}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="email">Email</option>
          <option value="id">User ID</option>
        </select>
        <input
          type={searchType === 'id' ? 'number' : 'email'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={searchType === 'email' ? 'user@example.com' : 'User ID'}
          className="flex-1 px-3 py-2 border rounded text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !searchTerm.trim()}
          className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 mb-4 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* Retry Message */}
      {retryMessage && (
        <div className={`p-3 mb-4 rounded text-sm ${
          retryMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {retryMessage.text}
          <button
            onClick={() => setRetryMessage(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* User Card */}
      {selectedUser && (
        <UserInfoCard user={selectedUser} />
      )}

      {/* Notification History */}
      {selectedUser && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Notification History</h4>
            {historyData && (
              <span className="text-xs text-gray-500">
                {historyData.pagination.totalItems} notifications
              </span>
            )}
          </div>

          {historyLoading ? (
            <div className="text-center py-4 text-gray-500">Loading history...</div>
          ) : historyData && historyData.notifications.length > 0 ? (
            <>
              <TroubleshootHistoryTable
                notifications={historyData.notifications}
                onViewDetail={handleViewDetail}
                onRetry={handleRetry}
                retrying={retrying}
              />
              {/* Pagination */}
              {historyData.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-3">
                  {Array.from({ length: historyData.pagination.totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => fetchHistory(selectedUser.id, i + 1)}
                      className={`px-3 py-1 rounded text-sm ${
                        historyData.pagination.page === i + 1
                          ? 'bg-[#ed6437] text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">No notifications found</div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedNotification(null);
          }}
          onRetry={handleRetry}
          retrying={retrying}
        />
      )}
    </div>
  );
});

/**
 * User Info Card - Displays user details and notification stats
 * @phase Phase 5 - Troubleshooting Panel
 */
const UserInfoCard = memo(function UserInfoCard({
  user
}: {
  user: TroubleshootUserResult;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded border">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{user.firstName} {user.lastName}</div>
          <div className="text-sm text-gray-600">{user.email}</div>
          <div className="text-xs text-gray-500 mt-1">
            ID: {user.id} | Type: {user.accountType} | Joined: {new Date(user.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold">{user.notificationStats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-600">{user.notificationStats.unread}</div>
            <div className="text-xs text-gray-500">Unread</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">{user.pushDevices.active}</div>
            <div className="text-xs text-gray-500">Devices</div>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t flex gap-4 text-xs">
        <span className={`px-2 py-1 rounded ${user.preferences.masterEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Notifications: {user.preferences.masterEnabled ? 'ON' : 'OFF'}
        </span>
        <span className={`px-2 py-1 rounded ${user.preferences.quietHoursEnabled ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
          Quiet Hours: {user.preferences.quietHoursEnabled ? 'ON' : 'OFF'}
        </span>
        {user.lastLoginAt && (
          <span className="text-gray-500">
            Last login: {new Date(user.lastLoginAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
});

/**
 * Troubleshoot History Table - Notification list with actions
 * @phase Phase 5 - Troubleshooting Panel
 */
const TroubleshootHistoryTable = memo(function TroubleshootHistoryTable({
  notifications,
  onViewDetail,
  onRetry,
  retrying
}: {
  notifications: TroubleshootNotificationEntry[];
  onViewDetail: (_id: number) => void;
  onRetry: (_id: number) => void;
  retrying: boolean;
}) {
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'queued':
        return 'bg-amber-100 text-amber-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="overflow-x-auto border rounded">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Title</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Channels</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Created</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map(notif => (
            <tr key={notif.id} className="border-t hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="truncate max-w-[200px]" title={notif.title}>
                  {notif.title}
                </div>
              </td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                  {notif.type}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  notif.isRead ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {notif.isRead ? 'Read' : 'Unread'}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusBadge(notif.deliveryStatus.inApp)}`}>
                    In-App
                  </span>
                  {notif.deliveryStatus.email && (
                    <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusBadge(notif.deliveryStatus.email)}`}>
                      Email: {notif.deliveryStatus.email}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 text-xs">
                {new Date(notif.createdAt).toLocaleString()}
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => onViewDetail(notif.id)}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onRetry(notif.id)}
                    disabled={retrying || notif.ageMinutes > 7 * 24 * 60}
                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title={notif.ageMinutes > 7 * 24 * 60 ? 'Too old to retry' : 'Retry notification'}
                  >
                    Retry
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

/**
 * Notification Detail Modal - Full delivery chain visualization
 * @phase Phase 5 - Troubleshooting Panel
 */
const NotificationDetailModal = memo(function NotificationDetailModal({
  notification,
  onClose,
  onRetry,
  retrying
}: {
  notification: TroubleshootNotificationDetail;
  onClose: () => void;
  onRetry: (_id: number) => void;
  retrying: boolean;
}) {
  const getEventIcon = (action: string) => {
    switch (action) {
      case 'created': return '📝';
      case 'sent': return '📤';
      case 'delivered': return '✅';
      case 'read': return '👁️';
      case 'failed': return '❌';
      case 'queued': return '📋';
      case 'skipped': return '⏭️';
      default: return '•';
    }
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-500 bg-green-50';
      case 'failure': return 'border-red-500 bg-red-50';
      case 'pending': return 'border-amber-500 bg-amber-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <BizModal
      isOpen={true}
      onClose={onClose}
      title="Notification Details"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Notification Info */}
        <div className="p-4 bg-gray-50 rounded">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium">{notification.title}</div>
              {notification.message && (
                <div className="text-sm text-gray-600 mt-1">{notification.message}</div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                Type: {notification.type} | Priority: {notification.priority} | Age: {Math.round(notification.ageMinutes / 60)}h
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${
              notification.isRead ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {notification.isRead ? 'Read' : 'Unread'}
            </span>
          </div>
        </div>

        {/* User Info */}
        <div className="text-sm">
          <span className="text-gray-600">Recipient:</span>
          <span className="ml-2 font-medium">{notification.user.name}</span>
          <span className="ml-2 text-gray-500">({notification.user.email})</span>
        </div>

        {/* Delivery Chain */}
        <div>
          <h4 className="font-medium mb-2">Delivery Chain</h4>
          <div className="space-y-2">
            {notification.deliveryChain.map((event, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border-l-4 ${getEventColor(event.status)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span>{getEventIcon(event.action)}</span>
                    <span className="font-medium capitalize">{event.channel}</span>
                    <span className="text-gray-600">-</span>
                    <span className="capitalize">{event.action}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                {event.details && (
                  <div className="text-sm text-gray-600 mt-1 ml-6">{event.details}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {notification.retryEligible ? (
              <button
                onClick={() => onRetry(notification.id)}
                disabled={retrying}
                className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f] disabled:opacity-50 text-sm font-medium"
              >
                {retrying ? 'Retrying...' : 'Retry Notification'}
              </button>
            ) : (
              <span className="text-sm text-gray-500">{notification.retryReason}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </BizModal>
  );
});

// ============================================================================
// PHASE 6 COMPONENTS - SETUP GUIDES PANEL
// ============================================================================

/**
 * Setup Guides Panel - Firebase and WebSocket configuration guides
 * @phase Phase 6 - Setup Guides Panel
 */
const SetupGuidesPanel = memo(function SetupGuidesPanel({
  guidesData,
  loading,
  onTestPush,
  testingPush
}: {
  guidesData: SetupGuidesResponse | null;
  loading: boolean;
  onTestPush: () => void;
  testingPush: boolean;
}) {
  const [activeGuide, setActiveGuide] = useState<'firebase' | 'websocket' | null>(null);

  if (loading || !guidesData) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-medium mb-4">Setup Guides</h3>
        <div className="text-center py-8 text-gray-500">
          {loading ? 'Loading setup status...' : 'No setup data available'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Setup Guides</h3>
        <span className="text-xs text-gray-500">
          Last updated: {new Date(guidesData.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      <div className="space-y-4">
        {/* Firebase Setup Guide */}
        <FirebaseSetupGuide
          status={guidesData.firebase}
          expanded={activeGuide === 'firebase'}
          onToggle={() => setActiveGuide(activeGuide === 'firebase' ? null : 'firebase')}
          onTestPush={onTestPush}
          testingPush={testingPush}
        />

        {/* WebSocket Upgrade Guide */}
        <WebSocketUpgradeGuide
          status={guidesData.webSocket}
          expanded={activeGuide === 'websocket'}
          onToggle={() => setActiveGuide(activeGuide === 'websocket' ? null : 'websocket')}
        />
      </div>
    </div>
  );
});

/**
 * Firebase Setup Guide - Expandable guide with status and setup steps
 * @phase Phase 6 - Setup Guides Panel
 */
const FirebaseSetupGuide = memo(function FirebaseSetupGuide({
  status,
  expanded,
  onToggle,
  onTestPush,
  testingPush
}: {
  status: FirebaseStatus;
  expanded: boolean;
  onToggle: () => void;
  onTestPush: () => void;
  testingPush: boolean;
}) {
  const getStatusColor = () => {
    if (status.credentialStatus === 'valid') return 'bg-green-100 border-green-300';
    if (status.credentialStatus === 'invalid') return 'bg-red-100 border-red-300';
    return 'bg-amber-100 border-amber-300';
  };

  const getStatusIcon = () => {
    if (status.credentialStatus === 'valid') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status.credentialStatus === 'invalid') return <XCircle className="w-5 h-5 text-red-600" />;
    return <AlertTriangle className="w-5 h-5 text-amber-600" />;
  };

  const getStatusText = () => {
    if (status.credentialStatus === 'valid') return 'Configured';
    if (status.credentialStatus === 'invalid') return 'Invalid Configuration';
    return 'Not Configured';
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${getStatusColor()}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-75 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Zap className="w-5 h-5 text-orange-500" />
          <span className="font-medium">Firebase Cloud Messaging (FCM)</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm">{getStatusText()}</span>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 bg-white border-t">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
            <StatusItem
              label="Server Key"
              value={status.serverKeyConfigured ? 'Configured' : 'Missing'}
              ok={status.serverKeyConfigured}
            />
            <StatusItem
              label="Project ID"
              value={status.projectIdMasked || 'Not set'}
              ok={!!status.projectIdMasked}
            />
            <StatusItem
              label="Service Worker"
              value={status.serviceWorkerRegistered ? 'Registered' : 'Not found'}
              ok={status.serviceWorkerRegistered}
            />
            <StatusItem
              label="Circuit Breaker"
              value={status.circuitBreakerState}
              ok={status.circuitBreakerState === 'CLOSED'}
            />
          </div>

          {/* Error Message */}
          {status.errorMessage && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {status.errorMessage}
            </div>
          )}

          {/* Setup Instructions */}
          {!status.configured && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">Setup Instructions</h4>
              <div className="space-y-3">
                <SetupStep
                  number={1}
                  title="Create Firebase Project"
                  completed={false}
                  instructions={[
                    'Go to console.firebase.google.com',
                    'Create a new project or select existing',
                    'Enable Cloud Messaging in project settings'
                  ]}
                />
                <SetupStep
                  number={2}
                  title="Get Server Credentials"
                  completed={false}
                  instructions={[
                    'Go to Project Settings → Cloud Messaging',
                    'Find Server key under "Cloud Messaging API (Legacy)"',
                    'If not visible, enable Cloud Messaging API first'
                  ]}
                />
                <SetupStep
                  number={3}
                  title="Configure Environment"
                  completed={status.serverKeyConfigured}
                  instructions={[
                    'Add to .env.local: FCM_SERVER_KEY=your-server-key',
                    'Optionally add: FIREBASE_PROJECT_ID=your-project-id',
                    'Restart the development server'
                  ]}
                />
                <SetupStep
                  number={4}
                  title="Configure Service Worker"
                  completed={status.serviceWorkerRegistered}
                  instructions={[
                    'Edit public/firebase-messaging-sw.js',
                    'Replace placeholder values with your Firebase config',
                    'The config is from Firebase Console → Project Settings → General'
                  ]}
                />
              </div>
            </div>
          )}

          {/* Test Button */}
          {status.configured && (
            <div className="flex items-center gap-3 pt-4 border-t mt-4">
              <button
                onClick={onTestPush}
                disabled={testingPush || status.circuitBreakerState === 'OPEN'}
                className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {testingPush ? 'Sending...' : 'Send Test Push'}
              </button>
              <span className="text-sm text-gray-500">
                Sends a test notification to your registered devices
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * WebSocket Upgrade Guide - Status display with trigger conditions
 * @phase Phase 6 - Setup Guides Panel
 */
const WebSocketUpgradeGuide = memo(function WebSocketUpgradeGuide({
  status,
  expanded,
  onToggle
}: {
  status: WebSocketStatus;
  expanded: boolean;
  onToggle: () => void;
}) {
  const conditionsMet = status.triggerConditions.filter(c => c.met).length;
  const totalConditions = status.triggerConditions.length;

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-50 border-gray-200">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="text-lg">🔌</span>
          <span className="font-medium">WebSocket Upgrade Path</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            status.currentTransport === 'websocket'
              ? 'bg-green-100 text-green-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {status.currentTransport === 'websocket' ? 'WebSocket Active' : 'Using Polling'}
          </span>
          <span className="text-sm text-gray-500">
            {conditionsMet}/{totalConditions} triggers met
          </span>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 bg-white border-t">
          {/* Current Status */}
          <div className="py-4">
            <h4 className="font-medium text-gray-800 mb-3">Current Configuration</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-500">Messages Polling</div>
                <div className="font-medium">{status.pollingIntervals.messages}s</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-500">Dashboard Polling</div>
                <div className="font-medium">{status.pollingIntervals.dashboard}s</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-500">Other Pages</div>
                <div className="font-medium">{status.pollingIntervals.other}s</div>
              </div>
            </div>
          </div>

          {/* Trigger Conditions */}
          <div className="py-4 border-t">
            <h4 className="font-medium text-gray-800 mb-3">Upgrade Trigger Conditions</h4>
            <div className="space-y-2">
              {status.triggerConditions.map((condition, idx) => (
                <TriggerConditionRow key={idx} condition={condition} />
              ))}
            </div>
          </div>

          {/* Cost Comparison */}
          <div className="py-4 border-t">
            <h4 className="font-medium text-gray-800 mb-3">Cost Analysis</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-blue-600">Current (Polling)</div>
                <div className="text-xl font-bold">${status.costComparison.pollingDailyUsd}/day</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-purple-600">WebSocket</div>
                <div className="text-xl font-bold">${status.costComparison.websocketDailyUsd}/day</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">Break-even</div>
                <div className="text-xl font-bold">{status.costComparison.breakEvenConcurrentUsers.toLocaleString()} users</div>
              </div>
            </div>
          </div>

          {/* Documentation Link */}
          <div className="pt-4 border-t">
            <a
              href={status.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View Full WebSocket Upgrade Documentation
            </a>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Status Item - Single status indicator
 * @phase Phase 6 - Setup Guides Panel
 */
const StatusItem = memo(function StatusItem({
  label,
  value,
  ok
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="bg-gray-50 p-2 rounded">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-sm font-medium flex items-center gap-1 ${ok ? 'text-green-700' : 'text-red-700'}`}>
        {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {value}
      </div>
    </div>
  );
});

/**
 * Setup Step - Single setup instruction step
 * @phase Phase 6 - Setup Guides Panel
 */
const SetupStep = memo(function SetupStep({
  number,
  title,
  completed,
  instructions
}: {
  number: number;
  title: string;
  completed: boolean;
  instructions: string[];
}) {
  return (
    <div className={`p-3 rounded border ${completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
        }`}>
          {completed ? '✓' : number}
        </span>
        <span className={`font-medium ${completed ? 'text-green-800' : 'text-gray-800'}`}>
          {title}
        </span>
      </div>
      <ul className="ml-8 space-y-1 text-sm text-gray-600">
        {instructions.map((instruction, idx) => (
          <li key={idx} className="list-disc">{instruction}</li>
        ))}
      </ul>
    </div>
  );
});

/**
 * Trigger Condition Row - Single trigger condition display
 * @phase Phase 6 - Setup Guides Panel
 */
const TriggerConditionRow = memo(function TriggerConditionRow({
  condition
}: {
  condition: TriggerCondition;
}) {
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className={`p-3 rounded border ${condition.met ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${condition.met ? 'text-green-800' : 'text-gray-800'}`}>
              {condition.name}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${priorityColors[condition.priority]}`}>
              {condition.priority}
            </span>
          </div>
          <div className="text-sm text-gray-500">{condition.description}</div>
        </div>
        <div className="text-right">
          {condition.met ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-600" />
          )}
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-xs">
        <span className="text-gray-500">Current: <span className="font-medium text-gray-700">{condition.currentValue}</span></span>
        <span className="text-gray-500">Threshold: <span className="font-medium text-gray-700">{condition.threshold}</span></span>
      </div>
    </div>
  );
});

// ============================================================================
// PHASE 7 COMPONENTS - PREFERENCES ANALYTICS PANEL
// ============================================================================

/**
 * Preferences Analytics Panel - Aggregate user preference statistics
 * @phase Phase 7 - Preferences Analytics Panel
 */
const PreferencesAnalyticsPanel = memo(function PreferencesAnalyticsPanel({
  analyticsData,
  loading
}: {
  analyticsData: PreferencesAnalyticsResponse | null;
  loading: boolean;
}) {
  if (loading || !analyticsData) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-medium mb-4">Preferences Analytics</h3>
        <div className="text-center py-8 text-gray-500">
          {loading ? 'Analyzing user preferences...' : 'No analytics data available'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Preferences Analytics</h3>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>
            {analyticsData.totalUsers.toLocaleString()} users analyzed
          </span>
          <span>
            ({analyticsData.usersWithCustomPreferences.toLocaleString()} with custom preferences)
          </span>
        </div>
      </div>

      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlobalOptOutDisplay data={analyticsData.globalOptOut} totalUsers={analyticsData.totalUsers} />
        <QuietHoursDisplay data={analyticsData.quietHours} />
        <DigestEnabledDisplay data={analyticsData.digest} />
        <AnalysisMetadataDisplay metadata={analyticsData.metadata} />
      </div>

      {/* Category Preferences Chart */}
      <div className="border-t pt-4">
        <CategoryPreferencesChart categories={analyticsData.categories} totalUsers={analyticsData.totalUsers} />
      </div>

      {/* Digest Frequency Breakdown */}
      <div className="border-t pt-4 mt-4">
        <DigestFrequencyBreakdown digest={analyticsData.digest} />
      </div>
    </div>
  );
});

/**
 * Global Opt-Out Display - Users with notifications disabled
 * @phase Phase 7 - Preferences Analytics Panel
 */
const GlobalOptOutDisplay = memo(function GlobalOptOutDisplay({
  data,
  totalUsers
}: {
  data: PreferencesAnalyticsResponse['globalOptOut'];
  totalUsers: number;
}) {
  const isHighOptOut = data.percentage > 5;

  return (
    <div className={`p-4 rounded-lg border ${isHighOptOut ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
      <div className="text-sm text-gray-600 mb-1">Global Opt-Out Rate</div>
      <div className={`text-2xl font-bold ${isHighOptOut ? 'text-amber-700' : 'text-green-700'}`}>
        {data.percentage.toFixed(1)}%
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {data.count.toLocaleString()} of {totalUsers.toLocaleString()} users
      </div>
    </div>
  );
});

/**
 * Quiet Hours Display - Users with quiet hours enabled
 * @phase Phase 7 - Preferences Analytics Panel
 */
const QuietHoursDisplay = memo(function QuietHoursDisplay({
  data
}: {
  data: PreferencesAnalyticsResponse['quietHours'];
}) {
  return (
    <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
      <div className="text-sm text-gray-600 mb-1">Quiet Hours Usage</div>
      <div className="text-2xl font-bold text-purple-700">
        {data.enabledPercentage.toFixed(1)}%
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {data.enabledCount.toLocaleString()} users enabled
      </div>
      {data.commonStartTimes[0] && (
        <div className="text-xs text-purple-600 mt-1">
          Most common: {data.commonStartTimes[0].time} - {data.commonEndTimes[0]?.time || '08:00'}
        </div>
      )}
    </div>
  );
});

/**
 * Digest Enabled Display - Users with digest emails enabled
 * @phase Phase 7 - Preferences Analytics Panel
 */
const DigestEnabledDisplay = memo(function DigestEnabledDisplay({
  data
}: {
  data: PreferencesAnalyticsResponse['digest'];
}) {
  return (
    <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
      <div className="text-sm text-gray-600 mb-1">Digest Email Adoption</div>
      <div className="text-2xl font-bold text-blue-700">
        {data.enabledPercentage.toFixed(1)}%
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {data.enabledCount.toLocaleString()} users enabled
      </div>
      <div className="text-xs text-blue-600 mt-1">
        Daily: {data.frequencyBreakdown.daily.toLocaleString()} | Weekly: {data.frequencyBreakdown.weekly.toLocaleString()}
      </div>
    </div>
  );
});

/**
 * Analysis Metadata Display - Query performance info
 * @phase Phase 7 - Preferences Analytics Panel
 */
const AnalysisMetadataDisplay = memo(function AnalysisMetadataDisplay({
  metadata
}: {
  metadata: PreferencesAnalyticsResponse['metadata'];
}) {
  return (
    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
      <div className="text-sm text-gray-600 mb-1">Analysis Info</div>
      <div className="text-lg font-medium text-gray-700">
        {metadata.analysisTimeMs}ms
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Query time
      </div>
      <div className={`text-xs mt-1 ${metadata.dataAge === 'fresh' ? 'text-green-600' : 'text-amber-600'}`}>
        Data: {metadata.dataAge}
      </div>
    </div>
  );
});

/**
 * Category Preferences Chart - Per-category enablement rates
 * @phase Phase 7 - Preferences Analytics Panel
 */
const CategoryPreferencesChart = memo(function CategoryPreferencesChart({
  categories,
  totalUsers
}: {
  categories: CategoryAnalytics[];
  totalUsers: number;
}) {
  // Sort by enabled percentage descending
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => b.enabledPercentage - a.enabledPercentage);
  }, [categories]);

  return (
    <div>
      <h4 className="font-medium text-gray-800 mb-3">Category Enablement Rates</h4>
      <div className="space-y-3">
        {sortedCategories.map(cat => (
          <CategoryBar key={cat.category} category={cat} totalUsers={totalUsers} />
        ))}
      </div>
    </div>
  );
});

/**
 * Category Bar - Single category horizontal bar
 * @phase Phase 7 - Preferences Analytics Panel
 */
const CategoryBar = memo(function CategoryBar({
  category,
  totalUsers
}: {
  category: CategoryAnalytics;
  totalUsers: number;
}) {
  const categoryColors: Record<string, string> = {
    messages: 'bg-blue-500',
    connections: 'bg-green-500',
    reviews: 'bg-amber-500',
    events: 'bg-purple-500',
    subscriptions: 'bg-pink-500',
    system: 'bg-gray-500'
  };

  const barColor = categoryColors[category.category] || 'bg-gray-500';

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{category.label}</span>
        <span className="text-sm text-gray-500">
          {category.enabledPercentage.toFixed(1)}% ({category.enabledCount.toLocaleString()})
        </span>
      </div>
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.min(100, category.enabledPercentage)}%` }}
        />
      </div>
      {/* Channel breakdown on hover */}
      <div className="flex gap-4 mt-1 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <span>In-App: {category.inAppEnabledCount.toLocaleString()}</span>
        <span>Push: {category.pushEnabledCount.toLocaleString()}</span>
        <span>Email: {category.emailBreakdown.immediate} immed / {category.emailBreakdown.digest} digest / {category.emailBreakdown.never} never</span>
      </div>
    </div>
  );
});

/**
 * Digest Frequency Breakdown - Daily vs Weekly distribution
 * @phase Phase 7 - Preferences Analytics Panel
 */
const DigestFrequencyBreakdown = memo(function DigestFrequencyBreakdown({
  digest
}: {
  digest: PreferencesAnalyticsResponse['digest'];
}) {
  const total = digest.frequencyBreakdown.daily + digest.frequencyBreakdown.weekly;
  const dailyPct = total > 0 ? (digest.frequencyBreakdown.daily / total) * 100 : 0;
  const weeklyPct = total > 0 ? (digest.frequencyBreakdown.weekly / total) * 100 : 0;

  return (
    <div>
      <h4 className="font-medium text-gray-800 mb-3">Digest Frequency Distribution</h4>
      <div className="grid grid-cols-2 gap-4">
        {/* Daily */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800">Daily Digest</span>
            <span className="text-lg font-bold text-blue-700">{dailyPct.toFixed(0)}%</span>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {digest.frequencyBreakdown.daily.toLocaleString()} users
          </div>
        </div>

        {/* Weekly */}
        <div className="p-3 bg-indigo-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-indigo-800">Weekly Digest</span>
            <span className="text-lg font-bold text-indigo-700">{weeklyPct.toFixed(0)}%</span>
          </div>
          <div className="text-xs text-indigo-600 mt-1">
            {digest.frequencyBreakdown.weekly.toLocaleString()} users
          </div>
        </div>
      </div>

      {/* Common times */}
      {digest.commonDigestTimes.length > 0 && (
        <div className="mt-3 text-sm text-gray-600">
          <span className="font-medium">Popular send times:</span>{' '}
          {digest.commonDigestTimes.map((t, i) => (
            <span key={t.time}>
              {t.time} ({t.count})
              {i < digest.commonDigestTimes.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// PHASE 8 COMPONENTS - ADMINISTRATIVE ACTIONS PANEL
// ============================================================================

/**
 * Administrative Actions Panel - System control actions
 * @phase Phase 8 - Administrative Actions Panel
 */
const ActionsPanel = memo(function ActionsPanel({
  configData,
  loading,
  onPauseChannel,
  onResumeChannel,
  onCleanTokens,
  onProcessDigests,
  onPurgeNotifications,
  onTestNotification,
  actionLoading
}: {
  configData: AdminConfigResponse | null;
  loading: boolean;
  onPauseChannel: (channel: AdminChannel) => Promise<void>;
  onResumeChannel: (channel: AdminChannel) => Promise<void>;
  onCleanTokens: (dryRun: boolean) => Promise<void>;
  onProcessDigests: (frequency: 'daily' | 'weekly' | 'all') => Promise<void>;
  onPurgeNotifications: (minAgeDays: number, dryRun: boolean) => Promise<void>;
  onTestNotification: (channel: AdminChannel) => Promise<void>;
  actionLoading: string | null;
}) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const [tokenCleanupDays, setTokenCleanupDays] = useState(30);
  const [purgeAgeDays, setPurgeAgeDays] = useState(90);

  if (loading || !configData) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-medium mb-4">Administrative Actions</h3>
        <div className="text-center py-8 text-gray-500">
          {loading ? 'Loading configuration...' : 'Configuration unavailable'}
        </div>
      </div>
    );
  }

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: () => {} });
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Administrative Actions</h3>
        <div className="text-sm text-gray-500">
          Last config update: {new Date(configData.updatedAt).toLocaleString()}
        </div>
      </div>

      <div className="space-y-6">
        {/* Channel Control Section */}
        <ChannelControlSection
          channelStatus={configData.channelStatus}
          onPause={onPauseChannel}
          onResume={onResumeChannel}
          actionLoading={actionLoading}
          setConfirmDialog={setConfirmDialog}
        />

        {/* Quick Actions Section */}
        <QuickActionsSection
          onProcessDigests={onProcessDigests}
          onTestNotification={onTestNotification}
          actionLoading={actionLoading}
        />

        {/* Cleanup Actions Section */}
        <CleanupActionsSection
          configData={configData}
          tokenCleanupDays={tokenCleanupDays}
          setTokenCleanupDays={setTokenCleanupDays}
          purgeAgeDays={purgeAgeDays}
          setPurgeAgeDays={setPurgeAgeDays}
          onCleanTokens={onCleanTokens}
          onPurgeNotifications={onPurgeNotifications}
          actionLoading={actionLoading}
          setConfirmDialog={setConfirmDialog}
        />
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.open && (
        <BizModal
          isOpen={confirmDialog.open}
          onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
          title={confirmDialog.title}
        >
          <div className="space-y-4">
            <p className="text-gray-700">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded text-white ${
                  confirmDialog.destructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </BizModal>
      )}
    </div>
  );
});

/**
 * Channel Control Section - Pause/Resume buttons
 * @phase Phase 8 - Administrative Actions Panel
 */
const ChannelControlSection = memo(function ChannelControlSection({
  channelStatus,
  onPause,
  onResume,
  actionLoading,
  setConfirmDialog
}: {
  channelStatus: Record<AdminChannel, ChannelStatus>;
  onPause: (channel: AdminChannel) => Promise<void>;
  onResume: (channel: AdminChannel) => Promise<void>;
  actionLoading: string | null;
  setConfirmDialog: (dialog: { open: boolean; title: string; message: string; onConfirm: () => void; destructive?: boolean }) => void;
}) {
  const channels: { key: AdminChannel; label: string; Icon: LucideIcon }[] = [
    { key: 'inApp', label: 'In-App', Icon: Smartphone },
    { key: 'push', label: 'Push (FCM)', Icon: Bell },
    { key: 'email', label: 'Email', Icon: Mail }
  ];

  const handleToggle = (channel: AdminChannel, currentStatus: ChannelStatus) => {
    const action = currentStatus === 'active' ? 'pause' : 'resume';
    const isDestructive = action === 'pause';

    setConfirmDialog({
      open: true,
      title: `${action === 'pause' ? 'Pause' : 'Resume'} ${channel} Channel`,
      message: action === 'pause'
        ? `Are you sure you want to pause the ${channel} channel? No ${channel} notifications will be sent while paused.`
        : `Resume the ${channel} channel? Notifications will begin sending again.`,
      onConfirm: () => action === 'pause' ? onPause(channel) : onResume(channel),
      destructive: isDestructive
    });
  };

  return (
    <div className="border-b pb-4">
      <h4 className="font-medium text-gray-800 mb-3">Channel Control</h4>
      <div className="grid grid-cols-3 gap-4">
        {channels.map(({ key, label, Icon }) => {
          const status = channelStatus[key] || 'active';
          const isActive = status === 'active';
          const isLoading = actionLoading === `channel-${key}`;

          return (
            <div
              key={key}
              className={`p-4 rounded-lg border ${
                isActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-gray-600" />
                <span className={`text-sm font-medium ${
                  isActive ? 'text-green-700' : 'text-amber-700'
                }`}>
                  {isActive ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-800 mb-2">{label}</div>
              <button
                onClick={() => handleToggle(key, status)}
                disabled={isLoading}
                className={`w-full px-3 py-1.5 text-sm rounded transition-colors ${
                  isActive
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Processing...' : isActive ? 'Pause' : 'Resume'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Quick Actions Section - Process digests, test notification
 * @phase Phase 8 - Administrative Actions Panel
 */
const QuickActionsSection = memo(function QuickActionsSection({
  onProcessDigests,
  onTestNotification,
  actionLoading
}: {
  onProcessDigests: (frequency: 'daily' | 'weekly' | 'all') => Promise<void>;
  onTestNotification: (channel: AdminChannel) => Promise<void>;
  actionLoading: string | null;
}) {
  return (
    <div className="border-b pb-4">
      <h4 className="font-medium text-gray-800 mb-3">Quick Actions</h4>
      <div className="grid grid-cols-2 gap-4">
        {/* Process Digests */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-2">Process Email Digests</div>
          <div className="flex gap-2">
            <button
              onClick={() => onProcessDigests('daily')}
              disabled={actionLoading === 'digest-daily'}
              className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'digest-daily' ? '...' : 'Daily'}
            </button>
            <button
              onClick={() => onProcessDigests('weekly')}
              disabled={actionLoading === 'digest-weekly'}
              className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'digest-weekly' ? '...' : 'Weekly'}
            </button>
            <button
              onClick={() => onProcessDigests('all')}
              disabled={actionLoading === 'digest-all'}
              className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'digest-all' ? '...' : 'All'}
            </button>
          </div>
        </div>

        {/* Test Notification */}
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-sm font-medium text-purple-800 mb-2">Send Test Notification</div>
          <div className="flex gap-2">
            <button
              onClick={() => onTestNotification('inApp')}
              disabled={actionLoading === 'test-inApp'}
              className="flex-1 px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'test-inApp' ? '...' : 'In-App'}
            </button>
            <button
              onClick={() => onTestNotification('push')}
              disabled={actionLoading === 'test-push'}
              className="flex-1 px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'test-push' ? '...' : 'Push'}
            </button>
            <button
              onClick={() => onTestNotification('email')}
              disabled={actionLoading === 'test-email'}
              className="flex-1 px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'test-email' ? '...' : 'Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Cleanup Actions Section - Token cleanup, notification purge
 * @phase Phase 8 - Administrative Actions Panel
 */
const CleanupActionsSection = memo(function CleanupActionsSection({
  configData,
  tokenCleanupDays,
  setTokenCleanupDays,
  purgeAgeDays,
  setPurgeAgeDays,
  onCleanTokens,
  onPurgeNotifications,
  actionLoading,
  setConfirmDialog
}: {
  configData: AdminConfigResponse;
  tokenCleanupDays: number;
  setTokenCleanupDays: (days: number) => void;
  purgeAgeDays: number;
  setPurgeAgeDays: (days: number) => void;
  onCleanTokens: (dryRun: boolean) => Promise<void>;
  onPurgeNotifications: (minAgeDays: number, dryRun: boolean) => Promise<void>;
  actionLoading: string | null;
  setConfirmDialog: (dialog: { open: boolean; title: string; message: string; onConfirm: () => void; destructive?: boolean }) => void;
}) {
  const handleCleanTokens = (dryRun: boolean) => {
    if (!dryRun) {
      setConfirmDialog({
        open: true,
        title: 'Clean Inactive Tokens',
        message: `This will deactivate push tokens that haven't been used in ${tokenCleanupDays}+ days. This action cannot be undone. Continue?`,
        onConfirm: () => onCleanTokens(false),
        destructive: true
      });
    } else {
      onCleanTokens(true);
    }
  };

  const handlePurgeNotifications = (dryRun: boolean) => {
    if (!dryRun) {
      setConfirmDialog({
        open: true,
        title: 'Purge Old Notifications',
        message: `This will permanently delete notifications older than ${purgeAgeDays} days. This action cannot be undone. Continue?`,
        onConfirm: () => onPurgeNotifications(purgeAgeDays, false),
        destructive: true
      });
    } else {
      onPurgeNotifications(purgeAgeDays, true);
    }
  };

  return (
    <div>
      <h4 className="font-medium text-gray-800 mb-3">Cleanup Actions</h4>
      <div className="grid grid-cols-2 gap-4">
        {/* Token Cleanup */}
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="text-sm font-medium text-orange-800 mb-2">Clean Inactive Tokens</div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-600">Inactive for</label>
            <select
              value={tokenCleanupDays}
              onChange={(e) => setTokenCleanupDays(Number(e.target.value))}
              className="text-xs border rounded px-2 py-1"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          {configData.lastCleanup.tokens && (
            <div className="text-xs text-gray-500 mb-2">
              Last: {new Date(configData.lastCleanup.tokens).toLocaleDateString()}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleCleanTokens(true)}
              disabled={actionLoading === 'tokens-preview'}
              className="flex-1 px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'tokens-preview' ? '...' : 'Preview'}
            </button>
            <button
              onClick={() => handleCleanTokens(false)}
              disabled={actionLoading === 'tokens-clean'}
              className="flex-1 px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'tokens-clean' ? '...' : 'Clean'}
            </button>
          </div>
        </div>

        {/* Notification Purge */}
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-sm font-medium text-red-800 mb-2">Purge Old Notifications</div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-600">Older than</label>
            <select
              value={purgeAgeDays}
              onChange={(e) => setPurgeAgeDays(Number(e.target.value))}
              className="text-xs border rounded px-2 py-1"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
          {configData.lastCleanup.notifications && (
            <div className="text-xs text-gray-500 mb-2">
              Last: {new Date(configData.lastCleanup.notifications).toLocaleDateString()}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handlePurgeNotifications(true)}
              disabled={actionLoading === 'purge-preview'}
              className="flex-1 px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'purge-preview' ? '...' : 'Preview'}
            </button>
            <button
              onClick={() => handlePurgeNotifications(false)}
              disabled={actionLoading === 'purge-delete'}
              className="flex-1 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
            >
              {actionLoading === 'purge-delete' ? '...' : 'Purge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function NotificationManagerPageContent() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<NotificationHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [metricsData, setMetricsData] = useState<NotificationMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [digestData, setDigestData] = useState<DigestQueueResponse | null>(null);
  const [staleData, setStaleData] = useState<StaleNotificationsResponse | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueProcessing, setQueueProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [guidesData, setGuidesData] = useState<SetupGuidesResponse | null>(null);
  const [guidesLoading, setGuidesLoading] = useState(true);
  const [testingPush, setTestingPush] = useState(false);
  const [testPushMessage, setTestPushMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Phase 7 state - Preferences Analytics
  const [prefsAnalyticsData, setPrefsAnalyticsData] = useState<PreferencesAnalyticsResponse | null>(null);
  const [prefsAnalyticsLoading, setPrefsAnalyticsLoading] = useState(true);

  // Phase 8 state - Administrative Actions
  const [adminConfig, setAdminConfig] = useState<AdminConfigResponse | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch health data
  const fetchHealthData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications/health', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setHealthData(result.data);
        setLastRefreshTime(new Date().toLocaleTimeString());
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to fetch health data');
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Health fetch failed:', err);
      setError('Failed to connect to notification service');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch metrics data (silent refresh - no loading flash)
  const fetchMetricsData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications/metrics?hours=1', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setMetricsData(result.data);
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Metrics fetch failed:', err);
      // Don't set error - metrics are supplementary
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Fetch queue data (silent refresh - no loading flash)
  const fetchQueueData = useCallback(async () => {
    try {
      // Fetch both queue endpoints in parallel
      const [digestRes, staleRes] = await Promise.all([
        fetch('/api/admin/notifications/queue/digest?pageSize=10', { credentials: 'include' }),
        fetch('/api/admin/notifications/queue/stale?pageSize=10&minAgeDays=30', { credentials: 'include' })
      ]);

      const [digestResult, staleResult] = await Promise.all([
        digestRes.json(),
        staleRes.json()
      ]);

      if (digestResult.success && digestResult.data) {
        setDigestData(digestResult.data);
      }
      if (staleResult.success && staleResult.data) {
        setStaleData(staleResult.data);
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Queue fetch failed:', err);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  // Handle process digests action
  const handleProcessDigests = useCallback(async (frequency: string, dryRun: boolean) => {
    try {
      setQueueProcessing(true);
      setActionMessage(null);

      const response = await fetch('/api/admin/notifications/queue/digest/process', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, dryRun })
      });
      const result = await response.json();

      if (result.success && result.data) {
        setActionMessage({
          type: 'success',
          text: result.data.message
        });
        // Refresh queue data after processing
        if (!dryRun) {
          fetchQueueData();
          fetchHealthData(); // Also refresh health for queue counts
        }
      } else {
        setActionMessage({
          type: 'error',
          text: result.error?.message || 'Failed to process digests'
        });
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Process digests failed:', err);
      setActionMessage({
        type: 'error',
        text: 'Failed to process digests'
      });
    } finally {
      setQueueProcessing(false);
    }
  }, [fetchQueueData, fetchHealthData]);

  // Handle clean stale action
  const handleCleanStale = useCallback(async (minAgeDays: number, dryRun: boolean) => {
    try {
      setQueueProcessing(true);
      setActionMessage(null);

      const response = await fetch('/api/admin/notifications/queue/stale', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minAgeDays, dryRun })
      });
      const result = await response.json();

      if (result.success && result.data) {
        setActionMessage({
          type: dryRun ? 'success' : 'success',
          text: result.data.message
        });
        // Refresh queue data after deletion
        if (!dryRun) {
          fetchQueueData();
        }
      } else {
        setActionMessage({
          type: 'error',
          text: result.error?.message || 'Failed to clean stale notifications'
        });
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Clean stale failed:', err);
      setActionMessage({
        type: 'error',
        text: 'Failed to clean stale notifications'
      });
    } finally {
      setQueueProcessing(false);
    }
  }, [fetchQueueData]);

  // Fetch guides data (Phase 6 - silent refresh)
  const fetchGuidesData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications/firebase/status', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setGuidesData(result.data);
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Guides fetch failed:', err);
    } finally {
      setGuidesLoading(false);
    }
  }, []);

  // Fetch preferences analytics (Phase 7 - silent refresh)
  const fetchPreferencesAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications/analytics/preferences', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setPrefsAnalyticsData(result.data);
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Preferences analytics fetch failed:', err);
    } finally {
      setPrefsAnalyticsLoading(false);
    }
  }, []);

  // Fetch admin config (Phase 8 - silent refresh)
  const fetchAdminConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications/config', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setAdminConfig(result.data);
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Config fetch failed:', err);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Channel control handlers (Phase 8)
  const handlePauseChannel = useCallback(async (channel: AdminChannel) => {
    try {
      setActionLoading(`channel-${channel}`);
      const response = await fetch(`/api/admin/notifications/channel/${channel}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' })
      });
      const result = await response.json();

      if (result.success) {
        setActionMessage({ type: 'success', text: result.data.message });
        fetchAdminConfig();
      } else {
        setActionMessage({ type: 'error', text: result.error?.message || 'Failed to pause channel' });
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Pause channel failed:', err);
      setActionMessage({ type: 'error', text: 'Failed to pause channel' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchAdminConfig]);

  const handleResumeChannel = useCallback(async (channel: AdminChannel) => {
    try {
      setActionLoading(`channel-${channel}`);
      const response = await fetch(`/api/admin/notifications/channel/${channel}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' })
      });
      const result = await response.json();

      if (result.success) {
        setActionMessage({ type: 'success', text: result.data.message });
        fetchAdminConfig();
      } else {
        setActionMessage({ type: 'error', text: result.error?.message || 'Failed to resume channel' });
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Resume channel failed:', err);
      setActionMessage({ type: 'error', text: 'Failed to resume channel' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchAdminConfig]);

  // Token cleanup handler (Phase 8)
  const handleCleanTokens = useCallback(async (dryRun: boolean) => {
    try {
      setActionLoading(dryRun ? 'tokens-preview' : 'tokens-clean');
      const response = await fetch('/api/admin/notifications/cleanup/tokens', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inactiveDays: 30, dryRun })
      });
      const result = await response.json();

      if (result.success) {
        setActionMessage({ type: 'success', text: result.data.message });
        if (!dryRun) fetchAdminConfig();
      } else {
        setActionMessage({ type: 'error', text: result.error?.message || 'Token cleanup failed' });
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Token cleanup failed:', err);
      setActionMessage({ type: 'error', text: 'Token cleanup failed' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchAdminConfig]);

  // Purge notifications handler (Phase 8)
  const handlePurgeNotifications = useCallback(async (minAgeDays: number, dryRun: boolean) => {
    try {
      setActionLoading(dryRun ? 'purge-preview' : 'purge-delete');
      const response = await fetch('/api/admin/notifications/queue/stale', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minAgeDays, dryRun })
      });
      const result = await response.json();

      if (result.success) {
        setActionMessage({ type: 'success', text: result.data.message });
        if (!dryRun) {
          fetchAdminConfig();
          fetchQueueData();
        }
      } else {
        setActionMessage({ type: 'error', text: result.error?.message || 'Purge failed' });
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Purge failed:', err);
      setActionMessage({ type: 'error', text: 'Purge failed' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchAdminConfig, fetchQueueData]);

  // Handle test push (Phase 6)
  const handleTestPush = useCallback(async () => {
    try {
      setTestingPush(true);
      setTestPushMessage(null);

      const response = await fetch('/api/admin/notifications/test/push', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success && result.data) {
        setTestPushMessage({
          type: result.data.success ? 'success' : 'error',
          text: result.data.message
        });
      } else {
        setTestPushMessage({
          type: 'error',
          text: result.error?.message || 'Failed to send test push'
        });
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Test push failed:', err);
      setTestPushMessage({
        type: 'error',
        text: 'Failed to send test push notification'
      });
    } finally {
      setTestingPush(false);
    }
  }, []);

  // Test notification handler (Phase 8) - unified handler for all channels
  const handleTestNotification = useCallback(async (channel: AdminChannel) => {
    try {
      setActionLoading(`test-${channel}`);

      const response = await fetch(`/api/admin/notifications/test/${channel}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success && result.data) {
        setActionMessage({
          type: result.data.success ? 'success' : 'error',
          text: result.data.message
        });
      } else {
        setActionMessage({
          type: 'error',
          text: result.error?.message || `Failed to send test ${channel} notification`
        });
      }
    } catch (err) {
      ErrorService.capture('[NotificationManager] Test notification failed:', err);
      setActionMessage({ type: 'error', text: `Failed to send test ${channel} notification` });
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Process digests wrapper for Phase 8 panel (wraps existing handler)
  const handleProcessDigestsWrapper = useCallback(async (frequency: 'daily' | 'weekly' | 'all') => {
    setActionLoading(`digest-${frequency}`);
    await handleProcessDigests(frequency, false);
    setActionLoading(null);
  }, [handleProcessDigests]);

  // Auto-dismiss actionMessage after 8 seconds
  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => setActionMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  // Effect for initial load and auto-refresh
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchHealthData();
      fetchMetricsData();
      fetchQueueData();
      fetchGuidesData();
      fetchPreferencesAnalytics();
      fetchAdminConfig();

      // Auto-refresh every 15 seconds (except guides, prefs analytics, and config - refresh every 60s)
      const interval = setInterval(() => {
        fetchHealthData();
        fetchMetricsData();
        fetchQueueData();
      }, 15000);

      const guidesInterval = setInterval(() => {
        fetchGuidesData();
        fetchPreferencesAnalytics();
        fetchAdminConfig();
      }, 60000);

      return () => {
        clearInterval(interval);
        clearInterval(guidesInterval);
      };
    }
  }, [user, fetchHealthData, fetchMetricsData, fetchQueueData, fetchGuidesData, fetchPreferencesAnalytics, fetchAdminConfig]);

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

  const handleManualRefresh = () => {
    setLoading(true);
    fetchHealthData();
  };

  if (loading && !healthData) {
    return (
      <div className="text-center py-12">Loading notification health data...</div>
    );
  }

  if (error && !healthData) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={handleManualRefresh}
          className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="text-center py-12 text-red-600">Failed to load notification health data</div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Notification Manager</h1>
            <p className="text-gray-600">Real-time notification service monitoring and management</p>
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

        {/* Error message if refresh failed but we have cached data */}
        {error && (
          <div className="mt-4 p-3 rounded bg-yellow-50 text-yellow-700">
            Warning: {error} (showing cached data)
          </div>
        )}

        {/* Action message display */}
        {actionMessage && (
          <div className={`mt-4 p-3 rounded flex items-center gap-2 ${
            actionMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {actionMessage.type === 'success'
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <XCircle className="w-4 h-4 flex-shrink-0" />
            }
            <span className="flex-1">{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="ml-2 text-sm underline hover:no-underline flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Test push message display (Phase 6) */}
        {testPushMessage && (
          <div className={`mt-4 p-3 rounded ${
            testPushMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {testPushMessage.text}
            <button
              onClick={() => setTestPushMessage(null)}
              className="ml-2 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Dashboard Panels */}
      <div className="space-y-6">
        {/* Overview + Active Alerts - Shared Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OverviewStatusPanel data={healthData} />
          <ActiveAlertsPanel alerts={healthData.activeAlerts} />
        </div>

        {/* Channel Status - Full Width */}
        <ChannelStatusPanel data={healthData} />

        {/* Delivery Metrics / Troubleshooting / Setup Guides + Preferences Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <DeliveryMetricsPanel
              metricsData={metricsData}
              loading={metricsLoading}
            />
            <TroubleshootingPanel />
            <SetupGuidesPanel
              guidesData={guidesData}
              loading={guidesLoading}
              onTestPush={handleTestPush}
              testingPush={testingPush}
            />
          </div>
          <PreferencesAnalyticsPanel
            analyticsData={prefsAnalyticsData}
            loading={prefsAnalyticsLoading}
          />
        </div>

        {/* Queue Management + Administrative Actions - Shared Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QueueManagementPanel
            digestData={digestData}
            staleData={staleData}
            loading={queueLoading}
            onProcessDigests={handleProcessDigests}
            onCleanStale={handleCleanStale}
            processing={queueProcessing}
          />
          <ActionsPanel
            configData={adminConfig}
            loading={configLoading}
            onPauseChannel={handlePauseChannel}
            onResumeChannel={handleResumeChannel}
            onCleanTokens={handleCleanTokens}
            onProcessDigests={handleProcessDigestsWrapper}
            onPurgeNotifications={handlePurgeNotifications}
            onTestNotification={handleTestNotification}
            actionLoading={actionLoading}
          />
        </div>
      </div>
    </>
  );
}

/**
 * NotificationManagerPage - Error boundary wrapper
 * @phase Phase 1 - Notification Admin Foundation
 */
export default function NotificationManagerPage() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="Notification Manager Error"
          message="Unable to load notification manager dashboard. Please try again."
        />
      }
      isolate={true}
      componentName="NotificationManagerPage"
    >
      <NotificationManagerPageContent />
    </ErrorBoundary>
  );
}
