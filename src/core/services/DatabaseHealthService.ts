/**
 * DatabaseHealthService - Centralized Database Health Monitoring
 *
 * Aggregates health metrics from:
 * - ConnectionPoolManager
 * - CacheManager
 * - ServiceRegistry
 * - DatabaseService
 *
 * @authority Build Map v2.1 ENHANCED - STANDARD tier
 * @phase Phase 4 - Database Health Monitoring
 * @tier STANDARD
 */

import { getConnectionPoolManager, PoolStats, PoolMetrics } from './ConnectionPoolManager';
import { getServerConfig } from '@core/config/server.config';
import { getDatabaseConfig } from '@core/config/database.config';
import { getCacheManager, CacheManagerStats } from '@core/cache';
import { getDetailedServiceHealth, ServiceHealthDetail } from './ServiceRegistry';
import { getDatabaseService } from './DatabaseService';
import { getAlertingService } from './ServiceRegistry';
import { AlertType, AlertSeverity } from './AlertingService';
import { getHealthAlertService } from './ServiceRegistry';
import {
  DatabaseHealthResponse,
  DatabaseHealthProbeResponse,
  AlertThresholds,
  AlertLevel,
  MetricWithAlert,
  DEFAULT_ALERT_THRESHOLDS
} from '@core/types/health';
import { bigIntToNumber } from '@core/utils/bigint';
import { ErrorService } from '@core/services/ErrorService';

/**
 * DatabaseHealthService - Monitors database infrastructure health
 *
 * GOVERNANCE: Singleton pattern via getDatabaseHealthService()
 * @tier STANDARD - Health monitoring service
 */
export class DatabaseHealthService {
  private thresholds: AlertThresholds;
  private lastFullCheck: Date | null = null;
  private lastFullCheckResult: DatabaseHealthResponse | null = null;

  constructor(thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS) {
    this.thresholds = thresholds;
    console.log('[DatabaseHealthService] Initialized with alert thresholds');
  }

