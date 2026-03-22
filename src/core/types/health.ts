/**
 * Database Health Monitoring Types
 *
 * @phase Phase 4 - Database Health Monitoring
 * @authority Build Map v2.1 ENHANCED
 */

import {
  PoolStats,
  PoolMetrics,
  MetricsHistoryPoint,
  QueryTypeCounters,
  QueryTypeHistoryPoint,
  ErrorLogEntry,
  MemoryHistoryPoint
} from '@core/services/ConnectionPoolManager';
import { CacheManagerStats } from '@core/cache';

/**
 * Service health detail from ServiceRegistry
 * Re-exported for convenience
 */
export interface ServiceHealthDetail {
  name: string;
  initialized: boolean;
  healthy: boolean;
  lastError?: string;
}

/**
 * Alert threshold configuration
 */
export interface AlertThresholds {
  poolUtilization: {
    warning: number;   // Default: 70
    critical: number;  // Default: 90
  };
  cacheHitRate: {
    warning: number;   // Default: 30 (below this)
    critical: number;  // Default: 10 (below this)
  };
  queryLatency: {
    warning: number;   // Default: 200ms
    critical: number;  // Default: 500ms
  };
  memoryUsage: {
    warning: number;   // Default: 70% of heap
    critical: number;  // Default: 90% of heap
  };
}

/**
 * Alert status for a metric
 */
export type AlertLevel = 'ok' | 'warning' | 'critical';

/**
 * Individual metric with alert evaluation
 */
export interface MetricWithAlert<T> {
  value: T;
  alertLevel: AlertLevel;
  threshold?: number;
  message?: string;
}

/**
 * Database health response structure
 */
export interface DatabaseHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  responseTime: number;

  // Pool metrics with alerts
  pool: {
    stats: PoolStats;
    metrics: PoolMetrics;  // Cumulative/rolling metrics for operational monitoring
    history: MetricsHistoryPoint[];  // Historical data for charts (5 min, 60 points)
    queryTypes: QueryTypeCounters;  // Query type breakdown (SELECT/INSERT/etc)
    queryTypeHistory: QueryTypeHistoryPoint[];  // Historical query type data
    health: {
      connected: boolean;
      initialized: boolean;
      lastSuccessfulQuery: string | null;
    };
    alerts: {
      utilization: MetricWithAlert<number>;
    };
  };

  // Cache metrics with alerts
  cache: {
    stats: CacheManagerStats;
    alerts: {
      sessionHitRate: MetricWithAlert<number>;
      userHitRate: MetricWithAlert<number>;
    };
  };

  // Service health summary
  services: {
    total: number;
    healthy: number;
    unhealthy: number;
    details: ServiceHealthDetail[];
  };

  // Database performance
  database: {
    connected: boolean;
    name?: string;  // Database name from config
    latency: MetricWithAlert<number>;
    sizeInMB?: number;
    tableCount?: number;
  };

  // Memory metrics - RSS against server limit
  memory: {
    rssMB: number;           // Resident Set Size (actual memory footprint)
    serverLimitMB: number;   // Server capacity (configurable)
    heapUsedMB: number;      // V8 heap used (for detail breakdown)
    heapTotalMB: number;     // V8 heap total
    externalMB: number;      // Native objects/buffers
    usagePercent: MetricWithAlert<number>;  // rssMB / serverLimitMB
  };

  // Memory history for trend chart
  memoryHistory: MemoryHistoryPoint[];

  // Error log for detailed error display
  errorLog: ErrorLogEntry[];

  // Active alerts
  activeAlerts: Array<{
    component: string;
    metric: string;
    level: AlertLevel;
    message: string;
  }>;
}

/**
 * Simplified probe response (for load balancers)
 */
export interface DatabaseHealthProbeResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  database: boolean;
  pool: boolean;
  cache: boolean;
  responseTime: number;
}

/**
 * Default alert thresholds
 */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  poolUtilization: {
    warning: 70,
    critical: 90
  },
  cacheHitRate: {
    warning: 30,
    critical: 10
  },
  queryLatency: {
    warning: 200,
    critical: 500
  },
  memoryUsage: {
    warning: 70,
    critical: 90
  }
};
