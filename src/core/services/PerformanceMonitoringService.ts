/**
 * PerformanceMonitoringService - Application Performance Monitoring (APM)
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - In-memory caching for performance stats
 * - Circuit breaker pattern (metric logging doesn't fail requests)
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority PHASE_6.2_BRAIN_PLAN.md - Performance Monitoring Implementation
 * @phase Phase 6.2 - Performance & Monitoring
 * @complexity ADVANCED tier (~600 lines, ≤6 dependencies, circuit breaker pattern)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { DbResult } from '@core/types/db';
import { PerformanceMetricRow } from '@core/types/db-rows';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TypeScript Interfaces & Enums
// ============================================================================

export enum MetricType {
  API_RESPONSE = 'api_response',
  DB_QUERY = 'db_query',
  MEMORY = 'memory',
  CPU = 'cpu'
}

export enum PerformanceEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

export interface PerformanceMetric {
  id: number;
  metric_type: MetricType;
  metric_name: string;
  value: number;
  status_code: number | null;
  user_id: number | null;
  metadata: Record<string, unknown> | null;
  environment: PerformanceEnvironment;
  created_at: Date;
}

export interface TrackApiResponseData {
  endpoint: string;
  duration: number;  // milliseconds
  statusCode: number;
  userId?: number;
  metadata?: Record<string, unknown>;
}

export interface TrackDbQueryData {
  queryType: string;  // 'SELECT_categories', 'INSERT_review'
  duration: number;  // milliseconds
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  avgResponseTime: number;
  p95ResponseTime: number;  // 95th percentile
  p99ResponseTime: number;  // 99th percentile
  totalRequests: number;
  errorRate: number;  // percentage
  slowestEndpoints: Array<{
    endpoint: string;
    avgTime: number;
    count: number;
  }>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

// ============================================================================
// Service Class
// ============================================================================

export class PerformanceMonitoringService {
  private db: DatabaseService;
  private statsCache: Map<string, { stats: PerformanceStats; timestamp: number }>;
  private readonly CACHE_TTL = 60000;  // 1 minute cache

  constructor(db: DatabaseService) {
    this.db = db;
    this.statsCache = new Map();
  }

  // ==========================================================================
  // TRACKING METHODS (Fire-and-forget for performance)
  // ==========================================================================

  /**
   * Track API response time
   *
   * @param data - API response tracking data
   * @returns Promise<void> - Fire-and-forget, swallows errors to not impact request
   *
   * @example
   * ```typescript
   * await performanceService.trackApiResponse({
   *   endpoint: 'GET /api/listings',
   *   duration: 45.23,
   *   statusCode: 200,
   *   userId: 123
   * });
   * ```
   */
  async trackApiResponse(data: TrackApiResponseData): Promise<void> {
    try {
      const environment = this.getCurrentEnvironment();

      await this.db.query(
        `INSERT INTO performance_metrics (
          metric_type, metric_name, value, status_code, user_id, metadata, environment
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          MetricType.API_RESPONSE,
          data.endpoint,
          data.duration,
          data.statusCode,
          data.userId || null,
          data.metadata ? JSON.stringify(data.metadata) : null,
          environment
        ]
      );

      // Clear stats cache to force refresh
      this.statsCache.clear();

    } catch (error) {
      // CIRCUIT BREAKER: Don't fail the original request if metric logging fails
      ErrorService.capture('[PerformanceMonitoringService] Failed to track API response:', error);
    }
  }

  /**
   * Track database query performance
   *
   * @param data - Database query tracking data
   * @returns Promise<void> - Fire-and-forget
   *
   * @example
   * ```typescript
   * await performanceService.trackDbQuery({
   *   queryType: 'SELECT_categories',
   *   duration: 34.56
   * });
   * ```
   */
  async trackDbQuery(data: TrackDbQueryData): Promise<void> {
    try {
      const environment = this.getCurrentEnvironment();

      await this.db.query(
        `INSERT INTO performance_metrics (
          metric_type, metric_name, value, metadata, environment
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          MetricType.DB_QUERY,
          data.queryType,
          data.duration,
          data.metadata ? JSON.stringify(data.metadata) : null,
          environment
        ]
      );

    } catch (error) {
      ErrorService.capture('[PerformanceMonitoringService] Failed to track DB query:', error);
    }
  }

  /**
   * Track system resource usage (memory, CPU)
   *
   * @param type - 'memory' or 'cpu'
   * @param name - Metric name (e.g., 'heap_used', 'usage_percent')
   * @param value - Value in MB (memory) or % (CPU)
   * @returns Promise<void>
   */
  async trackSystemResource(type: 'memory' | 'cpu', name: string, value: number): Promise<void> {
    try {
      const environment = this.getCurrentEnvironment();
      const metricType = type === 'memory' ? MetricType.MEMORY : MetricType.CPU;

      await this.db.query(
        `INSERT INTO performance_metrics (
          metric_type, metric_name, value, environment
        ) VALUES (?, ?, ?, ?)`,
        [metricType, name, value, environment]
      );

    } catch (error) {
      ErrorService.capture('[PerformanceMonitoringService] Failed to track system resource:', error);
    }
  }

  // ==========================================================================
  // RETRIEVAL METHODS
  // ==========================================================================

  /**
   * Get performance metrics by type and time range
   *
   * @param type - Metric type
   * @param timeRange - Time range to query
   * @returns Promise<PerformanceMetric[]>
   */
  async getMetrics(type: MetricType, timeRange: TimeRange): Promise<PerformanceMetric[]> {
    const result: DbResult<PerformanceMetricRow> = await this.db.query(
      `SELECT * FROM performance_metrics
       WHERE metric_type = ?
       AND created_at >= ?
       AND created_at <= ?
       ORDER BY created_at DESC
       LIMIT 1000`,
      [type, timeRange.start, timeRange.end]
    );

    return result.rows.map(this.mapRowToPerformanceMetric);
  }

  /**
   * Get aggregate statistics for time range (with caching)
   *
   * @param timeRange - Time range to analyze
   * @returns Promise<PerformanceStats>
   */
  async getAggregateStats(timeRange: TimeRange): Promise<PerformanceStats> {
    const cacheKey = `stats_${timeRange.start.toISOString()}_${timeRange.end.toISOString()}`;

    // Check cache
    const cached = this.statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.stats;
    }

    // Calculate aggregate stats
    const stats = await this.calculateStats(timeRange);

    // Update cache
    this.statsCache.set(cacheKey, { stats, timestamp: Date.now() });

    return stats;
  }

  /**
   * Get slowest API endpoints in time range
   *
   * @param limit - Number of endpoints to return
   * @param timeRange - Time range to analyze
   * @returns Promise<Array>
   */
  async getSlowestEndpoints(
    limit: number = 10,
    timeRange: TimeRange
  ): Promise<Array<{ endpoint: string; avgTime: number; count: number }>> {
    const result: DbResult<{endpoint: string; avgTime: number; count: bigint | number}> = await this.db.query(
      `SELECT metric_name as endpoint,
        AVG(value) as avgTime,
        COUNT(*) as count
       FROM performance_metrics
       WHERE metric_type = ?
       AND created_at >= ?
       AND created_at <= ?
       GROUP BY metric_name
       ORDER BY avgTime DESC
       LIMIT ?`,
      [MetricType.API_RESPONSE, timeRange.start, timeRange.end, limit]
    );

    return result.rows.map((row) => ({
      endpoint: row.endpoint,
      avgTime: typeof row.avgTime === 'string' ? parseFloat(row.avgTime) : row.avgTime,
      count: bigIntToNumber(row.count)
    }));
  }

  /**
   * Get error rate for time range
   *
   * @param timeRange - Time range to analyze
   * @returns Promise<number> - Error rate as percentage
   */
  async getErrorRate(timeRange: TimeRange): Promise<number> {
    const result: DbResult<{total: bigint | number; errors: bigint | number}> = await this.db.query(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
       FROM performance_metrics
       WHERE metric_type = ?
       AND created_at >= ?
       AND created_at <= ?`,
      [MetricType.API_RESPONSE, timeRange.start, timeRange.end]
    );

    const row = result.rows[0] as {total: bigint | number; errors: bigint | number} | undefined;
    const total = bigIntToNumber(row?.total);
    const errors = bigIntToNumber(row?.errors);

    if (total === 0) return 0;

    return (errors / total) * 100;
  }

  /**
   * Get memory usage trend
   *
   * @param timeRange - Time range to analyze
   * @returns Promise<Array> - Memory usage data points
   */
  async getMemoryUsageTrend(
    timeRange: TimeRange
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const result: DbResult<{created_at: string; value: number}> = await this.db.query(
      `SELECT created_at, value
       FROM performance_metrics
       WHERE metric_type = ?
       AND metric_name = 'heap_used'
       AND created_at >= ?
       AND created_at <= ?
       ORDER BY created_at ASC`,
      [MetricType.MEMORY, timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
      timestamp: new Date(row.created_at),
      value: typeof row.value === 'string' ? parseFloat(row.value) : row.value
    }));
  }

  /**
   * Clear metrics cache (for testing or manual refresh)
   */
  clearCache(): void {
    this.statsCache.clear();
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async calculateStats(timeRange: TimeRange): Promise<PerformanceStats> {
    // Get all API response metrics in time range
    const result: DbResult<{value: number; status_code: number | null}> = await this.db.query(
      `SELECT value, status_code
       FROM performance_metrics
       WHERE metric_type = ?
       AND created_at >= ?
       AND created_at <= ?`,
      [MetricType.API_RESPONSE, timeRange.start, timeRange.end]
    );

    const values = result.rows.map((row) => typeof row.value === 'string' ? parseFloat(row.value) : row.value).sort((a, b) => a - b);
    const total = values.length;

    if (total === 0) {
      return {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        totalRequests: 0,
        errorRate: 0,
        slowestEndpoints: []
      };
    }

    const avgResponseTime = values.reduce((sum, val) => sum + val, 0) / total;
    const p95Index = Math.floor(total * 0.95);
    const p99Index = Math.floor(total * 0.99);
    const p95ResponseTime = values[p95Index] || 0;
    const p99ResponseTime = values[p99Index] || 0;

    const errorRate = await this.getErrorRate(timeRange);
    const slowestEndpoints = await this.getSlowestEndpoints(10, timeRange);

    return {
      avgResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      totalRequests: total,
      errorRate,
      slowestEndpoints
    };
  }

  private mapRowToPerformanceMetric(row: PerformanceMetricRow): PerformanceMetric {
    return {
      id: row.id,
      metric_type: row.metric_type as MetricType,
      metric_name: row.metric_name,
      value: Number(row.value),
      status_code: row.status_code,
      user_id: row.user_id,
      metadata: safeJsonParse(row.metadata, null),
      environment: row.environment as PerformanceEnvironment,
      created_at: new Date(row.created_at)
    };
  }

  private getCurrentEnvironment(): PerformanceEnvironment {
    const env = (process.env.NODE_ENV || 'development') as string;
    if (env === 'production') return PerformanceEnvironment.PRODUCTION;
    if (env === 'staging') return PerformanceEnvironment.STAGING;
    return PerformanceEnvironment.DEVELOPMENT;
  }
}