  /**
   * Get quick probe response (for load balancers)
   * Optimized for < 50ms response time
   */
  async getProbeHealth(): Promise<DatabaseHealthProbeResponse> {
    const startTime = Date.now();

    let databaseHealthy = false;
    let poolHealthy = false;
    let cacheHealthy = false;

    try {
      // Quick database check
      const db = getDatabaseService();
      await db.query('SELECT 1');
      databaseHealthy = true;
    } catch {
      databaseHealthy = false;
    }

    try {
      // Quick pool check
      const poolManager = getConnectionPoolManager();
      poolHealthy = poolManager.isInitialized();
    } catch {
      poolHealthy = false;
    }

    try {
      // Cache is always healthy if running (in-memory)
      const cacheManager = getCacheManager();
      cacheHealthy = cacheManager.health().healthy;
    } catch {
      cacheHealthy = false;
    }

    const allHealthy = databaseHealthy && poolHealthy && cacheHealthy;
    const anyUnhealthy = !databaseHealthy || !poolHealthy || !cacheHealthy;

    return {
      status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: databaseHealthy,
      pool: poolHealthy,
      cache: cacheHealthy,
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Get comprehensive health check with alerts
   * For admin dashboard display
   */
  async getDetailedHealth(): Promise<DatabaseHealthResponse> {
    const startTime = Date.now();
    const activeAlerts: DatabaseHealthResponse['activeAlerts'] = [];

    // 1. Pool health and metrics
    const poolManager = getConnectionPoolManager();
    const poolHealth = await poolManager.healthCheck();
    const poolStats = poolManager.getPoolStats();
    const poolMetrics = poolManager.getPoolMetrics();

    const poolUtilizationAlert = this.evaluateMetric(
      poolStats.utilizationPercent,
      this.thresholds.poolUtilization,
      'above'
    );

    if (poolUtilizationAlert.alertLevel !== 'ok') {
      activeAlerts.push({
        component: 'pool',
        metric: 'utilization',
        level: poolUtilizationAlert.alertLevel,
        message: poolUtilizationAlert.message || `Pool utilization at ${poolStats.utilizationPercent}%`
      });
    }

    // 2. Cache health
    const cacheManager = getCacheManager();
    const cacheStats = cacheManager.getStats();

    const sessionHitRateAlert = this.evaluateMetric(
      cacheStats.sessionCache.hitRate,
      this.thresholds.cacheHitRate,
      'below'
    );

    const userHitRateAlert = this.evaluateMetric(
      cacheStats.userCache.hitRate,
      this.thresholds.cacheHitRate,
      'below'
    );

    if (sessionHitRateAlert.alertLevel !== 'ok') {
      activeAlerts.push({
        component: 'cache',
        metric: 'sessionHitRate',
        level: sessionHitRateAlert.alertLevel,
        message: sessionHitRateAlert.message || `Session cache hit rate at ${cacheStats.sessionCache.hitRate.toFixed(1)}%`
      });
    }

    // 3. Service health
    const serviceHealth = await getDetailedServiceHealth();
    const healthyServices = serviceHealth.filter(s => s.healthy).length;
    const unhealthyServices = serviceHealth.filter(s => !s.healthy);

    for (const service of unhealthyServices) {
      activeAlerts.push({
        component: 'services',
        metric: service.name,
        level: 'critical',
        message: service.lastError || `${service.name} service unhealthy`
      });
    }

    // 4. Database latency
    let dbLatency = 0;
    let dbConnected = false;
    let dbSizeInMB: number | undefined;
    let dbTableCount: number | undefined;

    try {
      const dbStart = Date.now();
      const db = getDatabaseService();
      await db.query('SELECT 1');
      dbLatency = Date.now() - dbStart;
      dbConnected = true;

      // Get database size if possible (cached to reduce query overhead)
      // Only query database size every 5 minutes to reduce memory pressure
      const shouldQueryDbMetadata = !this.lastFullCheck ||
        (Date.now() - this.lastFullCheck.getTime()) > 300000; // 5 minutes

      if (shouldQueryDbMetadata) {
        try {
          const sizeResult = await db.query<{ sizeInMB: number }[]>(
            `SELECT SUM(data_length + index_length) / 1024 / 1024 AS sizeInMB
             FROM information_schema.TABLES
             WHERE table_schema = DATABASE()`,
            []
          );
          if (sizeResult.rows[0]) {
            dbSizeInMB = Number((sizeResult.rows[0] as any).sizeInMB?.toFixed(2)) || 0;
          }

          const tableResult = await db.query<{ tableCount: bigint | number }[]>(
            `SELECT COUNT(*) as tableCount
             FROM information_schema.TABLES
             WHERE table_schema = DATABASE()`,
            []
          );
          if (tableResult.rows[0]) {
            dbTableCount = bigIntToNumber((tableResult.rows[0] as any).tableCount);
          }
        } catch {
          // Size queries failed but connection is still healthy
        }
      } else if (this.lastFullCheckResult) {
        // Reuse cached database metadata
        dbSizeInMB = this.lastFullCheckResult.database.sizeInMB;
        dbTableCount = this.lastFullCheckResult.database.tableCount;
      }
    } catch {
      dbConnected = false;
      activeAlerts.push({
        component: 'database',
        metric: 'connectivity',
        level: 'critical',
        message: 'Database connection failed'
      });
    }

    const latencyAlert = this.evaluateMetric(
      dbLatency,
      this.thresholds.queryLatency,
      'above'
    );

    if (latencyAlert.alertLevel !== 'ok') {
      activeAlerts.push({
        component: 'database',
        metric: 'latency',
        level: latencyAlert.alertLevel,
        message: latencyAlert.message || `Query latency at ${dbLatency}ms`
      });
    }

    // 5. Memory usage - USE RSS AGAINST SERVER LIMIT
    // RSS (Resident Set Size) shows actual memory footprint, not V8 heap ratio
    const memUsage = process.memoryUsage();
    const serverConfig = getServerConfig();

    const rssMB = memUsage.rss / 1024 / 1024;
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const externalMB = memUsage.external / 1024 / 1024;
    const serverLimitMB = serverConfig.memoryLimitMB;

    // Calculate percentage against server limit (not V8 heap)
    const memoryUsagePercent = (rssMB / serverLimitMB) * 100;

    // Use server-level thresholds
    const memoryAlert = this.evaluateMetric(
      memoryUsagePercent,
      {
        warning: serverConfig.memoryWarningPercent,
        critical: serverConfig.memoryCriticalPercent
      },
      'above'
    );

    if (memoryAlert.alertLevel !== 'ok') {
      activeAlerts.push({
        component: 'memory',
        metric: 'usagePercent',
        level: memoryAlert.alertLevel,
        message: memoryAlert.message || `Memory usage at ${memoryUsagePercent.toFixed(1)}%`
      });
    }

    // Determine overall status
    const criticalAlerts = activeAlerts.filter(a => a.level === 'critical').length;
    const warningAlerts = activeAlerts.filter(a => a.level === 'warning').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (criticalAlerts > 0 || !dbConnected) {
      status = 'unhealthy';
    } else if (warningAlerts > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    // Record memory usage for history tracking
    poolManager.recordMemoryUsage(memoryUsagePercent);

    const result: DatabaseHealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,

      pool: {
        stats: poolStats,
        metrics: poolMetrics,
        history: poolManager.getMetricsHistory(),
        queryTypes: poolManager.getQueryTypeCounts(),
        queryTypeHistory: poolManager.getQueryTypeHistory(),
        health: {
          connected: poolHealth.connected,
          initialized: poolHealth.initialized,
          lastSuccessfulQuery: poolHealth.lastSuccessfulQuery?.toISOString() || null
        },
        alerts: {
          utilization: poolUtilizationAlert
        }
      },

      cache: {
        stats: cacheStats,
        alerts: {
          sessionHitRate: sessionHitRateAlert,
          userHitRate: userHitRateAlert
        }
      },

      services: {
        total: serviceHealth.length,
        healthy: healthyServices,
        unhealthy: unhealthyServices.length,
        details: serviceHealth
      },

      database: {
        connected: dbConnected,
        name: getDatabaseConfig().database,
        latency: latencyAlert,
        sizeInMB: dbSizeInMB,
        tableCount: dbTableCount
      },

      memory: {
        rssMB: Number(rssMB.toFixed(2)),
        serverLimitMB,
        heapUsedMB: Number(heapUsedMB.toFixed(2)),
        heapTotalMB: Number(heapTotalMB.toFixed(2)),
        externalMB: Number(externalMB.toFixed(2)),
        usagePercent: memoryAlert
      },

      // Memory history for trend chart
      memoryHistory: poolManager.getMemoryHistory(),

      // Error log for detailed error display
      errorLog: poolManager.getErrorLog(50),

      activeAlerts
    };

    // Cache result
    this.lastFullCheck = new Date();
    this.lastFullCheckResult = result;

    // Manual GC hint after health check (Option C)
    // Helps prevent memory accumulation from service health objects
    if (typeof global.gc === 'function') {
      setImmediate(() => {
        try {
          global.gc?.();
        } catch (e) {
          // GC not available, ignore
        }
      });
    }

    return result;
  }

  /**
   * Create alerts for critical/warning thresholds
   * Optional: Persist alerts to database via AlertingService
   */
  async createAlertsForThresholdViolations(health: DatabaseHealthResponse): Promise<void> {
    if (health.activeAlerts.length === 0) {
      return;
    }

    try {
      const alertingService = getAlertingService();

      for (const alert of health.activeAlerts) {
        if (alert.level === 'critical') {
          await alertingService.createAlert({
            alertType: this.mapComponentToAlertType(alert.component),
            alertName: `${alert.component}.${alert.metric}`,
            severity: AlertSeverity.CRITICAL,
            message: alert.message,
            metadata: {
              component: alert.component,
              metric: alert.metric,
              timestamp: health.timestamp
            }
          });
        }
      }
    } catch (error) {
      ErrorService.capture('[DatabaseHealthService] Failed to create alerts:', error);
    }
  }

  /**
   * Send email alerts for health issues
   * @phase Phase 3 - Service Health Monitoring Enhancement
   */
  async sendHealthAlertEmails(health: DatabaseHealthResponse): Promise<void> {
    if (health.activeAlerts.length === 0) {
      return;
    }

    try {
      const healthAlertService = getHealthAlertService();

      // Check if alerts are enabled first
      const isEnabled = await healthAlertService.isAlertEnabled();
      if (!isEnabled) {
        return;
      }

      // Send alerts for each active alert (filter out 'ok' alerts)
      for (const alert of health.activeAlerts) {
        // Only send for warning or critical alerts
        if (alert.level !== 'warning' && alert.level !== 'critical') {
          continue;
        }

        const alertType = alert.level === 'critical' ? 'unhealthy' : 'degraded';

        await healthAlertService.sendHealthAlert({
          serviceName: `${alert.component}.${alert.metric}`,
          alertType: alertType as 'unhealthy' | 'degraded',
          alertLevel: alert.level as 'warning' | 'critical',
          errorMessage: alert.message,
          errorComponent: alert.component
        });
      }
    } catch (error) {
      ErrorService.capture('[DatabaseHealthService] Failed to send health alert emails:', error);
    }
  }

  /**
   * Get last cached health result (for quick access)
   */
  getLastHealthResult(): DatabaseHealthResponse | null {
    return this.lastFullCheckResult;
  }

  /**
   * Update alert thresholds at runtime
   */
  setThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  // Private helpers

  private evaluateMetric(
    value: number,
    thresholds: { warning: number; critical: number },
    direction: 'above' | 'below'
  ): MetricWithAlert<number> {
    let alertLevel: AlertLevel = 'ok';
    let threshold: number | undefined;
    let message: string | undefined;

    if (direction === 'above') {
      if (value >= thresholds.critical) {
        alertLevel = 'critical';
        threshold = thresholds.critical;
        message = `Value ${value} exceeds critical threshold ${thresholds.critical}`;
      } else if (value >= thresholds.warning) {
        alertLevel = 'warning';
        threshold = thresholds.warning;
        message = `Value ${value} exceeds warning threshold ${thresholds.warning}`;
      }
    } else {
      if (value <= thresholds.critical) {
        alertLevel = 'critical';
        threshold = thresholds.critical;
        message = `Value ${value} below critical threshold ${thresholds.critical}`;
      } else if (value <= thresholds.warning) {
        alertLevel = 'warning';
        threshold = thresholds.warning;
        message = `Value ${value} below warning threshold ${thresholds.warning}`;
      }
    }

    return { value, alertLevel, threshold, message };
  }

  private mapComponentToAlertType(component: string): AlertType {
    switch (component) {
      case 'database':
      case 'pool':
        return AlertType.RESPONSE_TIME;
      case 'memory':
        return AlertType.MEMORY_USAGE;
      case 'cache':
      case 'services':
      default:
        return AlertType.ERROR_RATE;
    }
  }
}

// Singleton instance
let databaseHealthServiceInstance: DatabaseHealthService | null = null;

/**
 * Get DatabaseHealthService singleton
 * GOVERNANCE: Primary access point for health monitoring
 */
export function getDatabaseHealthService(): DatabaseHealthService {
  if (!databaseHealthServiceInstance) {
    databaseHealthServiceInstance = new DatabaseHealthService();
  }
  return databaseHealthServiceInstance;
}

/**
 * Reset singleton (for testing)
 */
export function resetDatabaseHealthService(): void {
  databaseHealthServiceInstance = null;
}
